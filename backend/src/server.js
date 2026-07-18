const http = require('http');

const config = require('./config/config');
const { createApp } = require('./app');
const { DroneSimulator } = require('./simulator/droneSimulator');
const { DroneService } = require('./services/droneService');
const { DroneWebSocketServer } = require('./websocket/wsServer');
const logger = require('./utils/logger');

const simulator = new DroneSimulator(config.simulator);
const droneService = new DroneService(simulator);
const app = createApp(droneService);
const server = http.createServer(app);

const wsServer = new DroneWebSocketServer({
  server,
  path: config.websocket.path,
  simulator,
  heartbeatIntervalMs: config.websocket.heartbeatIntervalMs,
  heartbeatTimeoutMs: config.websocket.heartbeatTimeoutMs,
});

simulator.start();
wsServer.start();

server.listen(config.port, () => {
  logger.info(`Drone Dock backend listening on http://localhost:${config.port}`);
  logger.info(`WebSocket endpoint: ws://localhost:${config.port}${config.websocket.path}`);
});

// Graceful shutdown (Part 7: "server restart" should not corrupt state or
// leave sockets hanging).
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  simulator.stop();
  wsServer.stop();
  server.close(() => {
    logger.info('HTTP server closed. Bye.');
    process.exit(0);
  });
  // Force-exit if close hangs.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Last line of defense: log and keep running rather than crashing the
// whole dock on an unexpected error in a handler.
process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
