import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        'pending-invites': resolve(__dirname, 'pending-invites.html'),
        'auth-status': resolve(__dirname, 'auth-status.html'),
        'respond-result': resolve(__dirname, 'respond-result.html'),
      },
    },
  },
  server: {
    port: 5174,
  },
});
