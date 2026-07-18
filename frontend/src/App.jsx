import { DroneProvider } from './context/DroneContext.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <DroneProvider>
      <Dashboard />
    </DroneProvider>
  );
}
