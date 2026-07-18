import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api during `npm run dev` so the frontend can be started with
// zero configuration against the backend running on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
