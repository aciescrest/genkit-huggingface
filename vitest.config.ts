import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' if you are testing in the browser
    globals: true,
  },
});