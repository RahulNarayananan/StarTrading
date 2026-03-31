"""
database.py — SQLite persistence layer for the Bloomberg-style card tracker.

Tables
------
tracked_cards   : the 10 (or more) cards being monitored
sold_listings   : every unique eBay sold listing ever scraped (deduped by URL)
price_snapshots : per-run summary stats (avg, min, max, count) for trend analysis
population_data : PSA/CGC population counts (refreshed weekly)
"""

import math
import sqlite3
import aiosqlite
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "tracker.db"


# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS tracked_cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    query       TEXT NOT NULL UNIQUE,
    is_active   INTEGER NOT NULL DEFAULT 1,
    tcgplayer_price REAL,
    image_url   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sold_listings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id     INTEGER NOT NULL REFERENCES tracked_cards(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    price       REAL,
    price_str   TEXT,
    currency    TEXT DEFAULT 'USD',
    sold_date   TEXT,
    sold_date_iso TEXT,
    link        TEXT NOT NULL UNIQUE,
    image_url   TEXT,
    grader      TEXT,
    grade       TEXT,
    scraped_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id     INTEGER NOT NULL REFERENCES tracked_cards(id) ON DELETE CASCADE,
    run_at      TEXT NOT NULL DEFAULT (datetime('now')),
    count       INTEGER,
    price_min   REAL,
    price_max   REAL,
    price_avg   REAL,
    price_std   REAL
);

CREATE TABLE IF NOT EXISTS population_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id     INTEGER NOT NULL REFERENCES tracked_cards(id) ON DELETE CASCADE,
    grader      TEXT,
    grade       TEXT,
    pop_count   INTEGER,
    fetched_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sold_card   ON sold_listings(card_id);
CREATE INDEX IF NOT EXISTS idx_sold_date   ON sold_listings(sold_date_iso);
CREATE INDEX IF NOT EXISTS idx_snap_card   ON price_snapshots(card_id);
CREATE INDEX IF NOT EXISTS idx_pop_card    ON population_data(card_id);

CREATE TABLE IF NOT EXISTS prediction_markets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         INTEGER NOT NULL REFERENCES tracked_cards(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    resolution_date TEXT NOT NULL,
    is_resolved     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS predictions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id   INTEGER NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL DEFAULT 'Internal',
    direction   TEXT NOT NULL,
    amount      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_card ON prediction_markets(card_id);
CREATE INDEX IF NOT EXISTS idx_predictions_market ON predictions(market_id);
"""


async def init_db():
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        try:
            await db.execute("ALTER TABLE tracked_cards ADD COLUMN tcgplayer_price REAL")
        except sqlite3.OperationalError:
            pass
        try:
            await db.execute("ALTER TABLE tracked_cards ADD COLUMN image_url TEXT")
        except sqlite3.OperationalError:
            pass
        await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Tracked cards CRUD
# ─────────────────────────────────────────────────────────────────────────────

async def upsert_tracked_card(display_name: str, query: str, is_active: int = 1) -> int:
    """Insert card or return existing id if query already tracked."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT id FROM tracked_cards WHERE query = ?", (query,)
        )
        row = await cur.fetchone()
        if row:
            # If it exists, we might want to update its display name or just return id
            return row["id"]
        
        cur = await db.execute(
            "INSERT INTO tracked_cards (display_name, query, is_active) VALUES (?, ?, ?)",
            (display_name, query, is_active),
        )
        await db.commit()
        return cur.lastrowid


async def activate_card(card_id: int):
    """Set is_active back to 1."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE tracked_cards SET is_active = 1 WHERE id = ?", (card_id,)
        )
        await db.commit()


async def get_all_tracked_cards() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM tracked_cards WHERE is_active = 1 ORDER BY id"
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def deactivate_card(card_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE tracked_cards SET is_active = 0 WHERE id = ?", (card_id,)
        )
        await db.commit()


async def get_card_by_id(card_id: int) -> dict | None:
    """Fetch a single card by its ID, regardless of is_active status."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM tracked_cards WHERE id = ?", (card_id,)
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def update_tcgplayer_price(card_id: int, price: float | None):
    """Update the latest TCGPlayer market price for a card."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE tracked_cards SET tcgplayer_price = ? WHERE id = ?", (price, card_id)
        )
        await db.commit()


async def update_card_image(card_id: int, image_url: str):
    """Update the representative image URL for a card."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE tracked_cards SET image_url = ? WHERE id = ?", (image_url, card_id)
        )
        await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Sold listings
# ─────────────────────────────────────────────────────────────────────────────

