const { Router } = require('express');

function createDroneRoutes(droneController) {
  const router = Router();

  router.get('/drones', droneController.list);
  router.get('/drones/:id', droneController.getOne);
  router.patch('/drones/:id', droneController.update);
  router.post('/drones/:id/command', droneController.command);

  return router;
}

module.exports = { createDroneRoutes };
