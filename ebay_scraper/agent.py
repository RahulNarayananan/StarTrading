import re
import asyncio
import time
from playwright.async_api import async_playwright


class EbayScrapingAgent:
    """
    Scrapes eBay using Playwright with stealth settings.
    requests/BeautifulSoup cannot be used because eBay renders
    search results entirely via client-side JavaScript.
    """

    def __init__(self, headless: bool = False):
        self.headless = headless
        self._browser = None
        self._context = None
        self._page = None
        self._playwright = None
        self._current_items: list = []
        self._filters: dict = {}

    # ------------------------------------------------------------------
    # Browser lifecycle
    # ------------------------------------------------------------------

    async def start(self):
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars",
                "--lang=en-US",
            ],
        )
        self._context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 900},
        )
        # Remove Playwright's navigator.webdriver flag
        await self._context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        self._page = await self._context.new_page()

    async def close(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    # ------------------------------------------------------------------
    # Core search
    # ------------------------------------------------------------------

    async def search(self, query: str, page_num: int = 1) -> list:
        """Fetch one results page for *query* and return parsed items.

        Appends eBay's built-in "Completed listings" and "Sold items" filters
        (LH_Complete=1 & LH_Sold=1) so results reflect real transaction prices.
        """
        encoded = query.replace(" ", "+")
        url = (
            f"https://www.ebay.com/sch/i.html"
            f"?_nkw={encoded}&_sacat=0&_pgn={page_num}"
            f"&LH_Complete=1&LH_Sold=1"
        )
        print(f"Navigating to: {url}")

        await self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
        
        # Wait for network to settle so eBay finishes any internal redirects
        try:
            await self._page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass  # Proceed even if it times out

        # Scroll using mouse wheel — survives page redirects that destroy eval context
        for scroll_y in [400, 800, 1200, 1600]:
            await self._page.mouse.wheel(0, scroll_y)
            await asyncio.sleep(0.8)

        # Wait for actual item elements — generous timeout
        print("Waiting for items to render…")
        try:
            await self._page.wait_for_selector("li.s-card", timeout=15000)
        except Exception:
            print("Timeout waiting for li.s-card — saving debug dump.")
            content = await self._page.content()
            with open("debug_page_dump.html", "w", encoding="utf-8") as f:
                f.write(content)
            print("Saved debug_page_dump.html")
            return []

        items = await self._parse_items()
        self._current_items = items
        return items

    async def get_total_pages(self) -> int:
        """
        Read the pagination from the currently loaded eBay results page
        and return the total number of pages available (max 20).

        eBay renders pagination as <a> tags containing page numbers inside
        the nav with aria-label='pagination'. We take the highest integer
        text found in that nav.
        """
        try:
            # Try eBay's pagination nav
            page_links = await self._page.query_selector_all(
                "nav[aria-label='pagination'] a, "
                ".pagination li a, "
                "a.x-pagination__item"
            )
            max_page = 1
            for el in page_links:
                txt = (await el.inner_text()).strip()
                if txt.isdigit():
                    max_page = max(max_page, int(txt))
            return min(max_page, 20)   # hard cap to avoid runaway
        except Exception:
            return 1

    async def search_all_pages(self, query: str) -> list:
        """
        Auto-detect total pages from page 1 and scrape every page.
        Returns de-duplicated list of all scraped items.
        """
        # Page 1
        print("Searching page 1…")
        items_page1 = await self.search(query, page_num=1)
        total_pages = await self.get_total_pages()
        print(f"eBay reports {total_pages} page(s) for '{query}'")

        all_items = list(items_page1)
        seen_links = {i["link"] for i in all_items}

        for page_num in range(2, total_pages + 1):
            print(f"Fetching page {page_num}/{total_pages}…")
            try:
                page_items = await self.search(query, page_num=page_num)
            except Exception as e:
                print(f"  Page {page_num} error: {e} — stopping early")
                break

            if not page_items:
                print(f"  Page {page_num} returned no items — stopping early")
                break

            # De-duplicate by link
            new_items = [i for i in page_items if i["link"] not in seen_links]
            if not new_items:
                print(f"  Page {page_num} all duplicates — stopping early")
                break

            all_items.extend(new_items)
            seen_links.update(i["link"] for i in new_items)
            await asyncio.sleep(1.0)   # polite pause between pages

        self._current_items = all_items
        print(f"Total items collected: {len(all_items)}")
        return all_items

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    async def _parse_items(self) -> list:
        item_els = await self._page.query_selector_all("li.s-card")
        print(f"Found {len(item_els)} item elements.")
        items = []

        for el in item_els:
            try:
                # Title
                title_el = await el.query_selector(".s-card__title")
                if not title_el:
                    continue
                title = (await title_el.inner_text()).strip()
                if "Shop on eBay" in title or not title:
                    continue

                # Price  (span.s-card__price)
                price_el = await el.query_selector(".s-card__price")
                price_str = (await price_el.inner_text()).strip() if price_el else "N/A"

                # Link — first a.s-card__link
                link_el = await el.query_selector("a.s-card__link")
                link = (await link_el.get_attribute("href") or "N/A") if link_el else "N/A"
                # Strip tracking params
                if link != "N/A" and "?" in link:
                    link = link.split("?")[0]

                # Image
                img_el = await el.query_selector("img.s-card__image")
                image_url = (
                    (await img_el.get_attribute("src") or
                     await img_el.get_attribute("data-src") or "N/A")
                    if img_el else "N/A"
                )

                # Subtitle — carries "Sponsored" flag
                subtitle_el = await el.query_selector(".s-card__subtitle")
                subtitle_text = (await subtitle_el.inner_text()).strip() if subtitle_el else ""
                sponsored = "Sponsored" in subtitle_text

                # Sold date — scan the FULL card text for "Sold Mar 2, 2026"
                # (eBay's date may be in any element; full-text scan is reliable)
                full_text = (await el.inner_text()).strip()
                sold_date, sold_date_iso = self.parse_sold_date(full_text)

                price_val, price_usd, price_currency = self.parse_price(price_str)
                details = self.extract_details(title)

                items.append(
                    {
                        "title":        title,
                        "price_str":    price_str,
                        "price":        price_usd,       # always USD
                        "price_raw":    price_val,       # raw numeric (original currency)
                        "price_currency": price_currency, # e.g. "USD", "JPY", "AUD"
                        "link":         link,
                        "image_url":    image_url,
                        "sponsored":    sponsored,
                        "details":      details,
                        "sold_date":    sold_date,
                        "sold_date_iso": sold_date_iso,
                    }
                )
            except Exception:
                continue

        return items

    # ------------------------------------------------------------------
    # Sold date parsing
    # ------------------------------------------------------------------

    @staticmethod
    def parse_sold_date(text: str):
        """
        Extract the sold date from eBay subtitle text like "Sold Mar 2, 2026".

        Returns (human_str, iso_str) e.g. ("Mar 2, 2026", "2026-03-02").
        Returns (None, None) if no date is found.
        """
        from datetime import datetime
        m = re.search(
            r"Sold\s+([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})",
            text, re.IGNORECASE
        )
        if not m:
            return None, None
        try:
            dt = datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%b %d %Y")
            human = f"{dt.strftime('%b')} {dt.day}, {dt.year}"
            return human, dt.strftime("%Y-%m-%d")
        except Exception:
            return None, None

    # ------------------------------------------------------------------
    # Detail extraction
    # ------------------------------------------------------------------


    @staticmethod
    def extract_details(title: str) -> dict:
        details = {}

        # Grader + grade  e.g. PSA 10 / BGS 9.5 / CGC 9
        grade_match = re.search(
            r"\b(PSA|CGC|BGS|SGC|HGA)\s*(\d+(?:\.\d+)?)",
            title, re.IGNORECASE,
        )
        if grade_match:
            details["grader"] = grade_match.group(1).upper()
            details["grade"] = grade_match.group(2)

        # Edition / special keywords
        keywords = []
        if re.search(r"1st\s+edition", title, re.IGNORECASE):
            keywords.append("1st Edition")
        if re.search(r"shadowless", title, re.IGNORECASE):
            keywords.append("Shadowless")
        if re.search(r"holo\s+rare", title, re.IGNORECASE):
            keywords.append("Holo Rare")
        if keywords:
            details["keywords"] = keywords

        # Card number  e.g. 4/102
        card_num = re.search(r"\b(\d{1,3}/\d{2,3})\b", title)
        if card_num:
            details["card_number"] = card_num.group(1)

        return details

    # ------------------------------------------------------------------
    # Similarity helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _tokenize(text: str) -> set:
        """Lowercase alphanumeric tokens with mixed-token splitting.

        'psa10' → {'psa', '10'} so queries typed without spaces still align
        with title tokens that have spaces (e.g. 'PSA 10').
        Tokens shorter than 2 chars and common stopwords are dropped.
        """
        _STOPWORDS = {"the", "a", "an", "of", "in", "for", "and", "or",
                      "with", "lot", "set", "card", "pokemon", "pokémon"}
        raw = re.findall(r"[a-z0-9]+", text.lower())
        tokens: set = set()
        for t in raw:
            # Split mixed alpha-numeric runs: "psa10" → ["psa", "10"]
            parts = re.findall(r"[a-z]+|[0-9]+", t)
            for p in parts:
                if len(p) >= 2 and p not in _STOPWORDS:
                    tokens.add(p)
        return tokens

    @staticmethod
    def compute_similarity(query: str, title: str) -> float:
        """
        Jaccard-style overlap: what fraction of the query tokens appear in
        the title?  Score range 0.0-1.0.

        We weight query coverage (recall) more than set-intersection purity
        so that long, detailed titles still match short queries.
        """
        q_tokens = EbayScrapingAgent._tokenize(query)
        t_tokens = EbayScrapingAgent._tokenize(title)
        if not q_tokens:
            return 1.0
        matched = q_tokens & t_tokens
        # query coverage — every query token must appear somewhere in the title
        coverage = len(matched) / len(q_tokens)
        return round(coverage, 4)

    @staticmethod
    def is_bundle(query: str, title: str) -> tuple:
        """
        Detect multi-card bundle / lot listings that would skew price analysis.

        Returns (is_bundle: bool, reason: str)

        Two detection signals:
        1. Explicit lot keywords in the title.
        2. Title contains significantly more distinct Pokémon names than the query.
        """
        title_lower = title.lower()

        # ── Signal 1: explicit lot/bundle keywords ─────────────────────────
        LOT_PATTERNS = [
            r"\blot\b", r"\bbundle\b", r"\bcollection\b",
            r"\bx\d+\b",          # x2, x3, x10 ...
            r"\b\d+x\b",          # 2x, 3x ...
            r"\bset of\b", r"\bpack of\b",
            r"\bmulti\b", r"\bmultiple\b",
            r"\bcombo\b", r"\bboth\b",
            r"\+",                # "Pikachu + Eevee"
            r"\band\b",           # "Pikachu and Eevee" (title context)
        ]
        for pat in LOT_PATTERNS:
            if re.search(pat, title_lower):
                return True, f"lot keyword: '{re.search(pat, title_lower).group()}'"

        # ── Signal 2: multiple Pokémon names in title vs. query ────────────
        # Common Pokémon names likely to appear in card titles
        POKEMON_NAMES = {
            "pikachu", "charizard", "blastoise", "venusaur", "mewtwo",
            "eevee", "snorlax", "gengar", "lucario", "rayquaza",
            "mew", "gyarados", "dragonite", "alakazam", "machamp",
            "arcanine", "raichu", "ninetales", "slowpoke", "clefairy",
            "jigglypuff", "psyduck", "poliwag", "abra", "magikarp",
            "lapras", "vaporeon", "jolteon", "flareon", "espeon",
            "umbreon", "glaceon", "leafeon", "sylveon", "togekiss",
            "garchomp", "salamence", "dragonair", "dratini", "aerodactyl",
            "moltres", "zapdos", "articuno", "raikou", "entei", "suicune",
            "lugia", "hooh", "celebi", "latios", "latias", "groudon",
            "kyogre", "deoxys", "dialga", "palkia", "giratina", "arceus",
            "reshiram", "zekrom", "kyurem", "xerneas", "yveltal", "zygarde",
            "solgaleo", "lunala", "necrozma", "eternatus", "zacian", "zamazenta",
            "mimikyu", "rowlet", "litten", "popplio", "decidueye", "incineroar",
            "sobble", "grookey", "scorbunny", "cinderace", "rillaboom", "inteleon",
            "perrserker", "obstagoon", "morpeko", "toxtricity",
            "bulbasaur", "squirtle", "charmander", "ivysaur", "charmeleon",
            "wartortle", "caterpie", "metapod", "butterfree", "weedle",
            "onix", "geodude", "golem", "scyther", "pinsir", "tauros",
            "ditto", "porygon", "omanyte", "kabuto", "seel", "dewgong",
            "munchlax", "riolu", "togepi", "marill", "snubbull",
            "ralts", "kirlia", "gardevoir", "gallade",
            "bagon", "shelgon", "beldum", "metang", "metagross",
            "gible", "gabite",
        }

        title_words = set(re.findall(r"[a-z]+", title_lower))
        query_lower = query.lower()
        query_words = set(re.findall(r"[a-z]+", query_lower))

        pokemon_in_title = title_words & POKEMON_NAMES
        pokemon_in_query = query_words & POKEMON_NAMES

        # If the title has more Pokémon names than the query, it's a bundle
        extra = pokemon_in_title - pokemon_in_query
        if len(extra) >= 2:
            return True, f"multiple extra Pokémon names: {sorted(extra)}"

        return False, ""

    @staticmethod
    def validate_match(query: str, title: str) -> dict:
        """
        Hard validation: every meaningful query token must appear in the title,
        AND the listing must not be a multi-card bundle.

        Returns a dict:
          - passed  (bool)   : True if ALL query tokens found AND not a bundle
          - similarity (float): fraction of query tokens found (0.0-1.0)
          - missing (list)   : tokens from the query absent from the title
          - matched (list)   : tokens from the query present in the title
          - bundle  (bool)   : True if detected as a multi-card lot/bundle
          - bundle_reason (str): short explanation if bundle detected

        This replaces the soft percentage threshold with a strict requirement
        that every non-trivial word the user searched for is literally in the
        result title — so "pikachu" in the query is always mandatory.
        """
        q_tokens = EbayScrapingAgent._tokenize(query)
        t_tokens = EbayScrapingAgent._tokenize(title)
        if not q_tokens:
            return {"passed": True, "similarity": 1.0, "missing": [], "matched": [],
                    "bundle": False, "bundle_reason": ""}

        matched = sorted(q_tokens & t_tokens)
        missing = sorted(q_tokens - t_tokens)
        similarity = round(len(matched) / len(q_tokens), 4)

        bundle, bundle_reason = EbayScrapingAgent.is_bundle(query, title)

        return {
            "passed":        len(missing) == 0 and not bundle,
            "similarity":    similarity,
            "matched":       matched,
            "missing":       missing,
            "bundle":        bundle,
            "bundle_reason": bundle_reason,
        }

    @staticmethod
    def filter_by_similarity(
        items: list, query: str, threshold: float = 1.0
    ) -> list:
        """
        Keep only items that pass validate_match (all tokens present by default).
        Each item gets 'similarity', 'matched', and 'missing' fields added.
        Threshold can be lowered (e.g. 0.80) to allow partial matches.
        """
        result = []
        for item in items:
            v = EbayScrapingAgent.validate_match(query, item["title"])
            item["similarity"] = v["similarity"]
            item["matched"]    = v["matched"]
            item["missing"]    = v["missing"]
            if v["similarity"] >= threshold:
                result.append(item)
        return result


    # ------------------------------------------------------------------
    # Price helpers
    # ------------------------------------------------------------------

    # Approximate exchange rates TO USD (updated periodically — good enough for
    # relative price analysis; not used for financial transactions)
    _FX_RATES_TO_USD = {
        "JPY": 1 / 150.0,    # ¥150 = $1
        "AUD": 1 / 1.55,     # A$1.55 = $1
        "GBP": 1 / 0.79,     # £0.79 = $1
        "EUR": 1 / 0.92,     # €0.92 = $1
        "CAD": 1 / 1.36,     # C$1.36 = $1
        "SGD": 1 / 1.34,     # S$1.34 = $1
        "HKD": 1 / 7.82,     # HK$7.82 = $1
        "CNY": 1 / 7.24,     # ¥7.24 = $1 (yuan, same ¥ symbol)
        "USD": 1.0,
    }

    @staticmethod
    def parse_price(price_str: str):
        """
        Parse a price string like "$1,200.00", "AU $13,500", "¥1,500,000",
        "£850", "€1,100", "C $1,800" into (raw_value, usd_value, currency_code).

        Returns (raw: float|None, usd: float|None, currency: str)
        """
        if not price_str or price_str == "N/A":
            return None, None, "USD"

        ps = price_str.strip()

        # Detect currency by prefix pattern
        currency = "USD"
        if re.search(r"AU\s*\$", ps, re.IGNORECASE):
            currency = "AUD"
        elif re.search(r"C\s*\$", ps, re.IGNORECASE):
            currency = "CAD"
        elif re.search(r"S\s*\$", ps, re.IGNORECASE):
            currency = "SGD"
        elif re.search(r"HK\s*\$", ps, re.IGNORECASE):
            currency = "HKD"
        elif "£" in ps:
            currency = "GBP"
        elif "€" in ps:
            currency = "EUR"
        elif "¥" in ps or "\u00a5" in ps:
            # Distinguish JPY vs CNY: JPY prices are typically > 1000
            # We'll detect after parsing the number
            currency = "JPY"  # default; refined below
        elif "$" in ps:
            currency = "USD"

        # Extract numeric value
        try:
            clean = re.sub(r"[^\d.]", "", ps.replace(",", ""))
            m = re.search(r"(\d+\.?\d*)", clean)
            raw = float(m.group(1)) if m else None
        except Exception:
            raw = None

        if raw is None:
            return None, None, currency

        # Refine JPY vs CNY (rough heuristic: CNY prices < 100,000 typically)
        if currency == "JPY" and raw < 5000:
            currency = "CNY"

        rate = EbayScrapingAgent._FX_RATES_TO_USD.get(currency, 1.0)
        usd = round(raw * rate, 2)
        return raw, usd, currency

    def calculate_stats(self, items: list) -> dict:
        prices = [i["price"] for i in items if i.get("price") is not None]
        if not prices:
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "count": 0}
        return {
            "min": min(prices),
            "max": max(prices),
            "mean": round(sum(prices) / len(prices), 2),
            "count": len(prices),
        }

    # ------------------------------------------------------------------
    # Query-based filtering
    # ------------------------------------------------------------------

    @staticmethod
    def parse_query_filters(query: str) -> dict:
        """
        Extract filter constraints from the user's raw search query.
        Returns a dict with any of: grader, grade, keywords.
        """
        filters = {}

        # Grader + grade  e.g. "PSA 10", "CGC 9.5"
        grade_match = re.search(
            r"\b(PSA|CGC|BGS|SGC|HGA)\s*(\d+(?:\.\d+)?)",
            query, re.IGNORECASE,
        )
        if grade_match:
            filters["grader"] = grade_match.group(1).upper()
            filters["grade"] = grade_match.group(2)
        elif re.search(r"\b(PSA|CGC|BGS|SGC|HGA)\b", query, re.IGNORECASE):
            # Grader mentioned without a grade number — filter by grader only
            m = re.search(r"\b(PSA|CGC|BGS|SGC|HGA)\b", query, re.IGNORECASE)
            filters["grader"] = m.group(1).upper()

        # Keywords
        keywords = []
        if re.search(r"1st\s+edition", query, re.IGNORECASE):
            keywords.append("1st Edition")
        if re.search(r"shadowless", query, re.IGNORECASE):
            keywords.append("Shadowless")
        if re.search(r"holo\s+rare", query, re.IGNORECASE):
            keywords.append("Holo Rare")
        if keywords:
            filters["keywords"] = keywords

        return filters

    @staticmethod
    def apply_filters(items: list, filters: dict) -> list:
        """
        Keep only items whose extracted details match all filters from the query.
        If no filters are found in the query, all items with a price are returned.
        """
        if not filters:
            return [i for i in items if i.get("price") is not None]

        matched = []
        for item in items:
            if item.get("price") is None:
                continue
            details = item.get("details", {})

            # Grader check
            if "grader" in filters:
                if details.get("grader", "").upper() != filters["grader"]:
                    continue

            # Grade check (string compare to handle "10" == "10.0" edge case)
            if "grade" in filters:
                item_grade = str(details.get("grade", "")).strip()
                want_grade = str(filters["grade"]).strip()
                if item_grade != want_grade:
                    continue

            # Keywords check — ALL requested keywords must appear
            if "keywords" in filters:
                item_kws = [k.lower() for k in details.get("keywords", [])]
                for kw in filters["keywords"]:
                    if kw.lower() not in item_kws:
                        break
                else:
                    matched.append(item)
                    continue
                continue  # keyword didn't match

            matched.append(item)
        return matched

    async def get_preview(self, query: str, limit: int = 5) -> list:
        """Fetch page 1 and return a small preview for user confirmation."""
        items = await self.search(query)
        self._filters = self.parse_query_filters(query)
        valid = [i for i in items if i["price"] is not None]
        valid = self.filter_by_similarity(valid, query)
        return valid[:limit]

    async def search_pages(self, query: str, max_pages: int = 3) -> list:
        """
        Scrape multiple eBay result pages and merge results.
        Deduplicates by listing link.
        Applies similarity filter before storing results.
        Returns all items; also stores in self._current_items.
        """
        all_items: list = []
        seen_links: set = set()

        for page_num in range(1, max_pages + 1):
            print(f"  Scraping page {page_num}/{max_pages}…")
            items = await self.search(query, page_num=page_num)

            # Apply similarity filter early so similar-but-wrong cards are dropped
            items = self.filter_by_similarity(items, query)

            new = 0
            for item in items:
                link = item.get("link", "N/A")
                if link not in seen_links:
                    seen_links.add(link)
                    all_items.append(item)
                    new += 1

            print(f"  Page {page_num}: +{new} new  (total: {len(all_items)})")

            if not items:
                print("  No more results — stopping early.")
                break

        self._current_items = all_items
        return all_items

    def get_all_stats(self) -> dict:
        return self.calculate_stats(self._current_items)
