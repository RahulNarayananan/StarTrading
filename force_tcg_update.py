import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "ebay_scraper"))

from ebay_scraper.tracker import update_tcgplayer_prices

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(update_tcgplayer_prices())
