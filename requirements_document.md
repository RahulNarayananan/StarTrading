# Software Requirements Specification: StarTrading

## 1. Project Overview
**StarTrading** is a professional-grade TCG (Trading Card Game) analytics and tracking platform. It provides "Bloomberg-style" market intelligence for collectors and investors, specifically focusing on Pokémon cards. The system aggregates data from eBay sold listings, performs deep analytics, and leverages local LLMs (Llama 3.1) to generate strategic insights.

## 2. Functional Requirements

### 2.1 Data Collection (eBay Scraper)
- **Stealth Scraping**: Must use headless browser automation (Playwright) with stealth plugins to bypass anti-scraping measures.
- **Filter Precision**: Automatically apply "Sold" and "Completed" filters to ensure data reflects actual transactions.
- **Extraction**: Extract listing title, price (converted to USD/base currency), sale date, image URL, and listing URL.
- **Metadata Parsing**: Automatically parse card grader (PSA, BGS, CGC, etc.), numeric grade, and card numbers from titles using regex.
- **Data Quality**: 
  - **Bundle Detection**: Identify and filter out multi-card or "lot" listings to avoid skewing individual card price data.
  - **Similarity Matching**: Use Jaccard similarity to ensure listings match the search query.

### 2.2 Market Analytics
- **Price Metrics**: Calculate 24h and 30d averages, minimums, and maximums.
- **Volatility Tracking**: Calculate standard deviation of prices over a 30-day window.
- **Volume Monitoring**: Track the number of sales over a 7-day period.
- **Trend Analysis**: Determine percentage price movement relative to a 24h or 30d baseline.
- **Historical Snapshots**: Periodically save summary statistics to track market trends over time.

### 2.3 Artificial Intelligence (LLM Agent)
- **Market Intelligence**: Generate concise (3-4 sentence) analysis for specific cards, including momentum and buy/sell/hold sentiment.
- **Professor Oak Weekly Report**: Generate a JSON-structured weekly report providing a high-level portfolio overview, top movers, and strategic advice.
- **Local Inference**: Use Ollama (Llama 3.1) for on-premise, privacy-conscious data processing.

### 2.4 Prediction Markets
- **Sentiment Pooling**: Allow users to forecast future price movements (UP or DOWN).
- **Sentiment Analytics**: Visualize market expectations and total pooled sentiment.

### 2.5 User Interface
- **Dashboard**: High-level overview of monitored cards and market health.
- **Card Deep Dive**: Detailed view with price charts, recent listings, and AI-generated insights.
- **Vault**: Portfolio management for tracked assets.
- **Weekly Report View**: Dedicated page for viewing AI-generated market summaries.
- **Events/Forecasts**: specialized views for prediction markets and community events.

## 3. Non-Functional Requirements

### 3.1 Performance
- **Asynchronicity**: All database and network operations must be non-blocking.
- **Scraping Efficiency**: Support paginated scraping (up to 20 pages) with polite delays.

### 3.2 Reliability & Persistence
- **Database**: Use SQLite with WAL mode for robust, concurrent data storage.
- **Error Logging**: Maintain detailed logs for scraper crashes and server errors.

### 3.3 Scalability
- **Modularity**: Separation between the scraping agent, database layer, server API, and frontend components.

## 4. Technical Stack
- **Backend**: Python 3.x, FastAPI, Aiosqlite, Playwright, HTTPX.
- **Frontend**: React, Vite, Framer Motion, Lucide Icons, Tailwind CSS.
- **AI Engine**: Ollama (Llama 3.1).
- **Storage**: SQLite 3.
