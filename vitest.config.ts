import { defineConfig } from 'vitest/config'
import path from 'node:path'

const root = path.resolve(__dirname)

// Vitest configuration for unit tests under test/.
export default defineConfig({
  resolve: {
    alias: [
      // lib/scenes.ts imports `server-only` as a guard against being bundled into
      // client code. That module throws when imported outside a React Server
      // Component, so under test we swap it for an empty stub.
      {
        find: /^server-only$/,
        replacement: path.resolve(root, 'test/stubs/server-only.ts'),
      },
      // Mirror the tsconfig "@/*" -> "./*" path alias, scoped to "@/..." so it does
      // not shadow @scoped npm packages like @playcanvas/*.
      { find: /^@\//, replacement: root + '/' },
    ],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
