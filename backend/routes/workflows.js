const express = require('express');
const router = express.Router();

const store = require('../data/store');
const {
  createWorkflow,
  serializeWorkflow,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow
} = require('../services/orchestrator');

router.get('/', (req, res) => {
  res.json(store.workflows.map(serializeWorkflow));
});

router.get('/:id', (req, res) => {
  const workflow = getWorkflowById(req.params.id);
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' });
  }

  res.json(serializeWorkflow(workflow));
});

router.post('/', (req, res) => {
  try {
    const io = req.app.get('io');
    const workflow = createWorkflow(req.body, io);
    res.status(201).json(serializeWorkflow(workflow));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to create workflow'
    });
  }
});

router.patch('/:id/status', (req, res) => {
  const io = req.app.get('io');
  const { status } = req.body;

  const workflow = updateWorkflow(req.params.id, { status }, io);
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' });
  }

  res.json(serializeWorkflow(workflow));
});

router.delete('/:id', (req, res) => {
  const ok = deleteWorkflow(req.params.id);
  if (!ok) {
    return res.status(404).json({ message: 'Workflow not found' });
  }

  res.json({ message: 'Workflow deleted' });
});

module.exports = router;