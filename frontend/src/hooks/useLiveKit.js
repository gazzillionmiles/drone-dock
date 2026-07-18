import { useState, useEffect } from 'react';

export function useLiveKit(droneId) {
  const [token, setToken] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!droneId) return;

    let active = true;
    setLoading(true);
    setError(null);

    async function fetchToken() {
      try {
        const res = await fetch(`/api/livekit/token?droneId=${droneId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch LiveKit token: ${res.statusText}`);
        }
        const body = await res.json();
        if (active) {
          setToken(body.data.token);
          setRoomName(body.data.roomName);
          setServerUrl(body.data.serverUrl);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      active = false;
    };
  }, [droneId]);

  return { token, roomName, serverUrl, loading, error };
}
