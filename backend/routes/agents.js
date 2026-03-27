const express = require('express');
const router = express.Router();

const store = require('../data/store');
const { setAgentState, findAgent } = require('../services/agents');

router.get('/', (req, res) => {
  res.json(store.agents);
});

router.get('/:id', (req, res) => {
  const agent = findAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  res.json(agent);
});

router.patch('/:id', (req, res) => {
  const io = req.app.get('io');
  const updated = setAgentState(req.params.id, req.body, io);

  if (!updated) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  res.json(updated);
});

module.exports = router;