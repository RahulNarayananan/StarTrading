"""
pop_scraper.py — PSA population report scraper.

Attempts to fetch PSA pop counts for tracked cards.
Results are cached in the population_data table (refreshed weekly).
Fails gracefully — if scraping fails, returns None without blocking the tracker.
"""

import re
import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("pop_scraper")

# PSA public cert search — returns a JSON with grade distributions
PSA_SEARCH_URL = "https://www.psacard.com/pop/non-sports-cards/year/{year}/pokemon-{card_slug}/1"
PSA_API_URL    = "https://api.psacard.com/publicapi/pop/GetItemsBySetYear"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def fetch_psa_population(card_name: str, grade: str = "10") -> dict | None:
    """
    Try to look up PSA pop count for a card name + grade.

    Strategy:
    1. Direct PSA pop search via their public HTML page
    2. Fallback: Google SERP snippet parse for pop count

    Returns dict with keys: grader, grade, pop_count
    Or None if both attempts fail.
    """
    # ── Attempt 1: PSA direct search ────────────────────────────────────────
    try:
        slug = _slugify(card_name)
        url = f"https://www.psacard.com/pop/tcg-cards/0/pokemon/{slug}/1"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            # PSA renders a table with grade columns; look for the grade column
            table = soup.find("table", class_=re.compile(r"pop-table|PopTable", re.I))
            if table:
                headers = [th.get_text(strip=True) for th in table.find_all("th")]
                for row in table.find_all("tr")[1:]:
                    cells = [td.get_text(strip=True) for td in row.find_all("td")]
                    if len(cells) >= len(headers):
                        row_dict = dict(zip(headers, cells))
                        if grade in row_dict:
                            count_str = row_dict[grade].replace(",", "")
                            if count_str.isdigit():
                                logger.info(f"PSA pop for '{card_name}' grade {grade}: {count_str}")
                                return {
                                    "grader":    "PSA",
                                    "grade":     grade,
                                    "pop_count": int(count_str),
                                }
    except Exception as e:
        logger.debug(f"PSA direct attempt failed for '{card_name}': {e}")

    # ── Attempt 2: Google SERP snippet ─────────────────────────────────────
    try:
        query = f"PSA {card_name} grade {grade} population report"
        resp = requests.get(
            "https://www.google.com/search",
            params={"q": query},
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            # Look for "Population: X" or "Pop X" in snippet text
            text = soup.get_text(" ", strip=True)
            m = re.search(r"(?:population|pop)[:\s]+(\d[\d,]*)", text, re.IGNORECASE)
            if m:
                count = int(m.group(1).replace(",", ""))
                logger.info(f"Google SERP pop for '{card_name}' grade {grade}: {count}")
                return {"grader": "PSA", "grade": grade, "pop_count": count}
    except Exception as e:
        logger.debug(f"Google SERP attempt failed for '{card_name}': {e}")

    logger.warning(f"Could not fetch pop data for '{card_name}'")
    return None


async def refresh_population_for_card(card_id: int, card_name: str, grade: str = "10"):
    """
    Async wrapper that fetches pop data and saves it to the DB.
    Called weekly by the tracker.
    """
    import asyncio
    from database import save_population, get_latest_population
    from datetime import datetime, timedelta

    # Check if we already fetched within the last 7 days
    existing = await get_latest_population(card_id)
    if existing:
        fetched_at = datetime.fromisoformat(existing["fetched_at"])
        if datetime.utcnow() - fetched_at < timedelta(days=7):
            logger.debug(f"Pop data for card {card_id} is fresh — skipping refresh.")
            return

    # Run in a thread pool so we don't block the event loop
    result = await asyncio.to_thread(fetch_psa_population, card_name, grade)
    if result:
        await save_population(
            card_id,
            result["grader"],
            result["grade"],
            result["pop_count"],
        )
