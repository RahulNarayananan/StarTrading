import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "ebay_scraper"))
from database import init_db

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(init_db())
