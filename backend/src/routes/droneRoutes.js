const { Router } = require('express');
const livekitTokenService = require('../livekit/tokenService');

function createDroneRoutes(droneController) {
  const router = Router();

  router.get('/drones', droneController.list);
  router.get('/drones/:id', droneController.getOne);
  router.patch('/drones/:id', droneController.update);
  router.post('/drones/:id/command', droneController.command);

  // LiveKit Access Token Endpoint (GET /api/livekit/token?droneId=1)
  router.get('/livekit/token', async (req, res, next) => {
    try {
      const { droneId, participantName } = req.query;
      if (!droneId) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'droneId query parameter is required.',
        });
      }
      const data = await livekitTokenService.generateToken(droneId, participantName);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createDroneRoutes };
