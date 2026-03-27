const now = Date.now();

const store = {
  agents: [
    {
      id: 'agent-orchestrator',
      name: 'Orchestrator',
      role: 'Boss · Task Splitter',
      icon: '⬡',
      iconClass: 'orchestrator',
      status: 'running',
      statusText: 'orchestrating',
      tasks: '3 tasks',
      progress: 72,
      progressClass: 'purple',
      cardClass: 'active-agent',
      activity: 'Splitting workflows into subtasks'
    },
    {
      id: 'agent-retriever',
      name: 'Retriever',
      role: 'Data Fetcher',
      icon: '⊡',
      iconClass: 'retriever',
      status: 'running',
      statusText: 'fetching',
      tasks: '1 task',
      progress: 45,
      progressClass: 'blue',
      cardClass: 'running',
      activity: 'Querying asset DB for available laptops'
    },
    {
      id: 'agent-decision',
      name: 'Decision',
      role: 'Rules + LLM',
      icon: '◈',
      iconClass: 'decision',
      status: 'waiting',
      statusText: 'waiting',
      tasks: '2 queued',
      progress: 0,
      progressClass: 'amber',
      cardClass: '',
      activity: 'Evaluating workflow branches'
    },
    {
      id: 'agent-executor',
      name: 'Executor',
      role: 'Action Runner',
      icon: '▷',
      iconClass: 'executor',
      status: 'running',
      statusText: 'executing',
      tasks: '1 task',
      progress: 88,
      progressClass: 'green',
      cardClass: 'running',
      activity: 'Provisioning accounts and services'
    },
    {
      id: 'agent-validator',
      name: 'Validator',
      role: 'Quality Check',
      icon: '✓',
      iconClass: 'validator',
      status: 'running',
      statusText: 'validating',
      tasks: '1 task',
      progress: 60,
      progressClass: 'teal',
      cardClass: 'running',
      activity: 'Checking output, compliance, and consistency'
    },
    {
      id: 'agent-monitor',
      name: 'Monitor',
      role: 'SLA Watchdog',
      icon: '◎',
      iconClass: 'monitor',
      status: 'error',
      statusText: 'alert!',
      tasks: '3 breaches',
      progress: 100,
      progressClass: 'red',
      cardClass: 'error',
      activity: 'Watching SLA thresholds and escalation paths'
    }
  ],

  workflows: [
    {
      id: 'WF-2024-047',
      type: 'Employee Onboarding',
      subject: 'Priya Sharma',
      priority: 'High',
      notes: 'Laptop, email, payroll, badge',
      status: 'running',
      progress: 62,
      currentStep: 'Assign laptop from inventory',
      steps: [
        { id: 'step-1', label: 'HR uploads employee data', status: 'done' },
        { id: 'step-2', label: 'Orchestrator decomposes workflow', status: 'done' },
        { id: 'step-3', label: 'Create corporate email ID', status: 'done' },
        { id: 'step-4', label: 'Assign laptop from inventory', status: 'running' },
        { id: 'step-5', label: 'Add to payroll system', status: 'pending' },
        { id: 'step-6', label: 'Validator confirms completion', status: 'pending' }
      ],
      createdAt: new Date(now - 47000),
      updatedAt: new Date(now - 12000),
      completedAt: null,
      history: []
    }
  ],

  logs: [
    {
      time: '09:14:02',
      agent: 'retr',
      level: 'info',
      msg: 'HR uploaded employee data for Priya Sharma · 12 fields parsed'
    },
    {
      time: '09:14:09',
      agent: 'orch',
      level: 'info',
      msg: 'WF-2024-047 created · decomposed into 4 subtasks: email, laptop, payroll, badge'
    },
    {
      time: '09:14:34',
      agent: 'exec',
      level: 'success',
      msg: 'Email provisioned successfully · psharma@company.com active'
    },
    {
      time: '09:16:41',
      agent: 'moni',
      level: 'warn',
      msg: 'SLA WARNING: WF-2024-041 payroll step exceeded 2-min threshold'
    }
  ]
};

module.exports = store;