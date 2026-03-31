"""
server.py — FastAPI backend for the eBay Pokémon Card Scraper UI
             + Bloomberg Terminal tracker endpoints.

Run with:
    uvicorn server:app --port 8000
Then open http://localhost:8000           (manual search UI)
     or  http://localhost:8000/terminal/  (Bloomberg tracker terminal)
"""

# ── Windows requires ProactorEventLoop for Playwright subprocess support ──
import sys, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import csv
import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import EbayScrapingAgent
from tracker import start_tracker, stop_tracker, get_tracker_status, run_all_cards, TRACKED_CARDS, scrape_card
from database import (
    init_db, upsert_tracked_card, get_all_tracked_cards,
    get_card_by_id, compute_analytics, get_listings_for_card,
    get_or_create_active_market, get_market_sentiment, place_prediction,
    get_recent_listings, get_snapshots, get_latest_population
)
from llm_agent import get_market_insight, get_weekly_report

# ---------------------------------------------------------------------------
# Shared browser instance — starts once, lives for server lifetime
# ---------------------------------------------------------------------------

_agent: EbayScrapingAgent | None = None
_agent_lock = asyncio.Lock()

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

UI_DIR       = Path(__file__).parent / "ui"
TERMINAL_DIR = Path(__file__).parent / "terminal"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _agent
    # Manual search browser
    _agent = EbayScrapingAgent(headless=False)
    await _agent.start()

    # Background tracker (30-min polling)
    await start_tracker()

    yield

    await _agent.close()
    await stop_tracker()


app = FastAPI(title="eBay Card Scraper + Bloomberg Terminal", lifespan=lifespan)

# Serve existing search UI
app.mount("/ui", StaticFiles(directory=str(UI_DIR)), name="ui")

# Serve the new Bloomberg terminal UI
app.mount("/terminal", StaticFiles(directory=str(TERMINAL_DIR), html=True), name="terminal")


# ---------------------------------------------------------------------------
# Request / Response models (existing search)
# ---------------------------------------------------------------------------

class PreviewRequest(BaseModel):
    query: str

class ScrapeRequest(BaseModel):
    query: str

class AddCardRequest(BaseModel):
    display_name: str
    query: str

class PredictionRequest(BaseModel):
    direction: str
    amount: int = 1


# ---------------------------------------------------------------------------
# Helpers (existing)
# ---------------------------------------------------------------------------

def _flatten(item: dict) -> dict:
    d = item.get("details", {})
    return {
        "title":         item["title"],
        "price":         item.get("price"),
        "price_str":     item["price_str"],
        "grader":        d.get("grader", ""),
        "grade":         d.get("grade", ""),
        "keywords":      d.get("keywords", []),
        "card_number":   d.get("card_number", ""),
        "sponsored":     item["sponsored"],
        "link":          item["link"],
        "image_url":     item["image_url"],
        "similarity":    item.get("similarity", None),
        "matched":       item.get("matched", []),
        "missing":       item.get("missing", []),
        "bundle":        item.get("bundle", False),
        "bundle_reason": item.get("bundle_reason", ""),
        "price_currency": item.get("price_currency", "USD"),
        "price_raw":     item.get("price_raw", None),
        "sold_date":     item.get("sold_date", None),
        "sold_date_iso": item.get("sold_date_iso", None),
    }


