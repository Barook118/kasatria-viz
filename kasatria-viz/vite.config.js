import { defineConfig } from 'vite';

export default defineConfig({
  // Base path — change to '/repo-name/' if deploying to GitHub Pages in a subfolder
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    open: true,
  },
});
