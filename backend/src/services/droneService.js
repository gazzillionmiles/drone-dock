const { STATUSES } = require('../models/Drone');

const VALID_COMMANDS = ['TAKEOFF', 'LAND', 'RETURN_HOME', 'PAUSE_MISSION'];

/**
 * Thin domain layer over the simulator. Keeps controllers free of
 * validation/business rules and makes the simulator swappable (e.g. for a
 * real telemetry ingestion source) without touching HTTP or WS code.
 */
class DroneService {
  constructor(simulator) {
    this.simulator = simulator;
  }

  listDrones() {
    return this.simulator.getAll();
  }

  getDrone(id) {
    if (!Number.isInteger(Number(id))) return { error: 'INVALID_ID' };
    const drone = this.simulator.getById(id);
    if (!drone) return { error: 'NOT_FOUND' };
    return { drone };
  }

  renameDrone(id, name) {
    if (!Number.isInteger(Number(id))) return { error: 'INVALID_ID' };
    if (typeof name !== 'string' || !name.trim()) return { error: 'INVALID_NAME' };
    const drone = this.simulator.rename(id, name.trim());
    if (!drone) return { error: 'NOT_FOUND' };
    return { drone };
  }

  sendCommand(id, command) {
    if (!Number.isInteger(Number(id))) return { error: 'INVALID_ID' };
    if (!VALID_COMMANDS.includes(command)) return { error: 'INVALID_COMMAND' };
    const result = this.simulator.applyCommand(id, command);
    if (result === null) return { error: 'NOT_FOUND' };
    if (result === false) return { error: 'BATTERY_DEPLETED' };
    return { drone: result };
  }
}

module.exports = { DroneService, VALID_COMMANDS, STATUSES };