def _save_csv(items: list, query: str) -> str:
    safe = "".join(c if c.isalnum() else "_" for c in query)[:40]
    ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = f"{safe}_{ts}.csv"
    path = RESULTS_DIR / name

    fields = ["title","price_str","price","price_currency","price_raw",
              "grader","grade","keywords","card_number","sponsored",
              "link","image_url","sold_date","sold_date_iso",
              "similarity","matched","missing"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for item in items:
            w.writerow({k: item.get(k, "") for k in fields})
    return name


# ---------------------------------------------------------------------------
# Existing routes (manual search UI)
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(str(UI_DIR / "index.html"))


@app.post("/search/preview")
async def preview(req: PreviewRequest):
    """Fetch page 1 and return 5 preview items."""
    async with _agent_lock:
        try:
            items = await _agent.get_preview(req.query, limit=5)
            filters = _agent._filters
            return {
                "status": "success",
                "query":  req.query,
                "filters_detected": filters,
                "items":  [_flatten(i) for i in items],
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/scrape")
async def scrape(req: ScrapeRequest):
    """Scrape ALL available pages, apply filters, return full stats + items + rejected."""
    async with _agent_lock:
        try:
            await _agent.search_all_pages(req.query)

            filters   = _agent.parse_query_filters(req.query)
            all_items = _agent._current_items

            scored = []
            for item in all_items:
                v = _agent.validate_match(req.query, item["title"])
                scored.append({
                    **item,
                    "similarity":    v["similarity"],
                    "matched":       v["matched"],
                    "missing":       v["missing"],
                    "bundle":        v["bundle"],
                    "bundle_reason": v["bundle_reason"],
                    "_passed":       v["passed"],
                })

            similar  = [i for i in scored if i["_passed"]]
            rejected = [i for i in scored if not i["_passed"]]

            filtered = _agent.apply_filters(similar, filters)

            filtered.sort(
                key=lambda x: x.get("sold_date_iso") or "",
                reverse=True
            )

            stats    = _agent.calculate_stats(filtered)

            flat          = [_flatten(i) for i in filtered]
            flat_rejected = [_flatten(i) for i in sorted(
                rejected, key=lambda x: x.get("similarity", 0), reverse=True
            )]
            csv_name = _save_csv(flat, req.query)

            return {
                "status":           "success",
                "query":            req.query,
                "filters_detected": filters,
                "stats":            stats,
                "total_scraped":    len(all_items),
                "similarity_threshold": 1.0,
                "items":            flat,
                "rejected":         flat_rejected,
                "csv_filename":     csv_name,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{filename}")
async def download(filename: str):
    path = RESULTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ---------------------------------------------------------------------------
# Bloomberg Terminal — Tracker API routes
# ---------------------------------------------------------------------------

@app.get("/tracker/status")
async def tracker_status():
    """Return scheduler status: last run time, whether running, any errors."""
    return get_tracker_status()


@app.get("/tracker/cards")
async def tracker_cards():
    """
    Return all tracked cards with their latest analytics snapshot.
    Powers the main Bloomberg dashboard table.
    """
    cards = await get_all_tracked_cards()
    result = []
    for card in cards:
        analytics = await compute_analytics(card["id"])
        pop        = await get_latest_population(card["id"])
        result.append({
            **card,
            **analytics,
            "pop_count":  pop["pop_count"] if pop else None,
            "pop_grader": pop["grader"] if pop else None,
            "pop_grade":  pop["grade"] if pop else None,
        })
    return result


@app.get("/tracker/card/{card_id}")
async def tracker_card_detail(card_id: int):
    """
    Full detail for one card: price history, analytics, population, raw sales.
    Powers the card detail page.
    """
    card = await get_card_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    analytics = await compute_analytics(card_id)
    pop        = await get_latest_population(card_id)
    listings   = await get_listings_for_card(card_id, days=90)
    snapshots  = await get_snapshots(card_id, days=90)

    return {
        **card,
        **analytics,
        "pop_count":  pop["pop_count"] if pop else None,
        "pop_grader": pop["grader"] if pop else None,
        "pop_grade":  pop["grade"] if pop else None,
        "listings":   listings,
        "snapshots":  snapshots,
    }


@app.post("/tracker/cards")
async def add_tracked_card(req: AddCardRequest):
    """Add a new card to the tracking list."""
    card_id = await upsert_tracked_card(req.display_name, req.query, is_active=1)
    await activate_card(card_id)
    return {"status": "ok", "card_id": card_id}


@app.post("/tracker/deep-search")
async def deep_search_and_extract(req: ScrapeRequest):
    """
    Search for a card by query. If not existing or no data, trigger a live scrape.
    Used by the frontend search to 'deep-dive' into new cards.
    """
    # 1. Ensure card exists in tracked_cards
    # We use the query as both display name and query for simplicity on new cards
    card_id = await upsert_tracked_card(req.query, req.query, is_active=0)
    
    # 2. Check if we already have listings (avoid redundant scraping)
    listings = await get_listings_for_card(card_id, days=1)
    if len(listings) > 20:
        return {"status": "exists", "card_id": card_id, "count": len(listings)}
        
    # 3. Trigger live scrape
    # Note: This is a long-running operation. We'll wait for it here 
    # so the frontend can show its loading system.
    new_count = await scrape_card(card_id, req.query, req.query)
    
    return {
        "status": "extracted",
        "card_id": card_id,
        "new_listings": new_count
    }


@app.delete("/tracker/cards/{card_id}")
async def remove_tracked_card(card_id: int):
    """Deactivate a card (stops tracking, keeps historical data)."""
    await deactivate_card(card_id)
    return {"status": "ok"}


@app.post("/tracker/refresh")
async def trigger_refresh():
    """Manually trigger a scrape cycle for all cards."""
    asyncio.create_task(run_all_cards())
    return {"status": "refresh started"}

@app.get("/tracker/card/{card_id}/analytics")
async def card_analytics(card_id: int):
    stats = await compute_analytics(card_id)
    return stats

@app.get("/tracker/card/{card_id}/ai-insight")
async def card_ai_insight(card_id: int):
    card = await get_card_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    listings = await get_recent_listings(card_id, limit=20)
    insight = await get_market_insight(card["display_name"], listings)
    return {"insight": insight}

@app.get("/tracker/weekly-report")
async def generate_market_report():
    """
    Aggregates data for all tracked cards and generates a Professor Oak weekly report.
    """
    cards = await get_all_tracked_cards()
    active_summaries = []
    
    for card in cards:
        if card.get("is_active") == 1:
            analytics = await compute_analytics(card["id"])
            active_summaries.append({
                "display_name": card["display_name"],
                "last_price": analytics.get("last_price"),
                "trend_30d": analytics.get("trend_30d")
            })
            
    if not active_summaries:
        return {"report": "No active cards are being tracked. Professor Oak has no data to analyze!"}
        
    report = await get_weekly_report(active_summaries)
    return {"report": report}

@app.get("/tracker/card/{card_id}/market")
async def get_card_market(card_id: int):
    """Fetch active prediction market and its sentiment for a card."""
    market = await get_or_create_active_market(card_id)
    sentiment = await get_market_sentiment(market["id"])
    return {
        "market": market,
        "sentiment": sentiment
    }

@app.post("/tracker/market/{market_id}/bet")
async def place_market_bet(market_id: int, req: PredictionRequest):
    """Place an UP or DOWN vote on a market and return updated sentiment."""
    await place_prediction(market_id, req.direction, req.amount)
    sentiment = await get_market_sentiment(market_id)
    return {"status": "ok", "sentiment": sentiment}
