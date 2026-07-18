import DroneCard from './DroneCard.jsx';
import './DroneGrid.css';

export default function DroneGrid({ drones, onRename, onCommand }) {
  if (!drones.length) {
    return <div className="drone-grid__empty mono">Waiting for telemetry…</div>;
  }

  return (
    <div className="drone-grid">
      {drones.map((drone) => (
        <DroneCard key={drone.id} drone={drone} onRename={onRename} onCommand={onCommand} />
      ))}
    </div>
  );
}
