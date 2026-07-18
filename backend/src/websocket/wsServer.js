const { WebSocketServer } = require('ws');
const { diffDrone } = require('../utils/delta');
const logger = require('../utils/logger');

/**
 * Wraps a `ws` WebSocketServer and wires it to the DroneSimulator.
 *
 * Responsibilities:
 *  - On connect: send a full snapshot ("sync") of every drone so the
 *    client always has a consistent starting state, including on
 *    reconnects (Part 5).
 *  - On simulator tick: broadcast only the fields that changed per drone
 *    (Bonus 1), and only to clients subscribed to that drone (Bonus 2).
 *  - Heartbeat ping/pong to detect and clean up dead connections
 *    (Bonus 3).
 *  - Never let a single bad client (malformed JSON, abrupt close) take
 *    down the server or other clients.
 */
class DroneWebSocketServer {
  constructor({ server, path, simulator, heartbeatIntervalMs, heartbeatTimeoutMs }) {
    this.wss = new WebSocketServer({ server, path });
    this.simulator = simulator;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;

    // Per-connection metadata, keyed by the ws instance itself.
    this.clients = new Map();

    // Last broadcast snapshot per drone id, used to compute deltas.
    this.lastState = new Map();

    this._onConnection = this._onConnection.bind(this);
    this._onSimulatorUpdate = this._onSimulatorUpdate.bind(this);
  }

  start() {
    this.wss.on('connection', this._onConnection);
    this.simulator.on('update', this._onSimulatorUpdate);
    this._heartbeatTimer = setInterval(() => this._runHeartbeat(), this.heartbeatIntervalMs);
    if (this._heartbeatTimer.unref) this._heartbeatTimer.unref();
    logger.info('WebSocket server ready');
  }

  stop() {
    clearInterval(this._heartbeatTimer);
    this.simulator.off('update', this._onSimulatorUpdate);
  }

  _onConnection(ws) {
    const meta = {
      subscriptions: null, // null = subscribed to all drones (default)
      alive: true,
      connectedAt: Date.now(),
    };
    this.clients.set(ws, meta);
    logger.info(`Client connected (${this.clients.size} total)`);

    // Full sync on connect/reconnect so the client can rebuild state
    // regardless of whether it missed deltas while disconnected.
    this._send(ws, { type: 'sync', payload: this.simulator.getAll() });

    ws.on('message', (raw) => this._onMessage(ws, raw));
    ws.on('pong', () => {
      const m = this.clients.get(ws);
      if (m) m.alive = true;
    });
    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info(`Client disconnected (${this.clients.size} total)`);
    });
    ws.on('error', (err) => {
      logger.warn('Client socket error:', err.message);
    });
  }

  _onMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      this._send(ws, { type: 'error', payload: { message: 'Malformed JSON message.' } });
      return;
    }

    const meta = this.clients.get(ws);
    if (!meta) return;

    switch (msg.type) {
      case 'subscribe': {
        const ids = Array.isArray(msg.droneIds) ? msg.droneIds.map(Number).filter(Number.isInteger) : [];
        meta.subscriptions = new Set(ids);
        this._send(ws, { type: 'subscribed', payload: { droneIds: ids } });
        break;
      }
      case 'unsubscribe': {
        meta.subscriptions = null; // back to receiving everything
        this._send(ws, { type: 'subscribed', payload: { droneIds: null } });
        break;
      }
      case 'pong': {
        meta.alive = true;
        break;
      }
      default:
        this._send(ws, { type: 'error', payload: { message: `Unknown message type: ${msg.type}` } });
    }
  }

  _onSimulatorUpdate(changedDrones) {
    for (const drone of changedDrones) {
      const delta = diffDrone(this.lastState.get(drone.id), drone);
      this.lastState.set(drone.id, drone);
      if (!delta) continue; // nothing meaningful changed -> skip duplicate event

      const message = { type: 'telemetry', payload: delta };
      for (const [ws, meta] of this.clients) {
        if (ws.readyState !== ws.OPEN) continue;
        if (meta.subscriptions && !meta.subscriptions.has(drone.id)) continue;
        this._send(ws, message);
      }
    }
  }

  _runHeartbeat() {
    const timeoutAt = Date.now() - this.heartbeatTimeoutMs;
    for (const [ws, meta] of this.clients) {
      if (!meta.alive && meta.connectedAt < timeoutAt) {
        logger.warn('Terminating unresponsive client');
        ws.terminate();
        this.clients.delete(ws);
        continue;
      }
      meta.alive = false;
      this._send(ws, { type: 'ping' });
      if (ws.ping) ws.ping();
    }
  }

  _send(ws, message) {
    if (ws.readyState !== ws.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch (err) {
      logger.warn('Failed to send to client:', err.message);
    }
  }
}

module.exports = { DroneWebSocketServer };
