const EventEmitter = require('events');
const { Drone } = require('../models/Drone');
const config = require('../config/config');

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Simple, readable state machine. Each entry describes what tends to
// happen next; probabilities are intentionally soft so behaviour still
// looks organic rather than a rigid FSM.
const NEXT_STATUS = {
  IDLE: ['IDLE', 'IDLE', 'TAKING_OFF'],
  TAKING_OFF: ['TAKING_OFF', 'FLYING', 'FLYING'],
  FLYING: ['FLYING', 'FLYING', 'FLYING', 'RETURNING'],
  RETURNING: ['RETURNING', 'LANDING'],
  LANDING: ['LANDING', 'IDLE'],
  COMPLETED: ['COMPLETED'],
};

/**
 * Owns the authoritative in-memory fleet state and advances it on a fixed
 * tick. Emits 'update' with the list of drones that changed on that tick,
 * and 'tick' after every cycle (even if nothing changed) for observability.
 */
class DroneSimulator extends EventEmitter {
  constructor({ droneCount = 10, tickIntervalMs = 1000 } = {}) {
    super();
    this.drones = new Map();
    for (let i = 1; i <= droneCount; i += 1) {
      this.drones.set(i, new Drone(i));
    }
    this.tickIntervalMs = tickIntervalMs;
    this._timer = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), this.tickIntervalMs);
    // Don't let the timer keep the process alive on its own during tests.
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  getAll() {
    return Array.from(this.drones.values()).map((d) => d.toJSON());
  }

  getById(id) {
    const drone = this.drones.get(Number(id));
    return drone ? drone.toJSON() : null;
  }

  rename(id, name) {
    const drone = this.drones.get(Number(id));
    if (!drone) return null;
    drone.name = name;
    drone.updatedAt = new Date().toISOString();
    this.emit('update', [drone.toJSON()]);
    return drone.toJSON();
  }

  /**
   * Applies an operator command (Bonus Challenge 4). Returns the updated
   * drone, or null if the drone doesn't exist.
   */
  applyCommand(id, command) {
    const drone = this.drones.get(Number(id));
    if (!drone) return null;

    if (command === 'TAKEOFF' && drone.battery <= 0) {
      return false; // Depleted battery validation
    }

    switch (command) {
      case 'TAKEOFF':
        drone.status = 'TAKING_OFF';
        drone.userControlled = true;
        break;
      case 'LAND':
        drone.status = 'LANDING';
        drone.userControlled = true;
        break;
      case 'RETURN_HOME':
        drone.status = 'RETURNING';
        drone.userControlled = true;
        break;
      case 'PAUSE_MISSION':
        drone.status = 'IDLE';
        drone.speed = 0;
        drone.userControlled = true;
        break;
      default:
        return undefined; // signals "unknown command" to the caller
    }
    drone.updatedAt = new Date().toISOString();
    this.emit('update', [drone.toJSON()]);
    return drone.toJSON();
  }

  _tick() {
    const changed = [];
    for (const drone of this.drones.values()) {
      if (this._advance(drone)) changed.push(drone.toJSON());
    }
    if (changed.length) this.emit('update', changed);
    this.emit('tick');
  }

  _advance(drone) {
    if (drone.status === 'COMPLETED') return false; // mission finished, frozen

    // Status transition
    if (!drone.userControlled) {
      const options = NEXT_STATUS[drone.status] || ['IDLE'];
      drone.status = options[Math.floor(Math.random() * options.length)];
    } else {
      // Under user control: handle logical state transitions instead of random ones.
      if (drone.status === 'TAKING_OFF' && drone.altitude >= 80) {
        drone.status = 'FLYING';
      } else if (drone.status === 'LANDING' && drone.altitude <= 0) {
        drone.status = 'IDLE';
        drone.userControlled = false; // completed landing, hand back to autonomous loop
      }
    }

    // Speed / altitude depend on flight phase for plausibility
    if (drone.status === 'IDLE') {
      drone.speed = 0;
      drone.altitude = 0;
    } else if (drone.status === 'TAKING_OFF') {
      drone.speed = Number(rand(1, 6).toFixed(1));
      drone.altitude = clamp(Math.round(drone.altitude + rand(5, 15)), 0, 120);
    } else if (drone.status === 'LANDING') {
      drone.speed = Number(rand(0, 3).toFixed(1));
      drone.altitude = clamp(Math.round(drone.altitude - rand(5, 15)), 0, 120);
    } else {
      // FLYING or RETURNING
      drone.speed = Number(rand(0, 20).toFixed(1));
      drone.altitude = clamp(Math.round(drone.altitude + rand(-10, 10)), 0, 120);
    }

    // Battery drains gradually, faster while airborne, never below 0
    const drain = drone.status === 'IDLE' ? rand(0, 0.1) : rand(0.1, 0.6);
    drone.battery = Number(clamp(drone.battery - drain, 0, 100).toFixed(1));

    // GPS: slight random walk
    drone.latitude = Number((drone.latitude + rand(-0.0006, 0.0006)).toFixed(5));
    drone.longitude = Number((drone.longitude + rand(-0.0006, 0.0006)).toFixed(5));

    // Mission progress advances while actively flying a mission
    if (drone.status === 'FLYING' || drone.status === 'RETURNING') {
      drone.missionProgress = clamp(
        Math.round(drone.missionProgress + rand(0.5, 3)),
        0,
        100,
      );
    }
    if (drone.missionProgress >= 100) {
      drone.missionProgress = 100;
      drone.status = 'COMPLETED';
      drone.speed = 0;
    }

    // Battery fully depleted forces a landing/idle state regardless of RNG
    if (drone.battery <= 0) {
      drone.status = drone.status === 'COMPLETED' ? drone.status : 'IDLE';
      drone.speed = 0;
      drone.userControlled = false;
    }

    drone.updatedAt = new Date().toISOString();
    return true;
  }
}

module.exports = { DroneSimulator, config };
