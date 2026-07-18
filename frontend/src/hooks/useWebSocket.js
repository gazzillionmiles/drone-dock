import { useEffect, useRef, useState, useCallback } from 'react';

const MAX_BACKOFF_MS = 10000;

function wsUrlFromLocation() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // In dev, Vite serves on 5173 but the WS server lives on the backend
  // port (3000). In production both are typically served from the same
  // origin, so this falls back to same-host.
  const isDev = window.location.port === '5173';
  const host = isDev ? `${window.location.hostname}:3000` : window.location.host;
  return `${proto}://${host}/ws`;
}

/**
 * Owns the WebSocket lifecycle: connect, auto-reconnect with backoff,
 * full-state sync on (re)connect, delta merging on telemetry events, and
 * replying to server heartbeats. Exposes plain state so components stay
 * simple.
 */
export function useWebSocket() {
  const [drones, setDrones] = useState({}); // id -> drone
  const [status, setStatus] = useState('connecting'); // connecting | open | disconnected
  const [pulse, setPulse] = useState(0); // increments on every heartbeat ping, drives the signature UI
  const wsRef = useRef(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef(null);
  const subscriptionRef = useRef(null); // null = all drones

  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrlFromLocation());
    wsRef.current = ws;
    setStatus((s) => (s === 'open' ? s : 'connecting'));

    ws.onopen = () => {
      setStatus('open');
      backoffRef.current = 1000;
      if (subscriptionRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', droneIds: subscriptionRef.current }));
      }
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return; // ignore malformed frames from the network layer
      }

      if (msg.type === 'sync') {
        const next = {};
        for (const drone of msg.payload) next[drone.id] = drone;
        setDrones(next);
      } else if (msg.type === 'telemetry') {
        setDrones((prev) => {
          const existing = prev[msg.payload.id] || {};
          return { ...prev, [msg.payload.id]: { ...existing, ...msg.payload } };
        });
      } else if (msg.type === 'ping') {
        setPulse((p) => p + 1);
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 1.7, MAX_BACKOFF_MS);
      connect();
    }, backoffRef.current);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((droneIds) => {
    subscriptionRef.current = droneIds;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', droneIds }));
    }
  }, []);

  return { drones, status, pulse, subscribe };
}
