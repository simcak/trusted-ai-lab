import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
      // CSS is skipped in tests except the tokens, which tokens.test.ts reads as text (?raw).
      css: { include: [/styles\/tokens\.css/] },
    },
  }),
);
