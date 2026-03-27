const store = require('../data/store');
const { pushLog } = require('./logger');
const { setManyAgents, setAgentState } = require('./agents');

function pad(num) {
  return String(num).padStart(3, '0');
}

function createWorkflowId() {
  return `WF-${new Date().getFullYear()}-${pad(Math.floor(Math.random() * 900) + 100)}`;
}

function safeText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function createWorkflow(payload = {}, io) {
  const type = safeText(payload.type);
  const subject = safeText(payload.subject, 'Unknown');
  const priority = safeText(payload.priority, 'Normal');
  const notes = safeText(payload.notes, '');

  if (!type || !subject) {
    const error = new Error('type and subject are required');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const workflow = {
    id: createWorkflowId(),
    type,
    subject,
    priority,
    notes,
    status: 'running',
    progress: 4,
    currentStep: 'Queued',
    steps: [
      { id: 'step-1', label: 'Request accepted', status: 'done' },
      { id: 'step-2', label: 'Workflow decomposed', status: 'pending' },
      { id: 'step-3', label: 'Retrieve data and policy context', status: 'pending' },
      { id: 'step-4', label: 'Execute actions', status: 'pending' },
      { id: 'step-5', label: 'Validate output and compliance', status: 'pending' },
      { id: 'step-6', label: 'Publish completion', status: 'pending' }
    ],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    history: []
  };

  store.workflows.unshift(workflow);

  pushLog(
    {
      agent: 'orch',
      level: 'info',
      msg: `${workflow.id} created · ${type} · subject: ${subject} · priority: ${priority}`
    },
    io
  );

  if (io) io.emit('workflow:created', workflow);

  scheduleWorkflowExecution(workflow, io);
  return workflow;
}

function scheduleWorkflowExecution(workflow, io) {
  const stages = [
    {
      delay: 900,
      progress: 14,
      stepIndex: 1,
      currentStep: 'Orchestrator decomposing workflow',
      logAgent: 'orch',
      logLevel: 'info',
      logMessage: `${workflow.id} decomposed into 4 subtasks`,
      agentUpdates: [
        { id: 'agent-orchestrator', patch: { status: 'running', statusText: 'orchestrating', progress: 74, tasks: '3 tasks', cardClass: 'active-agent' } }
      ]
    },
    {
      delay: 1900,
      progress: 32,
      stepIndex: 2,
      currentStep: 'Retriever fetching employee profile and policy rules',
      logAgent: 'retr',
      logLevel: 'info',
      logMessage: `Retriever resolved employee and policy context for ${workflow.subject}`,
      agentUpdates: [
        { id: 'agent-retriever', patch: { status: 'running', statusText: 'fetching', progress: 58, tasks: '1 task', cardClass: 'running' } }
      ]
    },
    {
      delay: 3200,
      progress: 58,
      stepIndex: 3,
      currentStep: 'Executor provisioning account and access',
      logAgent: 'exec',
      logLevel: 'info',
      logMessage: `Executor provisioned email and access request for ${workflow.subject}`,
      agentUpdates: [
        { id: 'agent-executor', patch: { status: 'running', statusText: 'executing', progress: 88, tasks: '1 task', cardClass: 'running' } }
      ]
    },
    {
      delay: 4500,
      progress: 79,
      stepIndex: 4,
      currentStep: 'Validator checking compliance and asset assignment',
      logAgent: 'vali',
      logLevel: 'info',
      logMessage: `Validator confirmed compliance for ${workflow.id}`,
      agentUpdates: [
        { id: 'agent-validator', patch: { status: 'running', statusText: 'validating', progress: 68, tasks: '1 task', cardClass: 'running' } }
      ]
    },
    {
      delay: 5800,
      progress: 100,
      stepIndex: 5,
      currentStep: 'Workflow completed and published',
      logAgent: 'orch',
      logLevel: 'success',
      logMessage: `${workflow.id} completed successfully`,
      final: true
    }
  ];

  stages.forEach((stage) => {
    setTimeout(() => {
      const active = store.workflows.find(w => w.id === workflow.id);
      if (!active) return;
      if (active.status === 'failed') return;

      active.progress = stage.progress;
      active.currentStep = stage.currentStep;
      active.updatedAt = new Date();

      if (active.steps[stage.stepIndex]) {
        active.steps[stage.stepIndex].status = stage.final ? 'done' : 'done';
      }

      active.history.push({
        time: new Date(),
        msg: stage.logMessage,
        progress: stage.progress
      });

      if (Array.isArray(stage.agentUpdates)) {
        setManyAgents(stage.agentUpdates, io);
      }

      if (stage.final) {
        active.status = 'completed';
        active.completedAt = new Date();

        setManyAgents([
          { id: 'agent-orchestrator', patch: { status: 'idle', statusText: 'idle', progress: 42, tasks: '0 tasks', cardClass: '' } },
          { id: 'agent-retriever', patch: { status: 'idle', statusText: 'idle', progress: 28, tasks: '0 tasks', cardClass: '' } },
          { id: 'agent-executor', patch: { status: 'idle', statusText: 'idle', progress: 55, tasks: '0 tasks', cardClass: '' } },
          { id: 'agent-validator', patch: { status: 'idle', statusText: 'idle', progress: 32, tasks: '0 tasks', cardClass: '' } }
        ], io);
      }

      pushLog(
        {
          agent: stage.logAgent,
          level: stage.logLevel,
          msg: stage.logMessage
        },
        io
      );

      if (io) io.emit('workflow:updated', active);
    }, stage.delay);
  });
}

function serializeWorkflow(workflow) {
  const started = new Date(workflow.createdAt);
  const ended = workflow.completedAt ? new Date(workflow.completedAt) : new Date();
  const ms = Math.max(0, ended - started);

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);
  const duration = minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;

  return {
    ...workflow,
    started: started.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    duration
  };
}

function getWorkflowById(id) {
  return store.workflows.find(w => w.id === id) || null;
}

function updateWorkflow(id, patch = {}, io) {
  const workflow = getWorkflowById(id);
  if (!workflow) return null;

  Object.assign(workflow, patch);
  workflow.updatedAt = new Date();

  if (patch.status === 'completed' && !workflow.completedAt) {
    workflow.completedAt = new Date();
  }

  if (patch.status === 'failed') {
    workflow.completedAt = new Date();
  }

  if (io) io.emit('workflow:updated', workflow);

  return workflow;
}

function deleteWorkflow(id) {
  const idx = store.workflows.findIndex(w => w.id === id);
  if (idx === -1) return false;
  store.workflows.splice(idx, 1);
  return true;
}

module.exports = {
  createWorkflow,
  serializeWorkflow,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow
};