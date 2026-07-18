const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body?.data;
}

export const droneApi = {
  list: () => request('/drones'),
  get: (id) => request(`/drones/${id}`),
  rename: (id, name) => request(`/drones/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  sendCommand: (id, command) =>
    request(`/drones/${id}/command`, { method: 'POST', body: JSON.stringify({ command }) }),
};
