// ============================================================
// timeline.js — Investigation Trace Timeline Component
// Renders a vertical timeline of all engine findings
// ============================================================

const Timeline = (() => {

  const ENGINE_CONFIG = {
    transaction_pattern: {
      label: 'Transaction Pattern',
      color: '#00d4ff',
      icon: 'fa-chart-line',
    },
    user_history: {
      label: 'User History',
      color: '#a855f7',
      icon: 'fa-user-clock',
    },
    device_anomaly: {
      label: 'Device Analysis',
      color: '#ffb300',
      icon: 'fa-mobile-screen',
    },
    location_anomaly: {
      label: 'Location Analysis',
      color: '#f97316',
      icon: 'fa-location-dot',
    },
    linked_accounts: {
      label: 'Linked Accounts',
      color: '#ff3d71',
      icon: 'fa-diagram-project',
    },
    llm_summary: {
      label: 'AI Investigator',
      color: '#00e096',
      icon: 'fa-brain',
    },
    system: {
      label: 'System',
      color: '#8892b0',
      icon: 'fa-server',
    },
  };

  function formatTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  }

  // Build timeline events array from full investigation object
  function buildEvents(data) {
    const events = [];
    const base = new Date(data.timestamp || Date.now());

    const offset = (ms) => new Date(base.getTime() - ms).toISOString();

    // System start
    events.push({
      engine: 'system',
      finding: `Investigation ${data.investigation_id} initiated for transaction ${data.transaction_id}.`,
      time: offset(5000),
    });

    // Transaction pattern
    const tp = data.anomalies?.pattern;
    if (tp) {
      const findings = tp.details
        ? tp.details.split('.').filter(Boolean).slice(0, 2).map(s => s.trim())
        : [`Pattern anomaly score: ${(tp.score * 100).toFixed(0)}%`];
      findings.forEach((f, i) => {
        events.push({
          engine: 'transaction_pattern',
          finding: f + '.',
          time: offset(4200 - i * 300),
        });
      });
    }

    // User history
    const uh = data.anomalies?.user_history;
    if (uh) {
      events.push({
        engine: 'user_history',
        finding: uh.details || `User history risk: ${(uh.score * 100).toFixed(0)}%.`,
        time: offset(3400),
      });
    }

    // Device anomaly
    const da = data.anomalies?.device;
    if (da) {
      events.push({
        engine: 'device_anomaly',
        finding: da.details || `Device anomaly score: ${(da.score * 100).toFixed(0)}%.`,
        time: offset(2800),
      });
    }

    // Location anomaly
    const la = data.anomalies?.location;
    if (la) {
      events.push({
        engine: 'location_anomaly',
        finding: la.details || `Location anomaly score: ${(la.score * 100).toFixed(0)}%.`,
        time: offset(2200),
      });
    }

    // Linked accounts
    const lk = data.anomalies?.linked_accounts;
    if (lk) {
      events.push({
        engine: 'linked_accounts',
        finding: lk.details || `Receiver linked to ${lk.flagged_count || 'multiple'} flagged accounts.`,
        time: offset(1500),
      });
    }

    // Key findings from top level
    if (data.findings && data.findings.length) {
      data.findings.forEach((f, i) => {
        // Avoid duplicates with already-listed details
        const alreadyCovered = events.some(e => e.finding.toLowerCase().includes(f.toLowerCase().slice(0, 20)));
        if (!alreadyCovered) {
          events.push({
            engine: 'system',
            finding: f,
            time: offset(900 - i * 100),
          });
        }
      });
    }

    // LLM summary completion
    events.push({
      engine: 'llm_summary',
      finding: `AI investigation complete. Escalation decision: ${data.escalation || 'PENDING'}. Composite risk score: ${(data.risk_score * 100).toFixed(0)}%.`,
      time: data.timestamp || new Date().toISOString(),
    });

    // Sort chronologically
    events.sort((a, b) => new Date(a.time) - new Date(b.time));

    return events;
  }

  function render(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const events = buildEvents(data);

    events.forEach((event, idx) => {
      const cfg = ENGINE_CONFIG[event.engine] || ENGINE_CONFIG.system;

      const item = document.createElement('div');
      item.className = 'tl-item';
      item.style.setProperty('--tl-color', cfg.color);
      item.style.animationDelay = `${idx * 60}ms`;

      item.innerHTML = `
        <div class="tl-engine">
          <i class="fa-solid ${cfg.icon}" style="margin-right:5px;"></i>${cfg.label}
        </div>
        <div class="tl-finding">${event.finding}</div>
        <div class="tl-time">${formatTime(event.time)}</div>
      `;

      container.appendChild(item);
    });
  }

  // Render a placeholder loading timeline
  function renderLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    ['Transaction Pattern', 'User History', 'Device Analysis', 'Location Analysis', 'Linked Accounts', 'AI Investigator'].forEach((label, i) => {
      const item = document.createElement('div');
      item.className = 'tl-item';
      item.style.setProperty('--tl-color', '#8892b0');
      item.style.animationDelay = `${i * 80}ms`;
      item.innerHTML = `
        <div class="tl-engine">${label}</div>
        <div class="tl-finding loading-placeholder" style="padding:0;text-align:left;">Analyzing...</div>
      `;
      container.appendChild(item);
    });
  }

  return { render, renderLoading, buildEvents };
})();