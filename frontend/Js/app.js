'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:5000/api';
  const SOCKET_URL = 'http://localhost:5000';

  const state = {
    summary: { workflows: { total: 0, running: 0, completed: 0, failed: 0, breaches: 0 }, logs: 0, agents: 0 },
    workflows: [],
    logs: [],
    agents: [],
    selectedWorkflowId: null,
    search: '',
    filter: 'all',
    socketConnected: false
  };

  const els = {
    clock: document.getElementById('clock'),
    toastContainer: document.getElementById('toastContainer'),
    workflowTableBody: document.getElementById('workflowTableBody'),
    workflowSearch: document.getElementById('workflowSearch'),
    workflowFilter: document.getElementById('workflowFilter'),
    workflowInspectorBody: document.getElementById('workflowInspectorBody'),
    inspectorBadge: document.getElementById('inspectorBadge'),
    agentGrid: document.getElementById('agentGrid'),
    agentCountBadge: document.getElementById('agentCountBadge'),
    auditLog: document.getElementById('auditLog'),
    logCount: document.getElementById('log-count'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    launchWorkflowBtn: document.getElementById('launchWorkflowBtn'),
    launchWorkflowShortcut: document.getElementById('launchWorkflowShortcut'),
    scrollToWorkflows: document.getElementById('scrollToWorkflows'),
    extractTasksBtn: document.getElementById('extractTasksBtn'),
    extractedTasksContainer: document.getElementById('extracted-tasks-container'),
    extractedTasks: document.getElementById('extractedTasks'),
    wfType: document.getElementById('wf-type'),
    wfSubject: document.getElementById('wf-subject'),
    wfPriority: document.getElementById('wf-priority'),
    wfNotes: document.getElementById('wf-notes'),
    transcriptInput: document.getElementById('transcript-input'),
    backendStatus: document.getElementById('backendStatus'),
    backendStatusSub: document.getElementById('backendStatusSub'),
    selectedWorkflowTitle: document.getElementById('selectedWorkflowTitle'),
    selectedWorkflowSub: document.getElementById('selectedWorkflowSub'),
    apiHealth: document.getElementById('apiHealth'),
    socketHealth: document.getElementById('socketHealth'),
    lastSync: document.getElementById('lastSync'),
    metricTotal: document.getElementById('metric-total'),
    metricRunning: document.getElementById('metric-running'),
    metricCompleted: document.getElementById('metric-completed'),
    metricBreach: document.getElementById('metric-breach'),
    metricTotalPill: document.getElementById('metric-total-pill'),
    metricRunningPill: document.getElementById('metric-running-pill'),
    metricCompletedPill: document.getElementById('metric-completed-pill'),
    metricBreachPill: document.getElementById('metric-breach-pill'),
    sparkTotal: document.getElementById('spark-total'),
    sparkRunning: document.getElementById('spark-running'),
    sparkCompleted: document.getElementById('spark-completed'),
    sparkBreach: document.getElementById('spark-breach'),
    tabs: [...document.querySelectorAll('.tab[data-target]')]
  };

  const sparkData = {
    total: [10, 14, 12, 17, 15, 20, 18, 24],
    running: [4, 5, 6, 5, 7, 8, 9, 10],
    completed: [8, 9, 10, 12, 13, 14, 16, 18],
    breach: [1, 1, 2, 1, 2, 3, 2, 3]
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(value) {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(value);
    }
  }

  function formatCreatedDate(value) {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return String(value);
    }
  }

  function setClock() {
    if (!els.clock) return;
    els.clock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  function toast(type, icon, msg) {
    if (!els.toastContainer) return;
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.innerHTML = `
      <span class="toast-icon">${escapeHtml(icon)}</span>
      <span class="toast-msg">${escapeHtml(msg)}</span>
    `;
    els.toastContainer.appendChild(node);

    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateX(14px)';
      node.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      setTimeout(() => node.remove(), 240);
    }, 3200);
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data.message || JSON.stringify(data);
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `Request failed: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function renderSpark(el, values, colorClass) {
    if (!el) return;
    const max = Math.max(...values, 1);
    el.innerHTML = values.map((v) => {
      const h = Math.max(4, Math.round((v / max) * 42));
      return `<div class="spark-bar ${colorClass}" style="height:${h}px"></div>`;
    }).join('');
  }

  function statusBadgeClass(status) {
    switch (status) {
      case 'running': return 'amber';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'sla-breach': return 'amber';
      default: return 'gray';
    }
  }

  function statusLabel(status) {
    switch (status) {
      case 'running': return 'running';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'sla-breach': return 'sla breach';
      default: return 'unknown';
    }
  }

  function agentStatusColor(status) {
    switch (status) {
      case 'running': return 'running';
      case 'waiting': return 'waiting';
      case 'error': return 'error';
      default: return 'idle';
    }
  }

  function renderSummary() {
    const s = state.summary.workflows || {};
    els.metricTotal.textContent = s.total ?? 0;
    els.metricRunning.textContent = s.running ?? 0;
    els.metricCompleted.textContent = s.completed ?? 0;
    els.metricBreach.textContent = s.breaches ?? 0;

    els.metricTotalPill.textContent = `${s.total ?? 0} total`;
    els.metricRunningPill.textContent = `${s.running ?? 0} live`;
    els.metricCompletedPill.textContent = `${s.completed ?? 0} done`;
    els.metricBreachPill.textContent = `${s.breaches ?? 0} alerts`;

    renderSpark(els.sparkTotal, sparkData.total, 'green');
    renderSpark(els.sparkRunning, sparkData.running, 'blue');
    renderSpark(els.sparkCompleted, sparkData.completed, 'green');
    renderSpark(els.sparkBreach, sparkData.breach, 'amber');

    els.agentCountBadge.textContent = `${state.agents.length} agents`;
    els.logCount.textContent = `${state.logs.length} entries`;
  }

  function getFilteredWorkflows() {
    const search = state.search.trim().toLowerCase();
    return state.workflows
      .filter((wf) => {
        const byStatus = state.filter === 'all' || wf.status === state.filter;
        if (!byStatus) return false;
        if (!search) return true;

        const haystack = [
          wf.id,
          wf.type,
          wf.subject,
          wf.priority,
          wf.status,
          wf.currentStep,
          wf.notes
        ].join(' ').toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function renderWorkflows() {
    const list = getFilteredWorkflows();
    if (!els.workflowTableBody) return;

    if (list.length === 0) {
      els.workflowTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:var(--muted);padding:24px 16px">
            No workflows match your search or filter.
          </td>
        </tr>
      `;
      return;
    }

    els.workflowTableBody.innerHTML = list.map((wf) => {
      const selected = wf.id === state.selectedWorkflowId ? 'selected' : '';
      return `
        <tr class="${selected}" data-id="${escapeHtml(wf.id)}">
          <td>${escapeHtml(wf.id)}</td>
          <td>${escapeHtml(wf.type || '—')}</td>
          <td>${escapeHtml(wf.subject || '—')}</td>
          <td><span class="badge ${statusBadgeClass(wf.status)}">${escapeHtml(wf.priority || 'Normal')}</span></td>
          <td><span class="badge ${statusBadgeClass(wf.status)}">${escapeHtml(statusLabel(wf.status))}</span></td>
          <td>${escapeHtml(wf.currentStep || '—')}</td>
          <td>${escapeHtml(wf.started || formatCreatedDate(wf.createdAt))}</td>
          <td>${escapeHtml(wf.duration || '0s')}</td>
        </tr>
      `;
    }).join('');

    [...els.workflowTableBody.querySelectorAll('tr[data-id]')].forEach((row) => {
      row.addEventListener('click', () => {
        state.selectedWorkflowId = row.dataset.id;
        renderWorkflows();
        renderInspector();
      });
    });
  }

  function renderInspector() {
    const wf = state.workflows.find((item) => item.id === state.selectedWorkflowId) || state.workflows[0] || null;

    if (!wf) {
      els.inspectorBadge.textContent = 'Select a workflow';
      els.selectedWorkflowTitle.textContent = 'None';
      els.selectedWorkflowSub.textContent = 'Click a workflow row';
      els.workflowInspectorBody.innerHTML = `
        <div class="empty-state">No workflow data available yet.</div>
      `;
      return;
    }

    if (!state.selectedWorkflowId) state.selectedWorkflowId = wf.id;

    els.inspectorBadge.textContent = `${statusLabel(wf.status)} · ${wf.priority || 'Normal'}`;
    els.selectedWorkflowTitle.textContent = wf.subject || 'Unknown';
    els.selectedWorkflowSub.textContent = `${wf.id} · ${wf.type || 'Workflow'} · ${wf.started || formatCreatedDate(wf.createdAt)}`;

    const progress = Number(wf.progress ?? 0);
    const steps = Array.isArray(wf.steps) ? wf.steps : [];

    els.workflowInspectorBody.innerHTML = `
      <div class="inspector-head">
        <div>
          <div class="inspector-title">${escapeHtml(wf.subject || 'Unknown')}</div>
          <div class="inspector-sub">${escapeHtml(wf.id)} · ${escapeHtml(wf.type || '')}</div>
        </div>
        <span class="badge ${statusBadgeClass(wf.status)}">${escapeHtml(statusLabel(wf.status))}</span>
      </div>

      <div class="inspector-grid">
        <div class="info-card">
          <div class="k">Priority</div>
          <div class="v">${escapeHtml(wf.priority || 'Normal')}</div>
        </div>
        <div class="info-card">
          <div class="k">Current step</div>
          <div class="v">${escapeHtml(wf.currentStep || '—')}</div>
        </div>
        <div class="info-card">
          <div class="k">Started</div>
          <div class="v">${escapeHtml(wf.started || formatCreatedDate(wf.createdAt))}</div>
        </div>
        <div class="info-card">
          <div class="k">Duration</div>
          <div class="v">${escapeHtml(wf.duration || '0s')}</div>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="health-row" style="border:none;padding-bottom:8px">
          <span>Progress</span>
          <span class="health-value">${progress}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>

      <div class="steps">
        ${steps.map((step) => `
          <div class="step">
            <span class="step-dot ${escapeHtml(step.status || 'pending')}"></span>
            <span class="step-text">${escapeHtml(step.label || '')}</span>
            <span class="step-state">${escapeHtml(step.status || 'pending')}</span>
          </div>
        `).join('')}
      </div>

      <div class="health-row" style="margin-top:14px">
        <span>Notes</span>
        <span class="health-value">${escapeHtml(wf.notes || 'No notes')}</span>
      </div>
    `;
  }

  function renderAgents() {
    els.agentGrid.innerHTML = state.agents.map((agent) => `
      <article class="agent-card">
        <div class="agent-head">
          <div class="agent-icon ${escapeHtml(agent.iconClass || '')}">${escapeHtml(agent.icon || '◈')}</div>
          <div>
            <div class="agent-name">${escapeHtml(agent.name || 'Agent')}</div>
            <div class="agent-role">${escapeHtml(agent.role || '')}</div>
          </div>
        </div>

        <div class="agent-row">
          <div class="agent-status">
            <span class="dot ${agentStatusColor(agent.status)}"></span>
            <span>${escapeHtml(agent.statusText || agent.status || 'idle')}</span>
          </div>
          <span class="badge ${statusBadgeClass(agent.status)}">${escapeHtml(agent.tasks || '0')}</span>
        </div>

        <div class="agent-progress">
          <div class="${escapeHtml(agent.progressClass || 'blue')}" style="width:${Number(agent.progress || 0)}%"></div>
        </div>
      </article>
    `).join('');
  }

  function renderLogs() {
    els.auditLog.innerHTML = state.logs.map((log) => `
      <div class="log-entry">
        <span class="log-time">${escapeHtml(log.time || '—')}</span>
        <span class="log-agent ${escapeHtml(log.agent || 'orch')}">${escapeHtml((log.agent || 'orch').toUpperCase())}</span>
        <span class="log-level ${escapeHtml(log.level || 'info')}">${escapeHtml((log.level || 'info').toUpperCase())}</span>
        <span class="log-msg">${escapeHtml(log.msg || log.message || '')}</span>
      </div>
    `).join('');
    els.logCount.textContent = `${state.logs.length} entries`;
  }

  function renderAll() {
    renderSummary();
    renderWorkflows();
    renderInspector();
    renderAgents();
    renderLogs();
    syncHealthBadges();
  }

  function syncHealthBadges() {
    els.backendStatus.textContent = 'Connected';
    els.backendStatusSub.textContent = SOCKET_URL;
    els.apiHealth.textContent = 'Healthy';
    els.apiHealth.style.color = 'var(--green)';
    els.socketHealth.textContent = state.socketConnected ? 'Connected' : 'Connecting…';
    els.socketHealth.style.color = state.socketConnected ? 'var(--green)' : 'var(--amber)';
    els.lastSync.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  async function loadSummary() {
    state.summary = await api('/summary');
  }

  async function loadWorkflows() {
    state.workflows = await api('/workflows');
    if (!state.selectedWorkflowId && state.workflows[0]) {
      state.selectedWorkflowId = state.workflows[0].id;
    }
  }

  async function loadLogs() {
    state.logs = await api('/logs');
  }

  async function loadAgents() {
    state.agents = await api('/agents');
  }

  async function reloadAll() {
    await Promise.all([loadSummary(), loadWorkflows(), loadLogs(), loadAgents()]);
    renderAll();
    syncHealthBadges();
  }

  function setupSocket() {
    if (typeof io !== 'function') {
      toast('warn', '◎', 'Socket.IO client not loaded. Live updates disabled.');
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      state.socketConnected = true;
      syncHealthBadges();
      toast('success', '✓', 'Live socket connected');
    });

    socket.on('disconnect', () => {
      state.socketConnected = false;
      syncHealthBadges();
      toast('warn', '◎', 'Socket disconnected');
    });

    socket.on('summary', (summary) => {
      state.summary = summary;
      renderSummary();
      syncHealthBadges();
    });

    socket.on('workflow:created', (workflow) => {
      state.workflows.unshift(workflow);
      if (!state.selectedWorkflowId) state.selectedWorkflowId = workflow.id;
      renderWorkflows();
      renderInspector();
      loadSummary().then(() => renderSummary());
      toast('success', '⬡', `${workflow.id} launched`);
    });

    socket.on('workflow:updated', (workflow) => {
      const idx = state.workflows.findIndex((w) => w.id === workflow.id);
      if (idx !== -1) state.workflows[idx] = workflow;
      renderWorkflows();
      renderInspector();
      loadSummary().then(() => renderSummary());
    });

    socket.on('log:new', (entry) => {
      state.logs.unshift(entry);
      renderLogs();
      syncHealthBadges();
    });

    socket.on('logs:cleared', () => {
      state.logs = [];
      renderLogs();
      syncHealthBadges();
    });

    socket.on('agent:updated', (updated) => {
      const idx = state.agents.findIndex((a) => a.id === updated.id);
      if (idx !== -1) state.agents[idx] = updated;
      renderAgents();
      syncHealthBadges();
    });
  }

  async function launchWorkflow() {
    const payload = {
      type: els.wfType.value.trim(),
      subject: els.wfSubject.value.trim(),
      priority: els.wfPriority.value.trim(),
      notes: els.wfNotes.value.trim()
    };

    if (!payload.type || !payload.subject) {
      toast('error', '!', 'Workflow type and subject are required');
      return;
    }

    try {
      const created = await api('/workflows', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      state.workflows.unshift(created);
      state.selectedWorkflowId = created.id;

      els.wfSubject.value = '';
      els.wfNotes.value = '';

      await reloadAll();
      toast('success', '⬡', `${created.id} created`);
    } catch (error) {
      console.error(error);
      toast('error', '!', error.message || 'Failed to create workflow');
    }
  }

  function extractTasks() {
    const input = els.transcriptInput.value.trim();
    const container = els.extractedTasksContainer;
    const list = els.extractedTasks;

    const match = input.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
    const name = match ? match[0] : 'new employee';

    const tasks = input.length > 12
      ? [
          { text: `Onboard ${name}`, agent: 'Orchestrator' },
          { text: 'Provision system access and tools', agent: 'Executor' },
          { text: 'Notify IT for hardware preparation', agent: 'Executor' }
        ]
      : [
          { text: 'Onboard Alex Chen · Engineering', agent: 'Orchestrator' },
          { text: 'Provision server access (DevOps)', agent: 'Executor' },
          { text: 'Schedule badge + payroll setup', agent: 'Decision' }
        ];

    list.innerHTML = tasks.map((task) => `
      <button class="task-chip" type="button" data-task="${escapeHtml(task.text)}" data-agent="${escapeHtml(task.agent)}">
        <span class="task-dot"></span>
        <span>${escapeHtml(task.text)}</span>
        <span class="task-meta">${escapeHtml(task.agent)}</span>
      </button>
    `).join('');

    [...list.querySelectorAll('.task-chip')].forEach((btn) => {
      btn.addEventListener('click', () => {
        els.wfSubject.value = btn.dataset.task || '';
        els.wfType.value = 'Custom Workflow';
        els.wfPriority.value = 'High';
        els.wfNotes.value = `Auto-extracted from meeting intelligence. Suggested owner: ${btn.dataset.agent || 'Orchestrator'}`;
        toast('success', '⬡', 'Task loaded into launcher');
      });
    });

    container.classList.remove('hidden');
    toast('success', '◈', `Extracted ${tasks.length} action items`);
  }

  async function clearLogs() {
    try {
      await api('/logs', { method: 'DELETE' });
      state.logs = [];
      renderLogs();
      syncHealthBadges();
      toast('warn', '◎', 'Audit log cleared');
    } catch (error) {
      console.error(error);
      toast('error', '!', error.message || 'Failed to clear logs');
    }
  }

  function wireTabs() {
    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        els.tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.target;
        const section = document.getElementById(target);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function wireControls() {
    els.workflowSearch.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderWorkflows();
    });

    els.workflowFilter.addEventListener('change', (e) => {
      state.filter = e.target.value;
      renderWorkflows();
    });

    els.launchWorkflowBtn.addEventListener('click', launchWorkflow);
    els.launchWorkflowShortcut.addEventListener('click', () => {
      document.getElementById('wf-type').focus();
      document.getElementById('workflows').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    els.scrollToWorkflows.addEventListener('click', () => {
      document.getElementById('workflows').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    els.extractTasksBtn.addEventListener('click', extractTasks);
    els.clearLogBtn.addEventListener('click', clearLogs);
  }

  async function init() {
    setClock();
    setInterval(setClock, 1000);

    wireTabs();
    wireControls();

    renderSpark(els.sparkTotal, sparkData.total, 'green');
    renderSpark(els.sparkRunning, sparkData.running, 'blue');
    renderSpark(els.sparkCompleted, sparkData.completed, 'green');
    renderSpark(els.sparkBreach, sparkData.breach, 'amber');

    try {
      els.apiHealth.textContent = 'Loading…';
      await reloadAll();
      toast('success', '✓', 'Backend loaded successfully');
    } catch (error) {
      console.error(error);
      els.backendStatus.textContent = 'Offline';
      els.backendStatusSub.textContent = 'Check backend server';
      els.apiHealth.textContent = 'Offline';
      els.apiHealth.style.color = 'var(--red)';
      toast('error', '!', 'Backend not reachable');
    }

    setupSocket();
  }

  init();
});