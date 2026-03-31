"""
Interactive eBay Pokemon Card Scraper
--------------------------------------
Usage: py test_run.py

Commands during a session:
  After preview:
    y  - confirm, ask page count, show filtered price stats + save to CSV
    o  - open a preview listing in the browser to spot-check accuracy
    n  - cancel, try a new query
  At the Search prompt:
    q  - quit
"""

import asyncio
import csv
import sys
from datetime import datetime
from pathlib import Path
from agent import EbayScrapingAgent

sys.stdout.reconfigure(encoding="utf-8")

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def format_details(details: dict) -> str:
    parts = []
    if "grader" in details and "grade" in details:
        parts.append(f"{details['grader']} {details['grade']}")
    if "keywords" in details:
        parts.extend(details["keywords"])
    if "card_number" in details:
        parts.append(f"#{details['card_number']}")
    return "  [" + " | ".join(parts) + "]" if parts else ""


def print_preview(items: list):
    print("\n┌─ Preview Results " + "─" * 50)
    for i, item in enumerate(items, 1):
        details_str = format_details(item.get("details", {}))
        sponsored_tag = " [SPONSORED]" if item["sponsored"] else ""
        print(f"│ {i}. {item['title']}{sponsored_tag}")
        print(f"│    Price : {item['price_str']}{details_str}")
        print(f"│    Link  : {item['link']}")
    print("└" + "─" * 67)


def print_stats(stats: dict, filter_label: str = "", total: int = 0):
    print("\n╔══ Market Price Analysis " + "═" * 42)
    if filter_label:
        print(f"║  {filter_label}")
    if total:
        print(f"║  Scraped total  : {total}  →  matched: {stats['count']}")
    else:
        print(f"║  Items analysed : {stats['count']}")
    print(f"║  Lowest price   : ${stats['min']:.2f}")
    print(f"║  Highest price  : ${stats['max']:.2f}")
    print(f"║  Average price  : ${stats['mean']:.2f}")
    print("╚" + "═" * 66)


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

def save_to_csv(items: list, query: str, filters: dict) -> Path:
    safe_query = "".join(c if c.isalnum() else "_" for c in query)[:40]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = RESULTS_DIR / f"{safe_query}_{ts}.csv"

    fieldnames = ["title", "price_str", "price", "grader", "grade",
                  "keywords", "card_number", "sponsored", "link", "image_url"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            d = item.get("details", {})
            writer.writerow({
                "title":       item["title"],
                "price_str":   item["price_str"],
                "price":       item["price"],
                "grader":      d.get("grader", ""),
                "grade":       d.get("grade", ""),
                "keywords":    ", ".join(d.get("keywords", [])),
                "card_number": d.get("card_number", ""),
                "sponsored":   item["sponsored"],
                "link":        item["link"],
                "image_url":   item["image_url"],
            })
    return path


# ---------------------------------------------------------------------------
# Spot-check: open listing in Playwright browser
# ---------------------------------------------------------------------------

async def spot_check(agent: EbayScrapingAgent, preview: list):
    choice = input(
        f"  Enter listing number to open in browser (1–{len(preview)}): "
    ).strip()
    try:
        idx = int(choice) - 1
        if not (0 <= idx < len(preview)):
            raise ValueError
    except ValueError:
        print("  Invalid choice.")
        return

    item = preview[idx]
    link = item["link"]
    if link == "N/A" or not link.startswith("http"):
        print("  No valid link for this item.")
        return

    print(f"\n  Opening: {link}")
    print(f"  Scraped title : {item['title']}")
    print(f"  Scraped price : {item['price_str']}")
    print(f"  → Compare these against what loads in the browser.\n")

    await agent._page.goto(link, wait_until="domcontentloaded", timeout=20000)
    input("  Press ENTER when done inspecting the listing…")


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

async def main():
    agent = EbayScrapingAgent(headless=False)
    await agent.start()

    print("=" * 67)
    print("  eBay Pokemon Card Price Agent")
    print("  Type your search exactly as you would on eBay.")
    print("  Type 'q' to quit.")
    print("=" * 67)

    try:
        while True:
            query = input("\nSearch: ").strip()
            if query.lower() == "q":
                print("Goodbye!")
                break
            if not query:
                continue

            try:
                print("\nFetching preview…")
                preview = await agent.get_preview(query, limit=5)

                if not preview:
                    print("No results found. Try a different query.")
                    continue

                print_preview(preview)

                # --- decision loop ---
                while True:
                    action = input(
                        "\n[y] Confirm & show stats  "
                        "[o] Open a listing to verify  "
                        "[n] Cancel  → "
                    ).strip().lower()

                    if action == "o":
                        await spot_check(agent, preview)
                        print_preview(preview)

                    elif action == "y":
                        # Ask how many pages to scrape
                        pages_input = input(
                            "  Pages to scrape? [default=1, ~60 items/page, max=10]: "
                        ).strip()
                        try:
                            max_pages = max(1, min(10, int(pages_input))) if pages_input else 1
                        except ValueError:
                            max_pages = 1

                        if max_pages > 1:
                            print(f"\nScraping {max_pages} pages…")
                            await agent.search_pages(query, max_pages=max_pages)
                        # else: page 1 already cached in agent._current_items from get_preview

                        all_items = agent._current_items
                        filters   = agent._filters

                        filtered = agent.apply_filters(all_items, filters)
                        stats    = agent.calculate_stats(filtered)

                        filter_parts = []
                        if "grader"   in filters: filter_parts.append(f"Grader={filters['grader']}")
                        if "grade"    in filters: filter_parts.append(f"Grade={filters['grade']}")
                        if "keywords" in filters: filter_parts.extend(filters["keywords"])
                        filter_label = ("  Filters     : " + ", ".join(filter_parts)
                                        if filter_parts else "  Filters     : none (all priced items)")

                        print_stats(stats, filter_label, total=len(all_items))

                        csv_path = save_to_csv(filtered, query, filters)
                        print(f"  ✓ Saved {len(filtered)} rows → {csv_path}")
                        break

                    elif action == "n":
                        print("Search cancelled.")
                        break
                    else:
                        print("  Please type y, o, or n.")

            except RuntimeError as e:
                print(f"\nError: {e}")
            except Exception as e:
                print(f"\nUnexpected error: {e}")
    finally:
        await agent.close()


if __name__ == "__main__":
    asyncio.run(main())