async def insert_listings_bulk(card_id: int, listings: list[dict]) -> int:
    """
    Insert new sold listings, ignoring duplicates (by link).
    Returns the count of newly inserted rows.
    """
    if not listings:
        return 0
    inserted = 0
    async with aiosqlite.connect(DB_PATH) as db:
        for item in listings:
            try:
                await db.execute(
                    """
                    INSERT OR IGNORE INTO sold_listings
                        (card_id, title, price, price_str, currency,
                         sold_date, sold_date_iso, link, image_url, grader, grade)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        card_id,
                        item.get("title", ""),
                        item.get("price"),
                        item.get("price_str", ""),
                        item.get("price_currency", "USD"),
                        item.get("sold_date"),
                        item.get("sold_date_iso"),
                        item.get("link", ""),
                        item.get("image_url", ""),
                        item.get("grader", ""),
                        item.get("grade", ""),
                    ),
                )
                if db.total_changes > 0:
                    inserted += 1
            except Exception:
                continue
        await db.commit()
    return inserted


async def get_listings_for_card(card_id: int, days: int = 90) -> list[dict]:
    """Return sold listings for a card within the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT * FROM sold_listings
            WHERE card_id = ? AND (sold_date_iso IS NULL OR sold_date_iso >= ?)
            ORDER BY sold_date_iso DESC
            """,
            (card_id, since),
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────────────────────
# Price snapshots
# ─────────────────────────────────────────────────────────────────────────────

async def save_snapshot(card_id: int, items: list[dict]):
    """Compute and persist a stats snapshot for this scraping run."""
    prices = [i["price"] for i in items if i.get("price") is not None]
    if not prices:
        return
    avg  = sum(prices) / len(prices)
    var  = sum((p - avg) ** 2 for p in prices) / len(prices)
    std  = math.sqrt(var)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO price_snapshots (card_id, count, price_min, price_max, price_avg, price_std)
            VALUES (?,?,?,?,?,?)
            """,
            (card_id, len(prices), min(prices), max(prices), round(avg, 2), round(std, 2)),
        )
        await db.commit()


async def get_snapshots(card_id: int, days: int = 90) -> list[dict]:
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT * FROM price_snapshots
            WHERE card_id = ? AND run_at >= ?
            ORDER BY run_at ASC
            """,
            (card_id, since),
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────────────────────
# Population data
# ─────────────────────────────────────────────────────────────────────────────

async def save_population(card_id: int, grader: str, grade: str, pop_count: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO population_data (card_id, grader, grade, pop_count)
            VALUES (?,?,?,?)
            """,
            (card_id, grader, grade, pop_count),
        )
        await db.commit()


