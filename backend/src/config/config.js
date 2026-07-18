/**
 * Central configuration. Reads from environment variables with sane
 * defaults so the service runs with zero setup.
 */
module.exports = {
  port: process.env.PORT || 3000,

  simulator: {
    droneCount: Number(process.env.DRONE_COUNT || 10),
    tickIntervalMs: Number(process.env.TICK_INTERVAL_MS || 1000),
  },

  websocket: {
    path: '/ws',
    // How often the server pings clients to check liveness.
    heartbeatIntervalMs: Number(process.env.HEARTBEAT_MS || process.env.HEARTBEAT_INTERVAL_MS || 15000),
    // If a client hasn't answered a ping within this window, it is dropped.
    heartbeatTimeoutMs: Number(process.env.HEARTBEAT_TIMEOUT_MS || 40000),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
