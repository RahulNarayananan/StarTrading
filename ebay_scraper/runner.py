"""
runner.py — Orchestrator-facing entry point for the eBay Scraper Agent.

The orchestrator calls `run(payload: dict) -> dict` directly.

Expected payload keys (see manifest.json for full schema):
    query      (str, required)  : e.g. "Charizard Base Set PSA 10"
    max_pages  (int, optional)  : pages to scrape, default 1
    headless   (bool, optional) : headless browser, default True
    save_csv   (bool, optional) : write results CSV, default True

Returns a dict matching the output_schema in manifest.json.
"""

import asyncio
import csv
import traceback
from datetime import datetime
from pathlib import Path

from .agent import EbayScrapingAgent

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


def _save_csv(items: list, query: str) -> str:
    safe_query = "".join(c if c.isalnum() else "_" for c in query)[:40]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = RESULTS_DIR / f"{safe_query}_{ts}.csv"

    fieldnames = [
        "title", "price_str", "price",
        "grader", "grade", "keywords", "card_number",
        "sponsored", "link", "image_url",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            d = item.get("details", {})
            writer.writerow({
                "title":       item["title"],
                "price_str":   item["price_str"],
                "price":       item.get("price", ""),
                "grader":      d.get("grader", ""),
                "grade":       d.get("grade", ""),
                "keywords":    ", ".join(d.get("keywords", [])),
                "card_number": d.get("card_number", ""),
                "sponsored":   item["sponsored"],
                "link":        item["link"],
                "image_url":   item["image_url"],
            })
    return str(path)


def _flatten_item(item: dict) -> dict:
    """Flatten nested 'details' dict into the top level for cleaner output."""
    d = item.get("details", {})
    return {
        "title":       item["title"],
        "price":       item.get("price"),
        "price_str":   item["price_str"],
        "grader":      d.get("grader", ""),
        "grade":       d.get("grade", ""),
        "keywords":    d.get("keywords", []),
        "card_number": d.get("card_number", ""),
        "sponsored":   item["sponsored"],
        "link":        item["link"],
        "image_url":   item["image_url"],
    }


async def _run_async(payload: dict) -> dict:
    query     = payload["query"]
    max_pages = int(payload.get("max_pages", 1))
    headless  = bool(payload.get("headless", True))
    save_csv  = bool(payload.get("save_csv", True))

    agent = EbayScrapingAgent(headless=headless)
    await agent.start()

    try:
        if max_pages == 1:
            await agent.search(query)
        else:
            await agent.search_pages(query, max_pages=max_pages)

        # Filters are parsed from the query itself
        filters  = agent.parse_query_filters(query)
        all_items = agent._current_items
        filtered  = agent.apply_filters(all_items, filters)
        stats     = agent.calculate_stats(filtered)

        csv_path = _save_csv(filtered, query) if save_csv else None

        return {
            "status":           "success",
            "query":            query,
            "filters_detected": filters,
            "stats":            stats,
            "items":            [_flatten_item(i) for i in filtered],
            "csv_path":         csv_path,
        }

    finally:
        await agent.close()


def run(payload: dict) -> dict:
    """
    Synchronous entry point — safe to call from any orchestrator thread.

    Example:
        from ebay_scraper.runner import run
        result = run({"query": "Charizard Base Set PSA 10", "max_pages": 3})
    """
    try:
        return asyncio.run(_run_async(payload))
    except Exception as exc:
        return {
            "status": "error",
            "query":  payload.get("query", ""),
            "error":  str(exc),
            "traceback": traceback.format_exc(),
        }


# ── Direct invocation for quick testing ──────────────────────────────────────
if __name__ == "__main__":
    import json
    import sys

    query     = sys.argv[1] if len(sys.argv) > 1 else "Charizard Base Set PSA 10"
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    result = run({"query": query, "max_pages": max_pages, "headless": False})
    print(json.dumps({k: v for k, v in result.items() if k != "items"}, indent=2))
    print(f"\nItems returned: {len(result.get('items', []))}")
