import { describe, it, expect } from 'vitest'
import { config } from '@/proxy'

// proxy.ts exports a Next.js middleware `config.matcher` whose `source` decides
// which request paths the middleware (proxy()) runs on. The source is already a
// plain regex (no :param tokens), so we can compile it directly and probe paths.
// Anchored ^...$ to mirror how Next matches the full pathname.
const source = (config.matcher[0] as { source: string }).source
const matcher = new RegExp(`^${source}$`)
const runsMiddleware = (pathname: string): boolean => matcher.test(pathname)

describe('middleware runs on app + viewer pages', () => {
  it.each([
    '/',
    '/gallery',
    '/viewer/thorv271',
    '/viewer/1',
    // The viewer document itself MUST go through middleware — that is where it
    // receives the relaxed VIEWER_CSP.
    '/supersplat-viewer/index.html',
  ])('runs on %s', (pathname) => {
    expect(runsMiddleware(pathname)).toBe(true)
  })
})

describe('middleware is skipped for framework + static asset paths', () => {
  it.each([
    '/api/health',
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
  ])('skips %s', (pathname) => {
    expect(runsMiddleware(pathname)).toBe(false)
  })
})

// --- PLAN3 Task 2 regression ------------------------------------------------
// The heavy splat tiles under /processed-data/ are served directly by nginx in
// production and should never pay the middleware cost (a crypto.randomUUID() +
// CSP build per tile). The matcher must EXCLUDE them.
//
// These are RED until the leading-slash bug at proxy.ts is fixed:
//   '/processed-data'  ->  'processed-data'
// (the exclusion is evaluated at a position with no leading slash, so as written
// it never matches and every tile still runs middleware).
describe('processed-data tiles skip middleware (PLAN3 Task 2)', () => {
  it.each([
    '/processed-data/airplaneroom/airplaneroom-sog/0_0/sh0.webp',
    '/processed-data/airplaneroom/airplaneroom-sog/lod-meta.json',
    '/processed-data/airplaneroom/airplaneroom.voxel/airplaneroom.voxel.json',
  ])('skips %s', (pathname) => {
    expect(runsMiddleware(pathname)).toBe(false)
  })

  it('treats processed-data as a path prefix (same semantics as api/_next)', () => {
    expect(runsMiddleware('/processed-data-anything')).toBe(false)
  })
})
