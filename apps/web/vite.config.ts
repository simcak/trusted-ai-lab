import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo-name>/; routing uses HashRouter (no SPA rewrites there).
export const BASE_PATH = '/trusted-ai-lab/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    target: 'es2022',
  },
});
