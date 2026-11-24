import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo-name>/; routing uses HashRouter (no SPA rewrites there).
export const BASE_PATH = '/trusted-ai-lab/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    target: 'es2022',
    // The only chunk above Vite's 500 kB default is @huggingface/transformers (~544 kB), loaded
    // only after the user clicks „Načíst NER model". The initial JS budget is checked separately
    // by scripts/check-bundle-size.ts.
    chunkSizeWarningLimit: 600,
  },
});
