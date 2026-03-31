"""
tracker.py — Background polling daemon for the Bloomberg card terminal.

Runs every 30 minutes via APScheduler. For each tracked card, launches a
headless Playwright browser, scrapes eBay sold listings, deduplicates by URL,
and writes results to the SQLite database.

Designed to be imported and started by server.py lifespan, so no separate
process is needed.
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import (
    DB_PATH,
    init_db,
    upsert_tracked_card,
    get_all_tracked_cards,
    insert_listings_bulk,
    save_snapshot,
    update_card_image,
    update_tcgplayer_price,
)
from agent import EbayScrapingAgent

logger = logging.getLogger("tracker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# ─────────────────────────────────────────────────────────────────────────────
# The 10 cards to track
# Each entry: (display_name, ebay_search_query)
# Queries use set-code + card name so eBay finds the right JP/CN cards.
# ─────────────────────────────────────────────────────────────────────────────

TRACKED_CARDS = [
    (
        "Pikachu Van Gogh (SVP 085)",
        [
            "Pikachu Grey Felt Hat Van Gogh SVP 085 PSA 10",
            "Pikachu Van Gogh Promo 085 PSA 10",
            "Pikachu Van Gogh PSA 10"
        ],
        22872, # SV: Scarlet & Violet Promo Cards
        518861 # Pikachu with Grey Felt Hat
    ),
    (
        "Umbreon VMAX HR (S6a 095/069)",
        ["Umbreon VMAX S6a 095/069 Eevee Heroes PSA 10"],
        2840,
        246723 
    ),
    (
        "Psyduck Munch Exhibition (SM-P 286)",
        ["Psyduck Munch SM-P 286 PSA 10"],
        None, None
    ),
    (
        "Rayquaza VMAX HR (S7R 083/067)",
        ["Rayquaza VMAX S7R 083 Blue Sky Stream PSA 10"],
        2840,
        246733
    ),
    (
        "Pikachu 25th Anniversary PROMO (S8a-P 007)",
        ["Pikachu 25th Anniversary S8a 007 Promo PSA 10"],
        2931,
        250320
    ),
    (
        "Charizard ex SAR (SV2a 201/165)",
        ["Charizard ex SV2a 201 Pokemon Card 151 PSA 10"],
        3324,
        516954
    ),
    (
        "Pikachu Munch Exhibition (SM-P 288)",
        [
            "Pikachu Munch SM-P 288 PSA 10",
            "Pikachu Munch Promo 288 PSA 10",
            "Pikachu Scream Promo PSA 10"
        ],
        None, None
    ),
    (
        "Pikachu 5th Anniversary (SV-P 153)",
        [
            "Pikachu 153/SV-P PSA 10",
            "Pikachu 5th Anniversary 153 PSA 10",
            "Pikachu 153 SV-P PSA 10"
        ],
        0, 0
    ),
    (
        "Pikachu AR 151C (170/151)",
        ["Pikachu 151C 170 151 Scarlet Violet Chinese PSA 10"],
        3324,
        516955
    ),
    (
        "Pikachu McDonald's 2025 (M-P 020)",
        [
            "Pikachu M-P 020 McDonalds Happy Set 2025 PSA 10",
            "Pikachu McDonalds Promo 020 PSA 10",
            "Pikachu McDonald's Japanese Promo PSA 10"
        ],
        None, None
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Core scrape logic for a single card
# ─────────────────────────────────────────────────────────────────────────────

async def scrape_card(card_id: int, display_name: str, query_joined: str) -> int:
    """
    Scrape eBay sold listings for one card, trying fallback queries if the first returns 0.
    """
    logger.info(f"[{display_name}] Starting scrape — searching queries: '{query_joined}'")
    agent = EbayScrapingAgent(headless=True)
    queries = [q.strip() for q in query_joined.split('|') if q.strip()]
    
    try:
        await agent.start()
        all_items = []

        for q in queries:
            logger.info(f"[{display_name}] Trying query: '{q}'")
            items = await agent.search(q, page_num=1)
            total_pages = await agent.get_total_pages()
            
            if len(items) == 0:
                logger.warning(f"[{display_name}] 0 results for '{q}', trying fallback if any.")
                continue

            all_items.extend(items)
            
            if total_pages > 1:
                for page in range(2, min(total_pages + 1, 6)):  # cap at 5 pages per run
                    try:
                        page_items = await agent.search(q, page_num=page)
                        all_items.extend(page_items)
                        await asyncio.sleep(1.5)
                    except Exception as e:
                        logger.warning(f"[{display_name}] Page {page} failed: {e}")
                        break
                        
            # If we found items matching this query, we stop checking fallbacks!
            if len(all_items) > 0:
                logger.info(f"[{display_name}] Success finding {len(all_items)} baseline items using '{q}'")
                break

        if len(all_items) == 0:
            logger.warning(f"[{display_name}] All fallback queries exhausted. 0 results total.")
            return 0

        # Flatten details from each item
        flattened = []
        for item in all_items:
            d = item.get("details", {})
            flattened.append({
                **item,
                "grader": d.get("grader", ""),
                "grade":  d.get("grade", ""),
            })

        new_count = await insert_listings_bulk(card_id, flattened)
        await save_snapshot(card_id, flattened)
        
        # Determine the representative image (most frequent image_url)
        try:
            from collections import Counter
            img_urls = [i.get("image_url") for i in all_items if i.get("image_url")]
            if img_urls:
                most_common_img = Counter(img_urls).most_common(1)[0][0]
                await update_card_image(card_id, most_common_img)
        except Exception as img_err:
            logger.warning(f"[{display_name}] Failed to update card image: {img_err}")

        logger.info(f"[{display_name}] Done — {new_count} new listings saved (total scraped: {len(flattened)})")
        return new_count

    except Exception as e:
        logger.error(f"[{display_name}] Scrape failed: {e}")
        return 0
    finally:
        await agent.close()


# ─────────────────────────────────────────────────────────────────────────────
# Full polling cycle — runs all cards sequentially to avoid eBay rate limits
# ─────────────────────────────────────────────────────────────────────────────

_tracker_running = False
_last_run: datetime | None = None
_card_errors: dict[int, str] = {}


async def run_all_cards():
    global _tracker_running, _last_run, _card_errors
    if _tracker_running:
        logger.warning("Previous tracker cycle still running — skipping this tick.")
        return

    _tracker_running = True
    _card_errors = {}
    logger.info("=== Tracker cycle starting ===")

    try:
        cards = await get_all_tracked_cards()
        for card in cards:
            try:
                await scrape_card(card["id"], card["display_name"], card["query"])
                await asyncio.sleep(5)  # polite pause between cards
            except Exception as e:
                _card_errors[card["id"]] = str(e)
                logger.error(f"Card {card['id']} failed: {e}")
    finally:
        _tracker_running = False
        _last_run = datetime.utcnow()
        logger.info("=== Tracker cycle complete ===")


def get_tracker_status() -> dict:
    return {
        "running": _tracker_running,
        "last_run": _last_run.isoformat() if _last_run else None,
        "card_errors": _card_errors,
    }


# ─────────────────────────────────────────────────────────────────────────────
# TCGPlayer Daily Price Fetcher (via TCGCSV)
# ─────────────────────────────────────────────────────────────────────────────

async def update_tcgplayer_prices():
    import urllib.request
    import json
    import ssl

    logger.info("Starting TCGPlayer price sync from TCGCSV...")
    try:
        cards = await get_all_tracked_cards()
        tcg_map = { t[0]: (t[2], t[3]) for t in TRACKED_CARDS if len(t) > 3 and t[2] is not None and t[3] is not None }

        groups_to_fetch = {}
        for card in cards:
            if card["display_name"] in tcg_map:
                gid, pid = tcg_map[card["display_name"]]
                groups_to_fetch.setdefault(gid, []).append((card["id"], pid))

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        for gid, queries in groups_to_fetch.items():
            url = f"https://tcgcsv.com/tcgplayer/3/{gid}/prices"
            logger.info(f"Fetching TCG CSV prices for group {gid}")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, context=ctx).read())
                data = json.loads(response.decode())
                
                prices_by_product = {str(item["productId"]): item.get("marketPrice") for item in data.get("results", [])}
                
                for card_id, pid in queries:
                    market_price = prices_by_product.get(str(pid))
                    if market_price is not None:
                        await update_tcgplayer_price(card_id, float(market_price))
                        logger.info(f"Updated card {card_id} with TCGPlayer price {market_price}")

            except Exception as e:
                logger.error(f"Failed to fetch TCGPlayer prices for group {gid}: {e}")

    except Exception as e:
        logger.error(f"Failed to sync TCGPlayer prices: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler setup — called once from server.py lifespan
# ─────────────────────────────────────────────────────────────────────────────

_scheduler: AsyncIOScheduler | None = None


async def start_tracker():
    """
    Initialize DB, seed the 10 cards, then start the 30-min polling scheduler.
    Call this once from FastAPI's lifespan startup.
    """
    global _scheduler

    await init_db()

    # Seed the 10 tracked cards (idempotent — ignores if already exist)
    for t in TRACKED_CARDS:
        display_name, query_list = t[0], t[1]
        combined_query = "|".join(query_list)
        await upsert_tracked_card(display_name, combined_query)
    logger.info(f"Seeded {len(TRACKED_CARDS)} tracked cards (with fallbacks).")

    # Run immediately on startup (first-run backfill)
    asyncio.create_task(run_all_cards())
    asyncio.create_task(update_tcgplayer_prices())

    # Schedule subsequent runs
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(run_all_cards, "interval", minutes=30, id="card_tracker")
    _scheduler.add_job(update_tcgplayer_prices, "cron", hour=0, minute=0, id="tcgplayer_tracker")
    _scheduler.start()
    logger.info("Tracker scheduler started (30-min eBay interval, Daily TCGPlayer sync).")


async def stop_tracker():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
    logger.info("Tracker scheduler stopped.")
