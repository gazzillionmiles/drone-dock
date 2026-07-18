import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { droneApi } from '../services/api.js';

const DroneContext = createContext(null);

export function DroneProvider({ children }) {
  const { drones, status, pulse, subscribe } = useWebSocket();
  const [actionError, setActionError] = useState(null);

  const list = useMemo(
    () => Object.values(drones).sort((a, b) => a.id - b.id),
    [drones],
  );

  const rename = useCallback(async (id, name) => {
    try {
      await droneApi.rename(id, name);
      setActionError(null);
    } catch (err) {
      setActionError(err.message);
    }
  }, []);

  const sendCommand = useCallback(async (id, command) => {
    try {
      await droneApi.sendCommand(id, command);
      setActionError(null);
    } catch (err) {
      setActionError(err.message);
    }
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  const value = useMemo(
    () => ({
      drones: list,
      status,
      pulse,
      subscribe,
      rename,
      sendCommand,
      actionError,
      clearActionError,
    }),
    [list, status, pulse, subscribe, rename, sendCommand, actionError, clearActionError]
  );

  return <DroneContext.Provider value={value}>{children}</DroneContext.Provider>;
}

export function useDrones() {
  const ctx = useContext(DroneContext);
  if (!ctx) throw new Error('useDrones must be used within a DroneProvider');
  return ctx;
}
