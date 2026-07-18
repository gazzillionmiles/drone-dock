import './FleetSummary.css';

export default function FleetSummary({ drones }) {
  const total = drones.length;
  const airborne = drones.filter((d) => ['TAKING_OFF', 'FLYING', 'RETURNING', 'LANDING'].includes(d.status)).length;
  const completed = drones.filter((d) => d.status === 'COMPLETED').length;
  const lowBattery = drones.filter((d) => d.battery <= 20).length;
  const avgBattery = total ? (drones.reduce((sum, d) => sum + d.battery, 0) / total).toFixed(0) : '—';

  const stats = [
    { label: 'Fleet', value: total },
    { label: 'Airborne', value: airborne },
    { label: 'Completed', value: completed },
    { label: 'Avg battery', value: `${avgBattery}%` },
    { label: 'Low battery', value: lowBattery, warn: lowBattery > 0 },
  ];

  return (
    <div className="fleet-summary">
      {stats.map((s) => (
        <div className="fleet-summary__stat" key={s.label}>
          <div className={`fleet-summary__value mono ${s.warn ? 'fleet-summary__value--warn' : ''}`}>{s.value}</div>
          <div className="fleet-summary__label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
