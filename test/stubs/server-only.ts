// Empty stand-in for the `server-only` package under Vitest.
// The real package throws when imported outside a React Server Component, which
// would break unit tests that import lib/scenes.ts. Aliased in via vitest.config.ts.
export {}
