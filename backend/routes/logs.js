const express = require('express');
const router = express.Router();

const store = require('../data/store');
const { pushLog, clearLogs } = require('../services/logger');

router.get('/', (req, res) => {
  res.json(store.logs);
});

router.post('/', (req, res) => {
  const { agent, level = 'info', message, msg } = req.body;

  if (!agent || (!message && !msg)) {
    return res.status(400).json({
      message: 'agent and message are required'
    });
  }

  const io = req.app.get('io');
  const entry = pushLog(
    {
      agent,
      level,
      msg: message || msg
    },
    io
  );

  res.status(201).json(entry);
});

router.delete('/', (req, res) => {
  const io = req.app.get('io');
  clearLogs(io);
  res.json({ message: 'Logs cleared' });
});

module.exports = router;