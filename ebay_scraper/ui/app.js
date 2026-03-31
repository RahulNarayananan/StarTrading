/* app.js — PokéPrice SPA logic */

// ── State ─────────────────────────────────────────────────────────────────
let currentQuery = '';
let currentPages = 1;
let csvFilename = null;
let priceChart = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function showState(id) {
  document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function fmt(num) {
  if (num == null) return '—';
  return '$' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function gradeBadgeClass(grader) {
  const map = { PSA: 'badge-psa', CGC: 'badge-cgc', BGS: 'badge-bgs', SGC: 'badge-sgc', HGA: 'badge-bgs' };
  return map[grader?.toUpperCase()] || 'badge-kw';
}

function setQuery(q) {
  document.getElementById('search-input').value = q;
  document.getElementById('search-input').focus();
}

function goHome() {
  showState('state-search');
  document.getElementById('search-input').value = currentQuery;
}

// ── Render helpers ────────────────────────────────────────────────────────
function renderBadges(item) {
  const parts = [];
  if (item.grader && item.grade) {
    parts.push(`<span class="badge ${gradeBadgeClass(item.grader)}">${item.grader} ${item.grade}</span>`);
  }
  (item.keywords || []).forEach(kw => {
    parts.push(`<span class="badge badge-kw">${kw}</span>`);
  });
  if (item.sponsored) {
    parts.push(`<span class="badge badge-sponsored">Sponsored</span>`);
  }
  return parts.join('');
}

function renderPreviewCard(item) {
  const hasImg = item.image_url && item.image_url !== 'N/A' && !item.image_url.includes('placeholder');
  const thumbHTML = hasImg
    ? `<img class="card-thumb" src="${item.image_url}" alt="card" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-thumb-placeholder" style="display:none">🃏</div>`
    : `<div class="card-thumb-placeholder">🃏</div>`;

  return `
    <a class="preview-card" href="${item.link}" target="_blank" rel="noopener">
      ${thumbHTML}
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-badges">${renderBadges(item)}</div>
      </div>
      <div class="card-price">${item.price_str || fmt(item.price)}</div>
      <div class="card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
    </a>`;
}

function renderFilterTags(filters) {
  const el = document.getElementById('filter-tags');
  const tags = [];
  if (filters.grader) tags.push(filters.grader);
  if (filters.grade) tags.push(`Grade ${filters.grade}`);
  (filters.keywords || []).forEach(k => tags.push(k));
  el.innerHTML = tags.map(t => `<span class="filter-tag">${t}</span>`).join('');
}

function renderResultsTable(items) {
  const tbody = document.getElementById('results-body');
  const thead = document.getElementById('results-head');

  // Update header to include cross-check column
  if (thead) {
    thead.innerHTML = `<tr>
          <th class="td-num">#</th>
          <th class="td-title">TITLE</th>
          <th>GRADE</th>
          <th class="td-price">PRICE</th>
          <th>CHECK</th>
          <th class="td-link">LINK</th>
        </tr>`;
  }

  tbody.innerHTML = items.map((item, i) => {
    const sim = item.similarity != null ? Math.round(item.similarity * 100) : null;
    const matched = (item.matched || []).join(', ') || '—';
    const missing = (item.missing || []).join(', ') || 'none';
    const passed = item.similarity >= 1.0;
    const checkBadge = sim != null
      ? `<span class="sim-badge ${passed ? 'sim-pass' : 'sim-warn'}"
                    title="✅ Matched: ${matched}&#10;❌ Missing: ${missing}">
                 ${passed ? '✅' : '⚠️'} ${sim}%
               </span>`
      : '—';

    // Price cell: show USD value + original currency badge if converted
    const currency = item.price_currency || 'USD';
    const currencyBadge = currency !== 'USD'
      ? ` <span class="currency-badge" title="Original: ${item.price_str}">${currency}</span>`
      : '';
    const priceDisplay = item.price != null
      ? fmt(item.price) + currencyBadge
      : (item.price_str || '—');

    return `<tr>
          <td class="td-num">${i + 1}</td>
          <td class="td-title">
            <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
          </td>
          <td>${item.grader && item.grade
        ? `<span class="badge ${gradeBadgeClass(item.grader)}">${item.grader} ${item.grade}</span>`
        : '<span style="color:var(--muted)">—</span>'}</td>
          <td class="td-price">${priceDisplay}</td>
          <td class="td-check">${checkBadge}</td>
          <td class="td-link"><a href="${item.link}" target="_blank" rel="noopener">View ↗</a></td>
        </tr>`;
  }).join('');
}


// ── API calls ─────────────────────────────────────────────────────────────
async function doPreview(query) {
  currentQuery = query;
  showState('state-loading');
  document.getElementById('loading-text').textContent = 'Searching eBay…';

  try {
    const res = await fetch('/search/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Preview failed');
    const data = await res.json();

    // Populate preview
    document.getElementById('preview-title').textContent = `"${query}"`;
    document.getElementById('preview-list').innerHTML =
      data.items.length
        ? data.items.map(renderPreviewCard).join('')
        : '<p style="color:var(--muted);padding:1rem">No results found. Try a different query.</p>';

    showState('state-preview');
  } catch (err) {
    alert('Error: ' + err.message);
    showState('state-search');
  }
}

async function confirmScrape() {
  showState('state-loading');
  document.getElementById('loading-text').textContent = 'Scraping all available pages…';
  document.getElementById('loading-sub').textContent = 'This may take a minute — eBay pagination auto-detected';

  try {
    const res = await fetch('/search/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentQuery }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Scrape failed');
    const data = await res.json();

    // Stats
    const s = data.stats;
    document.getElementById('stat-min').textContent = fmt(s.min);
    document.getElementById('stat-avg').textContent = fmt(s.mean);
    document.getElementById('stat-max').textContent = fmt(s.max);
    document.getElementById('stat-count').textContent = s.count;

    // Header
    document.getElementById('results-title').textContent = `"${currentQuery}"`;
    document.getElementById('results-sub').textContent =
      `${data.total_scraped} scraped  ·  ${s.count} matched`;

    // Filter tags
    renderFilterTags(data.filters_detected || {});

    // Main matched table
    renderResultsTable(data.items || []);

    // Price Timeline Chart
    renderPriceChart(data.items || []);

    // Cross-check: rejected items panel
    renderRejectedPanel(data.rejected || [], data.similarity_threshold || 1.0);

    // CSV
    csvFilename = data.csv_filename;

    showState('state-results');
  } catch (err) {
    alert('Error: ' + err.message);
    showState('state-preview');
  }
}

function renderRejectedPanel(rejected, threshold) {
  const wrap = document.getElementById('rejected-panel');
  if (!wrap) return;

  if (!rejected.length) {
    wrap.innerHTML = '';
    return;
  }

  const pct = Math.round(threshold * 100);
  const rows = rejected.map((item, i) => {
    const sim = item.similarity != null ? Math.round(item.similarity * 100) : 0;
    const matched = (item.matched || []).join(', ') || '—';
    const missing = (item.missing || []).join(', ') || '—';
    const isBundle = item.bundle;
    const bundleReason = item.bundle_reason || '';

    const scoreBadge = isBundle
      ? `<span class="sim-badge sim-bundle" title="${bundleReason}">🎁 BUNDLE</span>`
      : `<span class="sim-badge sim-warn" title="✅ Matched: ${matched}&#10;❌ Missing: ${missing}">⚠️ ${sim}%</span>`;

    const reason = isBundle
      ? `<span class="missing-tokens">Bundle: <strong>${bundleReason}</strong></span>`
      : `<span class="missing-tokens">Missing: <strong>${missing}</strong></span>`;

    return `<tr>
          <td class="td-num">${i + 1}</td>
          <td class="td-title">
            <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
          </td>
          <td class="td-price">${item.price_str || fmt(item.price)}</td>
          <td>${scoreBadge}</td>
          <td class="reject-reason">${reason}</td>
        </tr>`;
  }).join('');

  wrap.innerHTML = `
      <details class="rejected-details">
        <summary class="rejected-summary">
          <span>🔍 Cross-check: ${rejected.length} item${rejected.length > 1 ? 's' : ''} filtered out
            <span class="rejected-hint">(below ${pct}% match threshold — click to inspect)</span>
          </span>
        </summary>
        <div class="table-wrap" style="margin-top:0.75rem">
          <table class="results-table">
            <thead><tr>
              <th class="td-num">#</th>
              <th class="td-title">TITLE</th>
              <th class="td-price">PRICE</th>
              <th>SCORE</th>
              <th>MISSING TOKENS</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
}

function renderPriceChart(items) {
  const wrap = document.getElementById('chart-wrap');
  if (!wrap) return;

  // Filter items with valid prices & dates, sort oldest to newest for charting
  const valid = items
    .filter(i => i.price != null && i.sold_date_iso)
    .sort((a, b) => a.sold_date_iso.localeCompare(b.sold_date_iso));

  if (valid.length < 2) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  // Group by date to average prices if multiple sales on one day
  const byDate = {};
  valid.forEach(item => {
    const d = item.sold_date; // short human readable like "Mar 2, 2026"
    if (!byDate[d]) byDate[d] = { sum: 0, count: 0 };
    byDate[d].sum += item.price;
    byDate[d].count += 1;
  });

  const labels = Object.keys(byDate);
  const dataPoints = labels.map(lbl => Number((byDate[lbl].sum / byDate[lbl].count).toFixed(2)));

  const ctx = document.getElementById('price-chart').getContext('2d');
  if (priceChart) priceChart.destroy();

  // Chart.js global config for dark glass theme
  Chart.defaults.color = 'rgba(240, 240, 248, 0.45)';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Average Price ($)',
        data: dataPoints,
        borderColor: '#f5a623',
        backgroundColor: 'rgba(245, 166, 35, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#e84853',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(8, 8, 16, 0.85)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function (context) {
              return '$' + context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
          ticks: { maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
          beginAtZero: false,
          ticks: {
            callback: function (value) { return '$' + value; },
            maxTicksLimit: 6
          }
        }
      }
    }
  });
}

function downloadCSV() {
  if (!csvFilename) return;
  window.location.href = `/download/${csvFilename}`;
}

// ── Event listeners ───────────────────────────────────────────────────────
document.getElementById('search-form').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  if (q) doPreview(q);
});
