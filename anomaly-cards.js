// ============================================================
// anomaly-cards.js — Engine Risk Breakdown Cards
// Renders glassmorphic anomaly cards for each detection engine
// ============================================================

const AnomalyCards = (() => {

  const CARD_CONFIG = {
    pattern: {
      title: 'Transaction Pattern',
      icon: 'fa-chart-line',
      accent: '#00d4ff',
    },
    user_history: {
      title: 'User History',
      icon: 'fa-user-clock',
      accent: '#a855f7',
    },
    device: {
      title: 'Device Anomaly',
      icon: 'fa-mobile-screen',
      accent: '#ffb300',
    },
    location: {
      title: 'Location Anomaly',
      icon: 'fa-location-dot',
      accent: '#f97316',
    },
    linked_accounts: {
      title: 'Linked Accounts',
      icon: 'fa-diagram-project',
      accent: '#ff3d71',
    },
  };

  function scoreClass(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  function renderCard(key, engineData, cfg) {
    const score   = engineData?.score ?? 0;
    const details = engineData?.details || 'No anomalies detected.';
    const pct     = Math.round(score * 100);
    const cls     = scoreClass(score);

    const card = document.createElement('div');
    card.className = 'anomaly-card';
    card.style.setProperty('--card-accent', cfg.accent);

    // Sub-details if available (engine-specific fields)
    let extras = '';
    if (key === 'device' && engineData) {
      if (engineData.new_device)         extras += '<span class="report-bullet">New device detected on account</span>';
      if (engineData.device_sharing)     extras += '<span class="report-bullet">Device shared with other users</span>';
      if (engineData.multiple_devices)   extras += '<span class="report-bullet">Multiple devices in short window</span>';
    }
    if (key === 'location' && engineData) {
      if (engineData.impossible_travel)  extras += '<span class="report-bullet">Impossible travel speed detected</span>';
      if (engineData.high_risk_region)   extras += '<span class="report-bullet">High-risk geographic region</span>';
      if (engineData.geo_mismatch)       extras += '<span class="report-bullet">Device-location mismatch</span>';
    }
    if (key === 'linked_accounts' && engineData) {
      if (engineData.flagged_count)      extras += `<span class="report-bullet">${engineData.flagged_count} flagged neighbours</span>`;
      if (engineData.circular_flows?.length) extras += '<span class="report-bullet">Circular money flow detected</span>';
    }
    if (key === 'pattern' && engineData) {
      if (engineData.velocity_flag)      extras += '<span class="report-bullet">High velocity transactions</span>';
      if (engineData.round_amount_flag)  extras += '<span class="report-bullet">Suspicious round amounts</span>';
      if (engineData.unusual_time_flag)  extras += '<span class="report-bullet">Unusual transaction time</span>';
    }

    card.innerHTML = `
      <div class="ac-header">
        <div class="ac-title">
          <i class="fa-solid ${cfg.icon}"></i>
          ${cfg.title}
        </div>
        <div class="ac-score">${pct}<span style="font-size:0.7rem;font-weight:500;opacity:0.6;">%</span></div>
      </div>
      <div class="ac-gauge">
        <div class="ac-gauge-fill ${cls}" style="width: 0%;" data-target="${pct}"></div>
      </div>
      <div class="ac-details">
        ${extras || `<span>${details}</span>`}
      </div>
    `;

    return card;
  }

  function render(containerId, anomalies, riskScore) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    Object.entries(CARD_CONFIG).forEach(([key, cfg]) => {
      const engineData = anomalies?.[key];
      const card = renderCard(key, engineData, cfg);
      container.appendChild(card);
    });

    // Update composite score display
    const compositeEl = document.getElementById('composite-score-percentage');
    if (compositeEl) {
      compositeEl.textContent = `${Math.round((riskScore || 0) * 100)}%`;
      compositeEl.style.color = riskScore >= 0.8 ? '#ff3d71' : riskScore >= 0.6 ? '#f97316' : riskScore >= 0.4 ? '#ffb300' : '#00e096';
    }

    // Animate gauges after a tiny delay so transition fires
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.querySelectorAll('.ac-gauge-fill').forEach(fill => {
          const target = fill.getAttribute('data-target');
          fill.style.width = `${target}%`;
        });
      });
    });
  }

  function renderLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    Object.values(CARD_CONFIG).forEach(cfg => {
      const card = document.createElement('div');
      card.className = 'anomaly-card';
      card.style.setProperty('--card-accent', '#8892b0');
      card.innerHTML = `
        <div class="ac-header">
          <div class="ac-title"><i class="fa-solid ${cfg.icon}"></i>${cfg.title}</div>
          <div class="ac-score" style="opacity:0.3">--</div>
        </div>
        <div class="ac-gauge"><div class="ac-gauge-fill" style="width:0%;background:#8892b0;"></div></div>
        <div class="ac-details loading-placeholder" style="padding:0;text-align:left;">Running analysis...</div>
      `;
      container.appendChild(card);
    });
  }

  return { render, renderLoading };
})();