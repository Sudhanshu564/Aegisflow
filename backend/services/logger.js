const store = require('../data/store');

function emit(io, event, payload) {
  if (io && typeof io.emit === 'function') {
    io.emit(event, payload);
  }
}

function pushLog({ agent = 'orch', level = 'info', msg = '' }, io) {
  const entry = {
    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    agent,
    level,
    msg
  };

  store.logs.unshift(entry);

  if (store.logs.length > 400) {
    store.logs.length = 400;
  }

  emit(io, 'log:new', entry);
  return entry;
}

function clearLogs(io) {
  store.logs = [];
  emit(io, 'logs:cleared', { ok: true });
}

module.exports = {
  pushLog,
  clearLogs
};