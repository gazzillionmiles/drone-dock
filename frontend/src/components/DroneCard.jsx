import { useState, memo } from 'react';
import { statusColor, batteryColor, timeAgo, statusLabel } from '../utils/format.js';
import './DroneCard.css';

const COMMANDS = [
  { label: 'Takeoff', value: 'TAKEOFF' },
  { label: 'Land', value: 'LAND' },
  { label: 'Return home', value: 'RETURN_HOME' },
  { label: 'Pause', value: 'PAUSE_MISSION' },
];

const DroneCard = memo(function DroneCard({ drone, onRename, onCommand }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(drone.name);

  const submitRename = () => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== drone.name) onRename(drone.id, trimmed);
    else setDraftName(drone.name);
  };

  const isCompleted = drone.status === 'COMPLETED';

  return (
    <article className="drone-card" style={{ '--status-color': statusColor(drone.status) }}>
      <header className="drone-card__head">
        <div className="drone-card__id mono">#{String(drone.id).padStart(2, '0')}</div>
        {editing ? (
          <input
            className="drone-card__name-input mono"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') {
                setDraftName(drone.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            className="drone-card__name"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${drone.name}`}
            title="Click to rename"
          >
            {drone.name}
          </button>
        )}
        <span className="status-pill">{statusLabel(drone.status)}</span>
      </header>

      <div className="drone-card__metric">
        <div className="metric-label">Battery</div>
        <div className="battery-bar">
          <div
            className="battery-bar__fill"
            style={{ width: `${drone.battery}%`, background: batteryColor(drone.battery) }}
          />
        </div>
        <div className="metric-value mono">{drone.battery.toFixed(1)}%</div>
      </div>

      <div className="drone-card__grid">
        <div>
          <div className="metric-label">Altitude</div>
          <div className="metric-value mono">{drone.altitude} m</div>
        </div>
        <div>
          <div className="metric-label">Speed</div>
          <div className="metric-value mono">{drone.speed} m/s</div>
        </div>
        <div>
          <div className="metric-label">Position</div>
          <div className="metric-value mono metric-value--small">
            {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="metric-label">Updated</div>
          <div className="metric-value mono metric-value--small">{timeAgo(drone.updatedAt)}</div>
        </div>
      </div>

      <div className="drone-card__metric">
        <div className="metric-label">Mission</div>
        <div className="mission-bar">
          <div
            className="mission-bar__fill"
            style={{ width: `${drone.missionProgress ?? 0}%` }}
          />
        </div>
        <div className="metric-value mono">{drone.missionProgress ?? 0}%</div>
      </div>

      <div className="drone-card__commands">
        {COMMANDS.map((cmd) => (
          <button
            key={cmd.value}
            className="cmd-btn"
            disabled={isCompleted}
            onClick={() => onCommand(drone.id, cmd.value)}
          >
            {cmd.label}
          </button>
        ))}
      </div>
    </article>
  );
});

export default DroneCard;
