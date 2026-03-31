import sqlite3
import os

DB_PATH = 'ebay_scraper/tracker.db'

def inspect(card_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM tracked_cards WHERE id = ?", (card_id,))
    card = cur.fetchone()
    print(f"Card: {dict(card) if card else 'None'}")
    
    cur.execute("SELECT price FROM sold_listings WHERE card_id = ?", (card_id,))
    listings = cur.fetchall()
    print(f"Listings count: {len(listings)}")
    prices = [r['price'] for r in listings if r['price'] is not None]
    print(f"Prices count: {len(prices)}")
    if prices:
        print(f"Min: {min(prices)}, Max: {max(prices)}, Avg: {sum(prices)/len(prices)}")
    
    conn.close()

if __name__ == "__main__":
    inspect(11)
    inspect(1)
