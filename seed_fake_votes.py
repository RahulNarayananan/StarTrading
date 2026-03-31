import asyncio
import aiosqlite
import random

async def seed():
    async with aiosqlite.connect("ebay_scraper/tracker.db") as db:
        cur = await db.execute("SELECT id FROM prediction_markets")
        markets = await cur.fetchall()
        for (m_id,) in markets:
            cur = await db.execute("SELECT COUNT(*) FROM predictions WHERE market_id=?", (m_id,))
            (count,) = await cur.fetchone()
            if count < 50:
                total = random.randint(80, 320)
                up_pct = random.uniform(0.3, 0.7)
                up_votes = int(total * up_pct)
                down_votes = total - up_votes
                for _ in range(up_votes):
                    await db.execute("INSERT INTO predictions (market_id, user_id, direction, amount) VALUES (?, 'sim', 'UP', 1)", (m_id,))
                for _ in range(down_votes):
                    await db.execute("INSERT INTO predictions (market_id, user_id, direction, amount) VALUES (?, 'sim', 'DOWN', 1)", (m_id,))
                print(f"Seeded {total} simulated votes for market {m_id}")
        await db.commit()

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(seed())
