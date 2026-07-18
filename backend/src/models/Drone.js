const STATUSES = ['IDLE', 'TAKING_OFF', 'FLYING', 'RETURNING', 'LANDING', 'COMPLETED'];

/**
 * Plain data model for a drone. Kept as a simple class (not an ORM entity)
 * since telemetry lives in memory for this challenge, but the shape is
 * isolated here so a persistence layer could be swapped in later without
 * touching the simulator or services.
 */
class Drone {
  constructor(id) {
    this.id = id;
    this.name = `Drone-${String(id).padStart(2, '0')}`;
    this.battery = 100;
    this.altitude = 0;
    this.speed = 0;
    this.latitude = Number((19.9 + Math.random() * 0.2).toFixed(5));
    this.longitude = Number((73.7 + Math.random() * 0.2).toFixed(5));
    this.status = 'IDLE';
    this.missionProgress = 0;
    this.userControlled = false;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      battery: this.battery,
      altitude: this.altitude,
      speed: this.speed,
      latitude: this.latitude,
      longitude: this.longitude,
      status: this.status,
      missionProgress: this.missionProgress,
      userControlled: this.userControlled,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = { Drone, STATUSES };
