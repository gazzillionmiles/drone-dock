const express = require('express');
const cors = require('cors');

const config = require('./config/config');
const { DroneController } = require('./controllers/droneController');
const { createDroneRoutes } = require('./routes/droneRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp(droneService) {
  const app = express();

  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  const droneController = new DroneController(droneService);
  app.use('/api', createDroneRoutes(droneController));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
