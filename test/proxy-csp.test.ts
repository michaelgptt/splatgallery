import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

// Run the middleware against a given path and read back the CSP it sets on the
// response. Vitest's NODE_ENV is 'test' (not 'development'), so these assertions
// reflect production behaviour: no 'unsafe-eval'.
function cspFor(pathname: string): string {
  const request = new NextRequest(new URL(`https://biglab.usask.ca${pathname}`))
  const response = proxy(request)
  return response.headers.get('content-security-policy') ?? ''
}

const nonceOf = (csp: string): string | undefined =>
  csp.match(/'nonce-([^']+)'/)?.[1]

describe('viewer subtree gets the relaxed CSP', () => {
  const csp = cspFor('/supersplat-viewer/index.html')

  it('allows the inline scripts, WASM and blob workers the prebuilt viewer needs', () => {
    expect(csp).toContain("'unsafe-inline'")
    expect(csp).toContain("'wasm-unsafe-eval'")
    expect(csp).toContain('blob:')
  })

  it('still allows being framed by the same-origin app', () => {
    expect(csp).toContain("frame-ancestors 'self'")
  })

  it('does NOT use the strict nonce machinery', () => {
    expect(csp).not.toContain('nonce-')
    expect(csp).not.toContain('strict-dynamic')
  })
})

describe('app pages get the strict nonce CSP', () => {
  const csp = cspFor('/gallery')

  it('is nonce + strict-dynamic based', () => {
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).toMatch(/'nonce-[^']+'/)
  })

  it('never allows unsafe-inline or unsafe-eval scripts in production', () => {
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('does not leak the viewer-only WASM/blob relaxations', () => {
    expect(csp).not.toContain("'wasm-unsafe-eval'")
  })

  it('locks down objects, framing and base-uri', () => {
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
  })
})

describe('the nonce is fresh per request', () => {
  it('issues a different nonce on each call', () => {
    const first = nonceOf(cspFor('/gallery'))
    const second = nonceOf(cspFor('/gallery'))
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first).not.toBe(second)
  })
})
