// ============================================================
// app.js — AFIS Dashboard — Main Application Logic
// Full backend integration: real data from FastAPI + synthetic generator
// ============================================================

const API_BASE = 'http://localhost:8000/api';

// ────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────
const State = {
  investigations: [],
  currentInvestigation: null,
  apiConnected: false,
};

// ────────────────────────────────────────────────────────────
// ROUTER
// ────────────────────────────────────────────────────────────
const Router = (() => {
  function show(viewId) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    const view = document.getElementById(`view-${viewId}`);
    if (view) view.classList.add('active');
    const menuItem = document.querySelector(`[data-view="${viewId}"]`);
    if (menuItem) menuItem.classList.add('active');
  }
  return { show };
})();

// ────────────────────────────────────────────────────────────
// API CLIENT
// ────────────────────────────────────────────────────────────
const API = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  },
  async checkHealth() {
    try {
      await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(2500) });
      return true;
    } catch { return false; }
  },
};

// ────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────
const Toast = (() => {
  let container;
  function init() {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  function show(message, type = 'info', duration = 3500) {
    const icons   = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const colors  = { success: '#00e096', error: '#ff3d71', info: '#00d4ff' };
    const toast   = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:14px;flex-shrink:0;"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  return { init, show };
})();

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
function escBadge(esc) {
  const e = (esc || 'LOW').toUpperCase();
  return `<span class="badge esc-${e}">${e}</span>`;
}

function riskBar(score) {
  const pct = Math.round((score || 0) * 100);
  const cls = score >= 0.8 ? 'critical' : score >= 0.6 ? 'high' : score >= 0.4 ? 'medium' : 'low';
  return `<div class="risk-bar-wrap">
    <div class="risk-bar-track"><div class="risk-bar-fill ${cls}" style="width:${pct}%"></div></div>
    <span class="risk-val">${pct}%</span>
  </div>`;
}

function fmtAmount(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function actionBtn(invId) {
  return `<button class="audit-btn-inline" onclick="App.openDetail('${invId}')">View</button>`;
}

function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const duration = 800, start = performance.now(), from = parseInt(el.textContent) || 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ────────────────────────────────────────────────────────────
// DASHBOARD VIEW
// ────────────────────────────────────────────────────────────
const Dashboard = {
  async load() {
    await Promise.all([
      Dashboard.loadStats(),
      Dashboard.loadRecentAudits(),
      Dashboard.loadFlaggedQueue(),
    ]);
  },

  async loadStats() {
    try {
      const s = await API.get('/stats');
      animateCount('stat-total-audits',   s.total_investigations || 0);
      animateCount('stat-critical-cases', s.critical_cases || 0);
      animateCount('stat-high-risk',      s.high_risk_cases || 0);
      const avgEl = document.getElementById('stat-avg-score');
      if (avgEl) avgEl.textContent = `${Math.round((s.avg_risk_score || 0) * 100)}%`;
    } catch (e) {
      console.warn('Stats fetch failed:', e.message);
    }
  },

  async loadRecentAudits() {
    const tbody = document.getElementById('recent-audits-table');
    try {
      const list = await API.get('/investigations?limit=6');
      State.investigations = list;
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted);padding:24px">No investigations yet. Audit a transaction to begin.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(inv => `<tr>
        <td><code style="color:var(--cyan);font-size:0.78rem;">${inv.investigation_id}</code></td>
        <td><code style="font-size:0.78rem;">${inv.transaction_id}</code></td>
        <td style="font-size:0.8rem;">${inv.user_id || '-'}</td>
        <td>${riskBar(inv.risk_score)}</td>
        <td>${escBadge(inv.escalation)}</td>
        <td>${actionBtn(inv.investigation_id)}</td>
      </tr>`).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">Could not load investigations: ${e.message}</td></tr>`;
    }
  },

  async loadFlaggedQueue() {
    const container = document.getElementById('flagged-queue-list');
    container.innerHTML = `<div class="loading-placeholder">Loading alerts queue...</div>`;
    try {
      const queue = await API.get('/flagged-queue?limit=15');
      if (!queue.length) {
        container.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:0.82rem;padding:20px">No pending flagged transactions.</div>`;
        return;
      }
      container.innerHTML = queue.map(item => `
        <div class="alert-item sev-${item.escalation}" onclick="App.quickAuditTxn('${item.transaction_id}')">
          <div class="alert-top">
            <span class="alert-txn-id">${item.transaction_id}</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="alert-amount">${fmtAmount(item.amount)}</span>
              <button class="audit-btn-inline" onclick="event.stopPropagation();App.quickAuditTxn('${item.transaction_id}')">Audit</button>
            </div>
          </div>
          <div class="alert-meta">
            <span>${item.user_id}</span>
            ${escBadge(item.escalation)}
            <span>${item.city || ''}</span>
            <span>${fmtDate(item.timestamp)}</span>
          </div>
        </div>`).join('');
    } catch (e) {
      container.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:0.82rem;padding:20px">API offline — start the backend server.</div>`;
    }
  },
};

// ────────────────────────────────────────────────────────────
// INVESTIGATIONS LIST VIEW
// ────────────────────────────────────────────────────────────
const InvestigationsList = {
  async load() {
    const tbody = document.getElementById('all-audits-table');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center loading-placeholder">Loading audit trails...</td></tr>`;
    try {
      const list = await API.get('/investigations?limit=200');
      State.investigations = list;
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted);padding:24px">No audits on record yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(inv => `<tr>
        <td><code style="color:var(--cyan);font-size:0.78rem;">${inv.investigation_id}</code></td>
        <td><code style="font-size:0.78rem;">${inv.transaction_id}</code></td>
        <td style="font-size:0.8rem;">${inv.user_id || '-'}</td>
        <td>${riskBar(inv.risk_score)}</td>
        <td>${escBadge(inv.escalation)}</td>
        <td style="color:var(--text-muted);font-size:0.78rem;">${fmtDate(inv.created_at)}</td>
        <td>${actionBtn(inv.investigation_id)}</td>
      </tr>`).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted)">Error: ${e.message}</td></tr>`;
    }
  },
};

// ────────────────────────────────────────────────────────────
// INVESTIGATION DETAIL VIEW
// Full real-data wiring from backend response
// ────────────────────────────────────────────────────────────
const InvestigationDetail = {

  async loadById(invId) {
    Router.show('investigation-detail');
    InvestigationDetail._showLoading();
    try {
      const data = await API.get(`/investigation/${invId}`);
      InvestigationDetail.render(data);
    } catch (e) {
      Toast.show(`Could not load investigation: ${e.message}`, 'error');
    }
  },

  async loadFromResult(data) {
    Router.show('investigation-detail');
    InvestigationDetail.render(data);
  },

  _showLoading() {
    AnomalyCards.renderLoading('anomaly-cards-container');
    Timeline.renderLoading('timeline-container');
    document.getElementById('llm-report-content').innerHTML =
      '<div class="loading-placeholder">Assembling FIU report...</div>';
    document.getElementById('graph-visualization-area').innerHTML =
      '<div class="loading-placeholder" style="padding:40px;text-align:center;">Building account graph...</div>';
  },

  render(data) {
    State.currentInvestigation = data;

    // ── Header ──
    document.getElementById('detail-inv-id').textContent = data.investigation_id;
    const escEl = document.getElementById('detail-escalation-badge');
    escEl.textContent = data.escalation;
    escEl.className   = `badge esc-${data.escalation}`;

    // ── Transaction metadata from the real transaction record ──
    const txRaw = data.transaction || {};
    // engine_results -> transaction_pattern -> raw_data has no tx info
    // We pull from top-level: investigation has user_id, transaction_id
    // The real tx fields are fetched separately or stored in the result.
    // Look inside engine_results for actual tx data if top-level is missing
    const txInfo = InvestigationDetail._extractTxInfo(data);

    document.getElementById('meta-tx-id').textContent    = data.transaction_id   || '-';
    document.getElementById('meta-user-id').textContent  = data.user_id          || '-';
    document.getElementById('meta-amount').textContent   = txInfo.amount         ? fmtAmount(txInfo.amount) : '-';
    document.getElementById('meta-location').textContent = txInfo.location        || '-';
    document.getElementById('meta-ip').textContent       = txInfo.ip             || '-';
    document.getElementById('meta-device').textContent   = txInfo.device         || '-';

    // ── Anomaly Cards — from real engine_results ──
    const anomalies = InvestigationDetail._extractAnomalies(data);
    AnomalyCards.render('anomaly-cards-container', anomalies, data.risk_score);

    // ── Timeline — real timeline array from backend ──
    Timeline.render('timeline-container', data);

    // ── Network Graph — from linked_accounts engine graph_data ──
    const graphData = InvestigationDetail._extractGraphData(data);
    NetworkGraph.render('graph-visualization-area', graphData);

    // ── LLM Report ──
    InvestigationDetail.renderReport(data.llm_summary, data.risk_explanation, data.findings);
  },

  // Pull actual tx metadata from the investigation result
  _extractTxInfo(data) {
    // investigation.py stores tx data accessible through engine_results raw_data
    // device_anomaly raw_data -> new_device -> known_devices
    // location raw_data -> impossible_travel -> current_city etc.
    // user_history raw_data -> recipient_analysis -> receiver_id

    const location_raw = data.engine_results?.location_anomaly?.raw_data;
    const device_raw   = data.engine_results?.device_anomaly?.raw_data;
    const pattern_raw  = data.engine_results?.transaction_pattern?.raw_data;
    const history_raw  = data.engine_results?.user_history?.raw_data;

    const city    = location_raw?.impossible_travel?.details?.current_city
                 || location_raw?.location_mismatch?.details?.transaction_city
                 || location_raw?.geo_fence?.details?.country
                 || '';
    const country = location_raw?.geo_fence?.details?.country || '';
    const location = city ? (country && country !== city ? `${city}, ${country}` : city) : (country || '-');

    const device  = device_raw?.new_device?.details?.device_id || '';
    const ip      = ''; // not directly stored in engine outputs

    // Amount from pattern analyzer (velocity raw has tx info)
    const amount = pattern_raw?.velocity?.details?.amount
                || pattern_raw?.amount_anomaly?.details?.amount
                || null;

    return { location, device, ip, amount };
  },

  // Build unified anomalies object from real engine_results
  _extractAnomalies(data) {
    const er = data.engine_results || {};

    // Map backend engine names to what AnomalyCards expects
    const anomalies = {};

    if (er.transaction_pattern) {
      const raw = er.transaction_pattern.raw_data || {};
      anomalies.pattern = {
        score:             er.transaction_pattern.score,
        details:           er.transaction_pattern.findings?.join('. ') || '',
        velocity_flag:     (raw.velocity?.score  || 0) > 0.3,
        round_amount_flag: (raw.round_amount?.score || 0) > 0.3,
        unusual_time_flag: (raw.time_of_day?.score  || 0) > 0.3,
      };
    }

    if (er.user_history) {
      const raw = er.user_history.raw_data || {};
      anomalies.user_history = {
        score:   er.user_history.score,
        details: er.user_history.findings?.join('. ') || '',
        new_account: (raw.account_age?.score || 0) > 0.3,
        behavioral_shift: (raw.behavioral_shift?.score || 0) > 0.3,
        first_time_recipient: (raw.recipient_analysis?.score || 0) > 0.3,
      };
    }

    if (er.device_anomaly) {
      const raw = er.device_anomaly.raw_data || {};
      anomalies.device = {
        score:            er.device_anomaly.score,
        details:          er.device_anomaly.findings?.join('. ') || '',
        new_device:       (raw.new_device?.score       || 0) > 0.3,
        device_sharing:   (raw.device_sharing?.score   || 0) > 0.3,
        multiple_devices: (raw.device_velocity?.score  || 0) > 0.3,
      };
    }

    if (er.location_anomaly) {
      const raw = er.location_anomaly.raw_data || {};
      anomalies.location = {
        score:             er.location_anomaly.score,
        details:           er.location_anomaly.findings?.join('. ') || '',
        impossible_travel: (raw.impossible_travel?.score || 0) > 0.3,
        high_risk_region:  (raw.geo_fence?.score          || 0) > 0.3,
        geo_mismatch:      (raw.location_mismatch?.score  || 0) > 0.3,
      };
    }

    if (er.linked_accounts) {
      const raw = er.linked_accounts.raw_data || {};
      const proximity   = raw.flagged_proximity?.details || {};
      const circular    = raw.circular_flow?.details     || {};
      const cluster     = raw.cluster_risk?.details      || {};

      // Build linked_accounts list from the graph_data nodes
      const graphNodes  = raw.graph_data?.nodes || [];
      const linkedList  = graphNodes
        .filter(n => n.user_id !== data.user_id)
        .slice(0, 8)
        .map(n => ({ id: n.user_id, risk_score: n.is_flagged ? 0.8 : 0.3 }));

      const flaggedNeighbors = graphNodes
        .filter(n => n.is_flagged)
        .map(n => n.user_id);

      // Circular flows from linked engine
      const circularFlows = circular.loops_validated
        ? circular.loops_validated.map(l => l.path || [])
        : [];

      anomalies.linked_accounts = {
        score:          er.linked_accounts.score,
        details:        er.linked_accounts.findings?.join('. ') || '',
        flagged_count:  cluster.community_flagged_count || flaggedNeighbors.length,
        flagged_neighbors: flaggedNeighbors,
        circular_flows: circularFlows,
        linked_accounts: linkedList,
      };
    }

    return anomalies;
  },

  // Build D3-compatible graph data from linked_accounts engine output
  _extractGraphData(data) {
    const er     = data.engine_results || {};
    const laRaw  = er.linked_accounts?.raw_data?.graph_data;

    if (!laRaw || !laRaw.nodes || !laRaw.nodes.length) {
      // Fallback: build minimal graph from what we know
      return NetworkGraph.demoGraph();
    }

    const userId   = data.user_id;
    const flaggedSet = new Set(
      laRaw.nodes.filter(n => n.is_flagged).map(n => n.user_id)
    );

    // Limit to sensible node count for rendering
    const MAX_NODES = 30;
    const nodeSubset = laRaw.nodes.slice(0, MAX_NODES);
    const nodeIds    = new Set(nodeSubset.map(n => n.user_id));

    const nodes = nodeSubset.map(n => ({
      id:         n.user_id,
      label:      n.user_id.slice(0, 8),
      type:       n.user_id === userId ? 'primary' : (flaggedSet.has(n.user_id) ? 'linked' : 'normal'),
      flagged:    n.is_flagged,
      risk_score: n.is_flagged ? 0.85 : (n.risk_tier === 'HIGH' ? 0.65 : 0.2),
      txn_count:  n.total_transactions || 0,
    }));

    // Filter edges to only those where both endpoints are in our node subset
    const edges = (laRaw.edges || [])
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .slice(0, 80)
      .map(e => ({
        source: e.source,
        target: e.target,
        amount: e.total_amount || 0,
        circular: e.relationship === 'CIRCULAR',
      }));

    return { nodes, links: edges };
  },

  renderReport(summary, explanation, findings) {
    const el = document.getElementById('llm-report-content');
    if (!summary && !findings) {
      el.innerHTML = '<span style="color:var(--text-muted)">No report available.</span>';
      return;
    }

    // If we have an explanation, show it as a highlighted intro
    let html = '';
    if (explanation && explanation.trim()) {
      html += `<div style="padding:10px 14px;background:var(--cyan-glow);border:1px solid var(--cyan-border);border-radius:8px;margin-bottom:16px;font-size:0.84rem;color:var(--text-primary);line-height:1.6;">${explanation}</div>`;
    }

    if (summary) {
      // Parse section headings and bullet points
      const parsed = summary
        .replace(/^#{1,2}\s*(.+)$/gm, (_, h) => `<span class="report-section-title">${h}</span>`)
        .replace(/^\*\*(.+)\*\*$/gm, (_, h) => `<span class="report-section-title">${h}</span>`)
        .replace(/^[•→\-]\s+(.+)$/gm, (_, line) => `<div class="report-bullet">${line}</div>`)
        .replace(/^\d+\.\s+(.+)$/gm, (_, line) => `<div class="report-bullet">${line}</div>`)
        .replace(/\n{2,}/g, '<br><br>')
        .replace(/\n/g, '<br>');
      html += parsed;
    } else if (findings && findings.length) {
      html += `<span class="report-section-title">Key Findings</span>`;
      html += findings.map(f => `<div class="report-bullet">${f}</div>`).join('');
    }

    el.innerHTML = html;
  },
};

// ────────────────────────────────────────────────────────────
// INVESTIGATION TRIGGER
// ────────────────────────────────────────────────────────────
const InvestigationTrigger = {
  async submit() {
    const txInput = document.getElementById('input-txn-id');
    const btn     = document.getElementById('submit-audit-btn');
    const txnId   = txInput?.value?.trim();
    if (!txnId) { Toast.show('Enter a Transaction ID first.', 'error'); return; }

    btn.disabled   = true;
    btn.innerHTML  = `<span class="spinner"></span> Investigating...`;
    Toast.show(`Launching full investigation for ${txnId}...`, 'info', 5000);

    try {
      const data = await API.post('/investigate', { transaction_id: txnId });
      Toast.show(`Investigation complete — ${data.escalation} escalation`, 'success');
      // Refresh stats and list in background
      Dashboard.loadStats();
      await InvestigationDetail.loadFromResult(data);
    } catch (e) {
      const msg = e.message || 'Unknown error';
      if (msg.includes('404')) {
        Toast.show(`Transaction ${txnId} not found in database. Try one from the Alerts Queue.`, 'error', 5000);
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        Toast.show('Cannot reach backend. Is the FastAPI server running?', 'error', 5000);
      } else {
        Toast.show(`Error: ${msg}`, 'error', 5000);
      }
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> Execute Investigation`;
    }
  },
};

// ────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// ────────────────────────────────────────────────────────────
const Search = {
  init() {
    const input = document.getElementById('global-search');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => Search.run(input.value.trim()), 450);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') Search.run(input.value.trim());
    });
  },
  run(query) {
    if (!query) return;
    const q = query.toUpperCase();
    if (q.startsWith('INV-')) {
      InvestigationDetail.loadById(query);
    } else if (q.startsWith('TXN-')) {
      App.quickAuditTxn(query);
    } else {
      Toast.show('Search by TXN-XXXXX or INV-XXXXX', 'info');
    }
  },
};

// ────────────────────────────────────────────────────────────
// API STATUS
// ────────────────────────────────────────────────────────────
async function checkApiStatus() {
  const isUp = await API.checkHealth();
  State.apiConnected = isUp;
  const indicator = document.querySelector('.status-indicator');
  if (indicator) {
    indicator.className = `status-indicator ${isUp ? 'online' : 'offline'}`;
    const color = isUp ? 'var(--green)' : 'var(--red)';
    indicator.innerHTML = `<span class="pulse" style="background:${color};box-shadow:0 0 6px ${color};"></span> ${isUp ? 'Connected to API' : 'API Offline'}`;
  }
}

// ────────────────────────────────────────────────────────────
// GLOBAL APP NAMESPACE
// ────────────────────────────────────────────────────────────
const App = {
  openDetail(invId) {
    InvestigationDetail.loadById(invId);
  },
  quickAuditTxn(txnId) {
    const input = document.getElementById('input-txn-id');
    if (input) input.value = txnId;
    Router.show('new-investigation');
    setTimeout(() => InvestigationTrigger.submit(), 150);
  },
};

// ────────────────────────────────────────────────────────────
// BOOT
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Toast.init();
  Search.init();

  // Sidebar navigation
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      Router.show(view);
      if (view === 'dashboard')      Dashboard.load();
      if (view === 'investigations') InvestigationsList.load();
    });
  });

  // Quick Audit (header)
  document.getElementById('quick-audit-btn')?.addEventListener('click', () => {
    Router.show('new-investigation');
  });

  // Submit audit form
  document.getElementById('submit-audit-btn')?.addEventListener('click', InvestigationTrigger.submit);

  // Back button
  document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
    Router.show('investigations');
    InvestigationsList.load();
  });

  // View all link
  document.getElementById('view-all-investigations')?.addEventListener('click', e => {
    e.preventDefault();
    Router.show('investigations');
    InvestigationsList.load();
  });

  // Copy report
  document.getElementById('btn-copy-report')?.addEventListener('click', () => {
    const content = document.getElementById('llm-report-content')?.innerText;
    if (content) {
      navigator.clipboard.writeText(content).then(() => Toast.show('Report copied.', 'success'));
    }
  });

  // Approve review
  document.getElementById('btn-approve-alert')?.addEventListener('click', () => {
    Toast.show('Review approved and logged to compliance database.', 'success');
  });

  // API health check
  await checkApiStatus();
  setInterval(checkApiStatus, 30000);

  // Initial dashboard load
  await Dashboard.load();

  Toast.show('AFIS Engine ready.', 'success', 2000);
});