/**
 * Returns only the fields that changed between two drone snapshots
 * (plus id, which is always included as the key). If nothing besides
 * `updatedAt` changed, returns null so callers can skip sending a
 * no-op/duplicate event entirely.
 */
function diffDrone(previous, current) {
  if (!previous) return { ...current };

  const delta = { id: current.id };
  let changed = false;

  for (const key of Object.keys(current)) {
    if (key === 'id' || key === 'updatedAt') continue;
    if (previous[key] !== current[key]) {
      delta[key] = current[key];
      changed = true;
    }
  }

  if (!changed) return null;
  delta.updatedAt = current.updatedAt;
  return delta;
}

module.exports = { diffDrone };
