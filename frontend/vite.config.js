import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev, proxy API calls to local backend
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/hook': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Use relative paths in build
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
