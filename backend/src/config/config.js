// Load environment variables from .env
require('dotenv').config();

// Centralized runtime validation of environment variables
function validateEnv() {
  const required = ['LIVEKIT_API_KEY', 'LIVEKIT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.log(`\n[INFO] LiveKit API keys not fully configured. Video feed will show a placeholder.\n`);
  }
}

validateEnv();

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

  livekit: {
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    apiKey: process.env.LIVEKIT_API_KEY || null,
    secret: process.env.LIVEKIT_SECRET || null,
  },
};
