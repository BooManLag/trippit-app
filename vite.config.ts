import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
