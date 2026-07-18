import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDrones } from '../context/DroneContext.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import FleetSummary from '../components/FleetSummary.jsx';
import DroneGrid from '../components/DroneGrid.jsx';
import './Dashboard.css';

const ALL_DRONE_IDS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function Dashboard() {
  const { drones, status, pulse, rename, sendCommand, actionError, clearActionError, subscribe } = useDrones();
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!actionError) return undefined;
    const t = setTimeout(clearActionError, 4000);
    return () => clearTimeout(t);
  }, [actionError, clearActionError]);

  const toggleSelectDrone = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      subscribe(next.length > 0 ? next : null);
      return next;
    });
  }, [subscribe]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    subscribe(null);
  }, [subscribe]);

  const displayedDrones = useMemo(() => {
    if (selectedIds.length === 0) return drones;
    return drones.filter((d) => selectedIds.includes(d.id));
  }, [drones, selectedIds]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <div className="dashboard__eyebrow mono">DRONE DOCK / FLEET CONTROL</div>
          <h1 className="dashboard__title">Live Telemetry</h1>
        </div>
        <ConnectionStatus status={status} pulse={pulse} />
      </header>

      {status === 'disconnected' && (
        <div className="dashboard__banner">Disconnected… attempting to reconnect</div>
      )}

      {actionError && (
        <div className="dashboard__banner dashboard__banner--error">{actionError}</div>
      )}

      <div className="subscription-filter">
        <span className="subscription-filter__label mono">WS SUBSCRIPTION FILTER:</span>
        <div className="subscription-filter__buttons">
          <button
            className={`filter-btn mono ${selectedIds.length === 0 ? 'filter-btn--active' : ''}`}
            onClick={clearSelection}
          >
            ALL DRONES
          </button>
          {ALL_DRONE_IDS.map((id) => (
            <button
              key={id}
              className={`filter-btn mono ${selectedIds.includes(id) ? 'filter-btn--active' : ''}`}
              onClick={() => toggleSelectDrone(id)}
            >
              #{String(id).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      <FleetSummary drones={displayedDrones} />

      <DroneGrid drones={displayedDrones} onRename={rename} onCommand={sendCommand} />
    </div>
  );
}
