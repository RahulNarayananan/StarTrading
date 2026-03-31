/**
 * terminal.js — Shared utilities for PokéTerminal
 * Loaded on both index.html and card.html
 */

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtUSD(val) {
  if (val == null || val === "") return "—";
  return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(val) {
  if (val == null || val === "") return "—";
  return Number(val).toLocaleString("en-US");
}

function trendArrow(slope) {
  if (slope == null) return { cls: "flat", sym: "—" };
  if (slope > 0.5)  return { cls: "up",   sym: "▲" };
  if (slope < -0.5) return { cls: "down", sym: "▼" };
  return { cls: "flat", sym: "►" };
}

function fmtDate(isoStr) {
  if (!isoStr) return "—";
  return isoStr.slice(0, 10);
}

function timeSince(isoStr) {
  if (!isoStr) return "—";
  const diff = Date.now() - new Date(isoStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Ticker bar ──────────────────────────────────────────────────────────────

async function buildTicker() {
  try {
    const cards = await fetch("/tracker/cards").then(r => r.json());
    if (!cards || !cards.length) return;

    const inner = document.getElementById("ticker-inner");
    if (!inner) return;

    // Build items (duplicated for seamless loop)
    const makeItems = () => cards.map(c => {
      const price = c.last_price != null ? fmtUSD(c.last_price) : "N/A";
      const avg   = c.avg_30d;
      let cls = "flat", chg = "";
      if (c.last_price != null && avg != null) {
        const pct = ((c.last_price - avg) / avg) * 100;
        cls = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
        chg = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      }
      return `
        <span class="ticker-item" onclick="location.href='/terminal/card.html?id=${c.id}'">
          <span class="ticker-name">${c.display_name}</span>
          <span class="ticker-price">${price}</span>
          ${chg ? `<span class="ticker-change ${cls}">${chg}</span>` : ""}
        </span>`;
    }).join("");

    inner.innerHTML = makeItems() + makeItems(); // duplicate for seamless scroll

    // Update status time
    const statusEl = document.getElementById("status-time");
    if (statusEl) {
      const status = await fetch("/tracker/status").then(r => r.json());
      statusEl.textContent = status.last_run ? timeSince(status.last_run) : "Not yet run";
    }
  } catch (e) {
    console.warn("Ticker load failed:", e);
  }
}

// ── Dashboard table ─────────────────────────────────────────────────────────

let _allCards = [];

async function loadDashboard() {
  const tbody = document.getElementById("card-tbody");
  if (!tbody) return;

  try {
    const cards = await fetch("/tracker/cards").then(r => r.json());
    _allCards = cards;

    // Update summary strip
    const totalVol = cards.reduce((s, c) => s + (c.volume_7d || 0), 0);
    const allLastPrices = cards.map(c => c.last_price).filter(p => p != null);
    const highest = allLastPrices.length ? Math.max(...allLastPrices) : null;
    const setEl = id => { const el = document.getElementById(id); if (el) return el; return null; };

    const sumCards = setEl("sum-cards");     if (sumCards)   sumCards.textContent = cards.length;
    const sumList  = setEl("sum-listings");  if (sumList)    sumList.textContent = "—";  // placeholder
    const sumVol   = setEl("sum-volume");    if (sumVol)     sumVol.textContent = fmtNum(totalVol);
    const sumHigh  = setEl("sum-highest");   if (sumHigh)    sumHigh.textContent = fmtUSD(highest);

    // Update next-run chip
    const status = await fetch("/tracker/status").then(r => r.json());
    const chip = document.getElementById("next-run-chip");
    if (chip && status.last_run) {
      const nextMs = new Date(status.last_run + "Z").getTime() + 30 * 60 * 1000;
      const minsLeft = Math.max(0, Math.round((nextMs - Date.now()) / 60000));
      chip.textContent = status.running ? "Running now…" : `Next run: ~${minsLeft}m`;
    }

    if (!cards.length) {
      tbody.innerHTML = `<tr><td colspan="11" class="no-data">No cards tracked yet — add cards via the API.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    cards.forEach((c, idx) => {
      const arrow   = trendArrow(c.trend_30d);
      const hasData = c.last_price != null;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--text-dim);font-size:11px;">${idx + 1}</td>
        <td>
          <div class="card-name-cell">
            <span class="card-main-name">${c.display_name}</span>
            <span class="card-sub-name" style="font-size:10px;color:var(--text-dim)">${c.query}</span>
          </div>
        </td>
        <td class="num"><span class="price-val">${fmtUSD(c.last_price)}</span></td>
        <td class="num"><span class="price-high">${fmtUSD(c.high_24h)}</span></td>
        <td class="num"><span class="price-low">${fmtUSD(c.low_24h)}</span></td>
        <td class="num"><span class="price-avg">${fmtUSD(c.avg_30d)}</span></td>
        <td class="num">
          ${c.volatility_30d != null
            ? `<span class="vol-badge">${fmtUSD(c.volatility_30d)}</span>`
            : "—"}
        </td>
        <td class="num">${fmtNum(c.volume_7d)}</td>
        <td class="num">${c.pop_count != null ? fmtNum(c.pop_count) : "—"}</td>
        <td class="num sparkline-cell" id="spark-${c.id}"></td>
        <td><a class="detail-link-btn" href="/terminal/card.html?id=${c.id}">Detail →</a></td>
      `;
      tr.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        location.href = `/terminal/card.html?id=${c.id}`;
      });
      tbody.appendChild(tr);

      // Render sparkline
      if (c.price_history && c.price_history.length > 1) {
        renderSparkline(`spark-${c.id}`, c.price_history);
      } else {
        const cell = document.getElementById(`spark-${c.id}`);
        if (cell) {
          const arrow = trendArrow(c.trend_30d);
          cell.innerHTML = `<span class="trend-arrow ${arrow.cls}">${arrow.sym}</span>`;
        }
      }
    });

  } catch (e) {
    console.error("Dashboard load failed:", e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="no-data">Failed to load data — is the server running?</td></tr>`;
  }
}

// ── Sparkline ───────────────────────────────────────────────────────────────

function renderSparkline(cellId, history) {
  const cell = document.getElementById(cellId);
  if (!cell) return;

  const canvas = document.createElement("canvas");
  canvas.width  = 90;
  canvas.height = 36;
  cell.appendChild(canvas);

  const prices = history.map(h => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const first = prices[0];
  const last  = prices[prices.length - 1];
  const isUp  = last >= first;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map(h => h.date),
      datasets: [{
        data: prices,
        borderColor: isUp ? "#22c55e" : "#ef4444",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, min: min * 0.98, max: max * 1.02 },
      },
    }
  });
}

// ── Refresh button ──────────────────────────────────────────────────────────

async function triggerRefresh() {
  const btn = document.getElementById("refresh-btn");
  if (btn) btn.classList.add("spinning");
  try {
    await fetch("/tracker/refresh", { method: "POST" });
    setTimeout(() => {
      if (btn) btn.classList.remove("spinning");
      loadDashboard();
      buildTicker();
    }, 3000);
  } catch (e) {
    if (btn) btn.classList.remove("spinning");
  }
}

// ── Auto-refresh every 5 minutes ───────────────────────────────────────────

function startAutoRefresh() {
  setInterval(() => {
    loadDashboard();
    buildTicker();
  }, 5 * 60 * 1000);
}

// ── Init on dashboard page ──────────────────────────────────────────────────

if (document.getElementById("card-tbody")) {
  buildTicker();
  loadDashboard();
  startAutoRefresh();
}

// Always build ticker (shared between pages)
if (document.getElementById("ticker-inner") && !document.getElementById("card-tbody")) {
  buildTicker();
}
