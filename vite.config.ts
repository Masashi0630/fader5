import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // スマホ実機から LAN 経由で開けるようにする
  server: { host: true },
  preview: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
