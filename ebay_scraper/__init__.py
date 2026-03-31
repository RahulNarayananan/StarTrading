"""
ebay_scraper — eBay Pokemon Card Price Scraping Agent
======================================================

Orchestrator entry point:
    from ebay_scraper.runner import run
    result = run({"query": "Charizard PSA 10", "max_pages": 2})

Direct agent use:
    from ebay_scraper.agent import EbayScrapingAgent
"""

from .agent import EbayScrapingAgent
from .runner import run

__all__ = ["EbayScrapingAgent", "run"]
__version__ = "1.0.0"
