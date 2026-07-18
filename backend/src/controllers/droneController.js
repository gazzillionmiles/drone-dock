const ERROR_STATUS = {
  INVALID_ID: 400,
  INVALID_NAME: 400,
  INVALID_COMMAND: 400,
  NOT_FOUND: 404,
  BATTERY_DEPLETED: 400,
  INVALID_STATE: 400,
};

const ERROR_MESSAGE = {
  INVALID_ID: 'Drone id must be a number.',
  INVALID_NAME: 'name must be a non-empty string.',
  INVALID_COMMAND: 'command must be one of TAKEOFF, LAND, RETURN_HOME, PAUSE_MISSION.',
  NOT_FOUND: 'Drone not found.',
  BATTERY_DEPLETED: 'Cannot takeoff: battery is fully depleted.',
  INVALID_STATE: 'Command is not allowed in the current drone state.',
};

function sendError(res, code) {
  return res.status(ERROR_STATUS[code] || 400).json({
    error: code,
    message: ERROR_MESSAGE[code] || 'Invalid request.',
  });
}

class DroneController {
  constructor(droneService) {
    this.droneService = droneService;

    // Bind so these can be passed directly as express handlers.
    this.list = this.list.bind(this);
    this.getOne = this.getOne.bind(this);
    this.update = this.update.bind(this);
    this.command = this.command.bind(this);
  }

  list(req, res) {
    res.json({ data: this.droneService.listDrones() });
  }

  getOne(req, res) {
    const { error, drone } = this.droneService.getDrone(req.params.id);
    if (error) return sendError(res, error);
    res.json({ data: drone });
  }

  update(req, res) {
    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return sendError(res, 'INVALID_NAME');
    }
    const { error, drone } = this.droneService.renameDrone(req.params.id, body.name);
    if (error) return sendError(res, error);
    res.json({ data: drone });
  }

  command(req, res) {
    const body = req.body || {};
    const { error, drone } = this.droneService.sendCommand(req.params.id, body.command);
    if (error) return sendError(res, error);
    res.json({ data: drone });
  }
}

module.exports = { DroneController, sendError };
