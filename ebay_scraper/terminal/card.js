/**
 * card.js — Card detail page logic
 * Loaded only on card.html (after terminal.js)
 */

let _cardData = null;
let _priceChart = null;

// ── Init ────────────────────────────────────────────────────────────────────

async function loadCardDetail() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("detail-name").textContent = "Card not found";
    return;
  }

  try {
    const data = await fetch(`/tracker/card/${id}`).then(r => r.json());
    _cardData = data;

    // ── Header ────────────────────────────────────────────────────────────
    document.title = `PokéTerminal — ${data.display_name}`;
    document.getElementById("detail-name").textContent = data.display_name;

    const badges = document.getElementById("detail-badges");
    badges.innerHTML = `
      <span class="badge badge-query">${data.query}</span>
    `;

    document.getElementById("detail-last-price").textContent =
      data.last_price != null ? fmtUSD(data.last_price) : "No data yet";

    // Change vs 30d avg
    if (data.last_price != null && data.avg_30d != null) {
      const pct = ((data.last_price - data.avg_30d) / data.avg_30d) * 100;
      const cl  = pct > 0 ? "var(--green)" : pct < 0 ? "var(--red)" : "var(--text-dim)";
      const sym = pct > 0 ? "▲" : pct < 0 ? "▼" : "";
      document.getElementById("detail-price-change").innerHTML =
        `<span style="color:${cl}">${sym} ${Math.abs(pct).toFixed(1)}% vs 30d avg</span>`;
    }

    // ── Stats grid ────────────────────────────────────────────────────────
    setStatVal("s-high",   fmtUSD(data.high_24h));
    setStatVal("s-low",    fmtUSD(data.low_24h));
    setStatVal("s-avg",    fmtUSD(data.avg_30d));
    setStatVal("s-vol",    data.volatility_30d != null ? fmtUSD(data.volatility_30d) : "—");
    setStatVal("s-volume", data.volume_7d != null ? fmtNum(data.volume_7d) + " sales" : "—");
    setStatVal("s-pop",    data.pop_count != null ? fmtNum(data.pop_count) : "N/A");

    const arrow = trendArrow(data.trend_30d);
    const trendEl = document.getElementById("s-trend");
    if (trendEl) {
      trendEl.textContent = arrow.sym;
      trendEl.className = `stat-val ${arrow.cls}`;
    }

    // ── Chart ─────────────────────────────────────────────────────────────
    renderPriceChart(data.price_history || [], 30);

    // ── Sales table ───────────────────────────────────────────────────────
    renderSalesTable(data.listings || []);

    // Build ticker (shared)
    buildTicker();

    // Update status time
    const status = await fetch("/tracker/status").then(r => r.json());
    const statusEl = document.getElementById("status-time");
    if (statusEl) statusEl.textContent = status.last_run ? timeSince(status.last_run) : "Not yet run";

  } catch (e) {
    console.error("Card detail load failed:", e);
    document.getElementById("detail-name").textContent = "Error loading card";
  }
}

function setStatVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Price chart ─────────────────────────────────────────────────────────────

function renderPriceChart(history, days) {
  const canvas = document.getElementById("price-chart");
  if (!canvas) return;

  // Filter to requested days
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const filtered = history.filter(h => h.date >= cutoff);

  const labels = filtered.map(h => h.date);
  const prices = filtered.map(h => h.price);

  if (_priceChart) {
    _priceChart.destroy();
  }

  if (!prices.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const first = prices[0];
  const last  = prices[prices.length - 1];
  const isUp  = last >= first;
  const lineColor = isUp ? "#22c55e" : "#ef4444";
  const fillColor = isUp ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)";

  _priceChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Avg Sale Price (USD)",
        data: prices,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: prices.length < 20 ? 4 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: lineColor,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0d1117",
          borderColor: "#1e2a38",
          borderWidth: 1,
          titleColor: "#f59e0b",
          bodyColor: "#e2e8f0",
          padding: 12,
          callbacks: {
            label: ctx => " $" + ctx.raw.toLocaleString("en-US", { minimumFractionDigits: 2 }),
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#64748b",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxTicksLimit: 8,
          },
          grid: { color: "#1e2a38" },
        },
        y: {
          ticks: {
            color: "#64748b",
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            callback: v => "$" + v.toLocaleString("en-US"),
          },
          grid: { color: "#1e2a38" },
        }
      }
    }
  });
}

function setChartDays(days, btn) {
  // Update active button
  document.querySelectorAll(".ctoggle").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  // Re-render chart
  if (_cardData) renderPriceChart(_cardData.price_history || [], days);
}

// ── Sales table ─────────────────────────────────────────────────────────────

function renderSalesTable(listings) {
  const tbody = document.getElementById("sales-tbody");
  const countEl = document.getElementById("table-count");
  if (!tbody) return;

  if (countEl) countEl.textContent = `${listings.length} listings`;

  if (!listings.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">No sales data yet — tracker will populate on first run.</td></tr>`;
    return;
  }

  tbody.innerHTML = listings.map(l => `
    <tr>
      <td>${fmtDate(l.sold_date_iso) || fmtDate(l.scraped_at)}</td>
      <td style="max-width:400px; white-space:normal; line-height:1.4; font-size:11px;">${l.title}</td>
      <td class="num" style="color:${Number(l.price) > 0 ? 'var(--amber)' : 'var(--text-dim)'}">
        ${l.price != null ? fmtUSD(l.price) : "—"}
      </td>
      <td class="num" style="color:var(--text-dim);font-size:11px;">${l.currency || "USD"}</td>
      <td>
        ${l.link && l.link !== "N/A"
          ? `<a href="${l.link}" target="_blank" class="detail-link-btn" onclick="event.stopPropagation()">eBay ↗</a>`
          : "—"}
      </td>
    </tr>
  `).join("");
}

// ── Start ───────────────────────────────────────────────────────────────────

loadCardDetail();
