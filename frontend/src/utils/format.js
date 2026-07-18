export const STATUS_COLOR = {
  IDLE: 'var(--idle)',
  TAKING_OFF: 'var(--amber)',
  FLYING: 'var(--cyan)',
  RETURNING: 'var(--amber)',
  LANDING: 'var(--amber)',
  COMPLETED: 'var(--green)',
};

export function statusColor(status) {
  return STATUS_COLOR[status] || 'var(--idle)';
}

export function batteryColor(battery) {
  if (battery <= 15) return 'var(--red)';
  if (battery <= 35) return 'var(--amber)';
  return 'var(--green)';
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.round(diffMs / 1000);
  if (secs < 2) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `${mins}m ago`;
}

export function statusLabel(status) {
  return status.replace(/_/g, ' ');
}
