// ============================================================
// network-graph.js — Linked Account Graph (D3.js v7)
// Force-directed visualization for account relationship mapping
// ============================================================

const NetworkGraph = (() => {
  let svg, simulation, g;
  let width = 0, height = 0;

  function buildTooltip() {
    let el = document.querySelector('.graph-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.className = 'graph-tooltip';
      document.body.appendChild(el);
    }
    return el;
  }

  function escalationColor(type, flagged) {
    if (flagged) return '#ff3d71';
    const map = {
      primary:  '#00d4ff',
      linked:   '#a855f7',
      receiver: '#ffb300',
      normal:   '#8892b0',
    };
    return map[type] || '#8892b0';
  }

  function render(containerId, graphData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous render
    container.innerHTML = '';

    width  = container.clientWidth  || 400;
    height = container.clientHeight || 360;

    const tooltip = buildTooltip();

    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', 'transparent');

    // Defs: glow filters
    const defs = svg.append('defs');

    ['cyan', 'red', 'purple', 'amber'].forEach(name => {
      const colors = { cyan: '#00d4ff', red: '#ff3d71', purple: '#a855f7', amber: '#ffb300' };
      const filter = defs.append('filter').attr('id', `glow-${name}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Arrow markers
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(255,255,255,0.15)');

    // Zoom container
    g = svg.append('g').attr('class', 'zoom-group');

    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', e => g.attr('transform', e.transform))
    );

    const { nodes, links } = graphData;

    // --- SIMULATION ---
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(32));

    // --- LINKS ---
    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.circular ? '#ff3d71' : 'rgba(255,255,255,0.12)')
      .attr('stroke-width', d => d.circular ? 2 : 1)
      .attr('stroke-dasharray', d => d.circular ? '5,3' : null)
      .attr('marker-end', 'url(#arrow)');

    // Edge labels (amount)
    const edgeLabel = g.append('g').attr('class', 'edge-labels')
      .selectAll('text')
      .data(links.filter(d => d.amount))
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('fill', 'rgba(136,146,176,0.7)')
      .attr('text-anchor', 'middle')
      .text(d => d.amount ? `₹${(d.amount / 1000).toFixed(0)}k` : '');

    // --- NODES ---
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .call(
        d3.drag()
          .on('start', dragStart)
          .on('drag',  dragged)
          .on('end',   dragEnd)
      )
      .on('mouseover', (event, d) => {
        tooltip.style.opacity = '1';
        tooltip.innerHTML = `
          <strong>${d.id}</strong><br>
          Type: ${d.type || 'unknown'}<br>
          ${d.flagged ? '<span style="color:#ff3d71">⚠ FLAGGED</span><br>' : ''}
          ${d.txn_count ? `Txns: ${d.txn_count}` : ''}
        `;
      })
      .on('mousemove', event => {
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top  = (event.clientY - 28) + 'px';
      })
      .on('mouseleave', () => { tooltip.style.opacity = '0'; });

    // Outer ring for flagged nodes
    node.filter(d => d.flagged)
      .append('circle')
      .attr('r', 22)
      .attr('fill', 'none')
      .attr('stroke', '#ff3d71')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.6)
      .style('animation', 'spin 4s linear infinite');

    // Main circle
    node.append('circle')
      .attr('r', d => d.type === 'primary' ? 18 : 13)
      .attr('fill', d => {
        const c = escalationColor(d.type, d.flagged);
        return `${c}22`;
      })
      .attr('stroke', d => escalationColor(d.type, d.flagged))
      .attr('stroke-width', d => d.type === 'primary' ? 2.5 : 1.5)
      .style('filter', d => d.flagged ? 'url(#glow-red)' : d.type === 'primary' ? 'url(#glow-cyan)' : 'none');

    // Node label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'primary' ? '0.35em' : '0.35em')
      .attr('font-size', d => d.type === 'primary' ? '9px' : '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '600')
      .attr('fill', d => escalationColor(d.type, d.flagged))
      .text(d => d.label || d.id.slice(0, 6));

    // Risk score sub-label
    node.filter(d => d.risk_score != null)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .attr('font-size', '7px')
      .attr('fill', 'rgba(136,146,176,0.7)')
      .text(d => `${Math.round(d.risk_score * 100)}%`);

    // --- TICK ---
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

      edgeLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Legend
    const legend = svg.append('g').attr('transform', `translate(12, ${height - 70})`);
    const items = [
      { color: '#00d4ff', label: 'Primary Account' },
      { color: '#a855f7', label: 'Linked Account' },
      { color: '#ffb300', label: 'Receiver' },
      { color: '#ff3d71', label: 'Flagged / Suspicious' },
    ];
    items.forEach((item, i) => {
      legend.append('circle').attr('cx', 6).attr('cy', i * 15).attr('r', 4)
        .attr('fill', item.color).attr('fill-opacity', 0.3)
        .attr('stroke', item.color).attr('stroke-width', 1.5);
      legend.append('text').attr('x', 14).attr('y', i * 15 + 4)
        .attr('font-size', '9px').attr('fill', 'rgba(136,146,176,0.8)')
        .attr('font-family', 'Inter, sans-serif')
        .text(item.label);
    });
  }

  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  // Build synthetic graph from investigation data
  function fromInvestigation(data) {
    const userId   = data.transaction?.user_id   || 'USR-000';
    const txnId    = data.transaction_id          || 'TXN-000';
    const receiver = data.transaction?.receiver   || 'USR-REC';

    const linkedAccounts = data.anomalies?.linked_accounts?.linked_accounts || [];
    const flaggedNeighbors = data.anomalies?.linked_accounts?.flagged_neighbors || [];

    const nodes = [];
    const links = [];
    const seen  = new Set();

    const addNode = (id, type, opts = {}) => {
      if (seen.has(id)) return;
      seen.add(id);
      nodes.push({ id, type, label: id.slice(0, 7), ...opts });
    };

    addNode(userId, 'primary', { risk_score: data.risk_score });
    addNode(receiver, 'receiver');

    // Main transaction edge
    links.push({ source: userId, target: receiver, amount: data.transaction?.amount });

    // Linked accounts
    linkedAccounts.forEach(acc => {
      addNode(acc.id || acc, 'linked', {
        flagged: flaggedNeighbors.includes(acc.id || acc),
        risk_score: acc.risk_score,
      });
      links.push({ source: userId, target: acc.id || acc });
    });

    // Flagged neighbors that weren't in linked
    flaggedNeighbors.forEach(n => {
      if (!seen.has(n)) {
        addNode(n, 'linked', { flagged: true });
        links.push({ source: receiver, target: n, circular: false });
      }
    });

    // Circular flow if detected
    if (data.anomalies?.linked_accounts?.circular_flows?.length) {
      const cf = data.anomalies.linked_accounts.circular_flows[0];
      if (cf.length >= 2) {
        for (let i = 0; i < cf.length - 1; i++) {
          addNode(cf[i], 'linked', { flagged: true });
          links.push({ source: cf[i], target: cf[i + 1], circular: true });
        }
        links.push({ source: cf[cf.length - 1], target: cf[0], circular: true });
      }
    }

    // If no linked accounts, add some synthetic neighbors for visual interest
    if (nodes.length < 4) {
      ['USR-A42', 'USR-B19'].forEach((id, i) => {
        addNode(id, 'linked');
        links.push({ source: [userId, receiver][i % 2], target: id });
      });
    }

    return { nodes, links };
  }

  // Demo graph for empty state
  function demoGraph() {
    return {
      nodes: [
        { id: 'USR-MAIN', type: 'primary', label: 'USR-MAIN', risk_score: 0.87 },
        { id: 'USR-A001', type: 'receiver', label: 'USR-A001' },
        { id: 'USR-B002', type: 'linked',   label: 'USR-B002', flagged: true, risk_score: 0.91 },
        { id: 'USR-C003', type: 'linked',   label: 'USR-C003' },
        { id: 'USR-D004', type: 'linked',   label: 'USR-D004', flagged: true },
        { id: 'USR-E005', type: 'normal',   label: 'USR-E005' },
      ],
      links: [
        { source: 'USR-MAIN', target: 'USR-A001', amount: 45000 },
        { source: 'USR-A001', target: 'USR-B002', amount: 38000, circular: false },
        { source: 'USR-B002', target: 'USR-MAIN', amount: 35000, circular: true },
        { source: 'USR-MAIN', target: 'USR-C003' },
        { source: 'USR-C003', target: 'USR-D004' },
        { source: 'USR-MAIN', target: 'USR-E005' },
      ],
    };
  }

  return { render, fromInvestigation, demoGraph };
})();