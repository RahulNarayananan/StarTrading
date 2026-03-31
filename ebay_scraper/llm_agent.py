import json
import httpx
import asyncio

class OllamaAgent:
    def __init__(self, model: str = "llama3.1", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def generate_insight(self, card_name: str, listings: list) -> str:
        """
        Generates a market insight using local Llama 3.1.
        Listings should be a list of dicts with title, price, and date.
        """
        if not listings:
            return "No recent transaction data available for analysis."

        # Format context for the LLM
        history_text = "\n".join([
            f"- {l['sold_date_iso'] or 'Recent'}: {l['title']} | ${l['price']}"
            for l in listings[:20]
        ])

        prompt = f"""
You are an expert TCG (Trading Card Game) Market Analyst. 
Analyze the following recent eBay sold listings for "{card_name}":

{history_text}

Provide a concise "Market Intelligence" report (max 3-4 sentences). 
Focus on:
1. Short-term price momentum (Is it trending up, down, or stable?).
2. Any notable anomalies (e.g. a specific grade selling higher/lower than usual).
3. A "Buy/Sell/Hold" sentiment based on the volatility and volume.

Be professional, data-driven, and brief. Do not use markdown headers, just a single paragraph of text.
"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result.get("response", "Could not generate insight at this time.").strip()
        except Exception as e:
            return f"Analysis Offline: {str(e)}"

    async def generate_weekly_report(self, card_summaries: list) -> str:
        """
        Generates a global weekly report across multiple cards.
        card_summaries: list of dicts {name, price, trend, high_24h, low_24h}
        """
        if not card_summaries:
            return "No card data available for a weekly report."

        # Format context for the LLM
        summary_text = "\n".join([
            f"- {c['display_name']}: ${c['last_price']} (Trend: {c['trend_30d']}%)"
            for c in card_summaries
        ])

        prompt = f"""
You are Professor Oak, a legendary Pokémon researcher and TCG market strategist.
Generate a "Weekly Pokemon Market Research Report" as a JSON object based on the following portfolio data:

{summary_text}

The JSON MUST follow this structure:
{{
  "overview": "A high-level summary of the overall portfolio health (1-2 sentences).",
  "top_movers": [
    {{
      "name": "Card Name",
      "change": "Percentage change",
      "analysis": "Brief reason for the movement"
    }},
    ... (include top 2-3)
  ],
  "strategic_advice": "Specific 'Research Recommendations' (Buy/Sell/Hold) for the collector.",
  "lab_note": "A concluding thematic remark from the Pallet Town Lab."
}}

Ensure the response is ONLY the raw JSON object. Do not include any markdown formatting or extra text.
"""

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )
                response.raise_for_status()
                result = response.json()
                raw_text = result.get("response", "{}").strip()
                
                # Robustly extract JSON from potential markdown wrappers
                if "{" in raw_text:
                    start = raw_text.find("{")
                    end = raw_text.rfind("}") + 1
                    json_str = raw_text[start:end]
                    return json_str
                
                return raw_text
        except Exception as e:
            fallback = {
                "overview": f"Professor Oak is currently busy with other research: {str(e)}",
                "top_movers": [],
                "strategic_advice": "Consult personal analytics boards in the meantime.",
                "lab_note": "Laboratory systems are undergoing maintenance."
            }
            return json.dumps(fallback)

# Singleton-style accessor for the server
_agent = OllamaAgent()

async def get_market_insight(card_name: str, listings: list) -> str:
    return await _agent.generate_insight(card_name, listings)

async def get_weekly_report(card_summaries: list) -> str:
    return await _agent.generate_weekly_report(card_summaries)
