const { AccessToken } = require('livekit-server-sdk');
const config = require('../config/config');

class LiveKitTokenService {
  async generateToken(droneId, participantName) {
    const apiKey = config.livekit.apiKey;
    const apiSecret = config.livekit.secret;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit API key or secret not configured.');
    }

    const roomName = `drone-${droneId}`;
    const identity = participantName || `viewer-${Math.random().toString(36).substring(2, 8)}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return {
      token: jwt,
      roomName,
      participantName: identity,
      serverUrl: config.livekit.url,
    };
  }
}

module.exports = new LiveKitTokenService();