async def get_latest_population(card_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT * FROM population_data
            WHERE card_id = ?
            ORDER BY fetched_at DESC LIMIT 1
            """,
            (card_id,),
        )
        row = await cur.fetchone()
        return dict(row) if row else None


# ─────────────────────────────────────────────────────────────────────────────
# Analytics — computed directly from stored listings
# ─────────────────────────────────────────────────────────────────────────────

async def compute_analytics(card_id: int) -> dict:
    """
    Return a full analytics dict for a card:
        last_price, high_24h, low_24h, avg_30d, volatility_30d,
        volume_7d, trend_30d, price_history (list of {date, price})
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        now = datetime.utcnow()
        d30 = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        d7  = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        d1  = (now - timedelta(days=1)).strftime("%Y-%m-%d")

        # All listings with a sold date in last 30 days
        cur = await db.execute(
            """
            SELECT price, sold_date_iso, scraped_at
            FROM sold_listings
            WHERE card_id = ? AND price IS NOT NULL
              AND (sold_date_iso >= ? OR sold_date_iso IS NULL)
            ORDER BY sold_date_iso ASC, scraped_at ASC
            """,
            (card_id, d30),
        )
        rows30 = [dict(r) for r in await cur.fetchall()]

        prices30 = [r["price"] for r in rows30]

        # 24h
        cur = await db.execute(
            "SELECT price FROM sold_listings WHERE card_id=? AND price IS NOT NULL AND sold_date_iso >= ?",
            (card_id, d1),
        )
        prices24 = [r["price"] for r in await cur.fetchall()]

        # 7d volume
        cur = await db.execute(
            "SELECT COUNT(*) as cnt FROM sold_listings WHERE card_id=? AND sold_date_iso >= ?",
            (card_id, d7),
        )
        r = await cur.fetchone()
        volume_7d = r["cnt"] if r else 0

        # Latest listing (most recently scraped)
        cur = await db.execute(
            "SELECT price FROM sold_listings WHERE card_id=? AND price IS NOT NULL ORDER BY scraped_at DESC LIMIT 1",
            (card_id,),
        )
        r = await cur.fetchone()
        last_price = r["price"] if r else None

        # Stats
        avg30   = round(sum(prices30) / len(prices30), 2) if prices30 else last_price
        avg24   = round(sum(prices24) / len(prices24), 2) if prices24 else None
        
        std30   = None
        if len(prices30) >= 2:
            mean = sum(prices30) / len(prices30)
            var  = sum((p - mean) ** 2 for p in prices30) / len(prices30)
            std30 = round(math.sqrt(var), 2)

        # Trend: percentage change from 24h average (or 30d if 24h missing)
        trend = 0.0
        baseline = avg24 if avg24 else avg30
        if last_price and baseline and baseline > 0:
            trend = round(((last_price - baseline) / baseline) * 100, 2)

        # Price history for chart: group by sold_date
        history = {}
        for r in rows30:
            date = r["sold_date_iso"] or r["scraped_at"][:10]
            history.setdefault(date, []).append(r["price"])
        price_history = [
            {"date": d, "price": round(sum(ps) / len(ps), 2)}
            for d, ps in sorted(history.items())
        ]

        return {
            "last_price":     last_price,
            "high_24h":       max(prices24) if prices24 else None,
            "low_24h":        min(prices24) if prices24 else None,
            "avg_24h":        avg24,
            "avg_30d":        avg30,
            "volatility_30d": std30,
            "volume_7d":      volume_7d,
            "trend_30d":      trend,
            "price_history":  price_history,
        }

# ─────────────────────────────────────────────────────────────────────────────
# Prediction Markets
# ─────────────────────────────────────────────────────────────────────────────


async def get_recent_listings(card_id: int, limit: int = 20) -> list[dict]:
    """Fetch the most recent sold listings for LLM context."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT title, price, sold_date_iso 
            FROM sold_listings 
            WHERE card_id = ? AND price IS NOT NULL 
            ORDER BY sold_date_iso DESC, scraped_at DESC 
            LIMIT ?
            """,
            (card_id, limit),
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

async def get_or_create_active_market(card_id: int) -> dict:
    """Gets the currently active market for a card, or creates a default 30-day forecast one."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM prediction_markets WHERE card_id = ? AND is_resolved = 0 ORDER BY id DESC LIMIT 1",
            (card_id,)
        )
        row = await cur.fetchone()
        if row:
            return dict(row)
        
        from datetime import datetime, timedelta
        res_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
        question = "Will this card's price be higher in 30 days?"
        
        cur = await db.execute(
            "INSERT INTO prediction_markets (card_id, question, resolution_date) VALUES (?, ?, ?)",
            (card_id, question, res_date)
        )
        new_market_id = cur.lastrowid
        
        import random
        total_fake = random.randint(80, 250)
        up_pct = random.uniform(0.3, 0.7)
        for i in range(total_fake):
            direction = 'UP' if i < (total_fake * up_pct) else 'DOWN'
            await db.execute(
                "INSERT INTO predictions (market_id, user_id, direction, amount) VALUES (?, ?, ?, ?)",
                (new_market_id, f"sim_{random.randint(1, 9999)}", direction, 1)
            )

        await db.commit()
        
        cur = await db.execute("SELECT * FROM prediction_markets WHERE id = ?", (new_market_id,))
        new_row = await cur.fetchone()
        return dict(new_row)

async def get_market_sentiment(market_id: int) -> dict:
    """Returns total UP and DOWN votes/amounts for a market."""
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "SELECT direction, SUM(amount) as total FROM predictions WHERE market_id = ? GROUP BY direction",
            (market_id,)
        )
        rows = await cur.fetchall()
        
        up_total = 0
        down_total = 0
        for r in rows:
            if r[0] == 'UP':
                up_total = r[1]
            elif r[0] == 'DOWN':
                down_total = r[1]
                
        total = up_total + down_total
        return {
            "up": up_total,
            "down": down_total,
            "total": total,
            "up_percent": round((up_total / total * 100) if total > 0 else 50, 1),
            "down_percent": round((down_total / total * 100) if total > 0 else 50, 1)
        }

async def place_prediction(market_id: int, direction: str, amount: int = 1, user_id: str = "Internal"):
    """Places a vote on a prediction market."""
    if direction not in ['UP', 'DOWN']:
        raise ValueError("Direction must be UP or DOWN")
        
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO predictions (market_id, user_id, direction, amount) VALUES (?, ?, ?, ?)",
            (market_id, user_id, direction, amount)
        )
        await db.commit()
