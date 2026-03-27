const store = require('../data/store');

function findAgent(id) {
  return store.agents.find(agent => agent.id === id) || null;
}

function emit(io, event, payload) {
  if (io && typeof io.emit === 'function') {
    io.emit(event, payload);
  }
}

function setAgentState(id, patch = {}, io) {
  const agent = findAgent(id);
  if (!agent) return null;

  Object.assign(agent, patch);
  agent.updatedAt = new Date().toISOString();

  emit(io, 'agent:updated', agent);
  return agent;
}

function setManyAgents(patches = [], io) {
  const updated = [];

  for (const item of patches) {
    const agent = setAgentState(item.id, item.patch || {}, io);
    if (agent) updated.push(agent);
  }

  return updated;
}

function getAgents() {
  return store.agents;
}

module.exports = {
  findAgent,
  setAgentState,
  setManyAgents,
  getAgents
};