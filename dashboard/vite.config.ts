import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/v1': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/docs': 'http://localhost:3000',
    },
  },
});
