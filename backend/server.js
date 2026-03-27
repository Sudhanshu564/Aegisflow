const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const store = require('./data/store');
const workflowRoutes = require('./routes/workflows');
const logRoutes = require('./routes/logs');
const agentRoutes = require('./routes/agents');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.set('io', io);

app.use(cors());
app.use(express.json());

function summarizeStore() {
  const total = store.workflows.length;
  const running = store.workflows.filter(w => w.status === 'running').length;
  const completed = store.workflows.filter(w => w.status === 'completed').length;
  const failed = store.workflows.filter(w => w.status === 'failed').length;
  const breaches = store.workflows.filter(w => w.status === 'sla-breach').length;

  return {
    workflows: {
      total,
      running,
      completed,
      failed,
      breaches
    },
    logs: store.logs.length,
    agents: store.agents.length
  };
}

app.get('/', (req, res) => {
  res.send('AegisFlow Backend Running 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'AegisFlow Backend',
    time: new Date().toISOString()
  });
});

app.get('/api/summary', (req, res) => {
  res.json(summarizeStore());
});

app.use('/api/workflows', workflowRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/agents', agentRoutes);

io.on('connection', (socket) => {
  socket.emit('summary', summarizeStore());

  socket.on('ping', () => {
    socket.emit('pong', { ok: true, time: new Date().toISOString() });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});