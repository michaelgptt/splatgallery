import type { NextConfig } from 'next'

// Content Security Policy headers are set in proxy.ts (Next.js middleware),
// not here — the policy is path-dependent (strict for the app, relaxed for the
// embedded viewer), which middleware handles cleanly.

const nextConfig: NextConfig = {
    output: "standalone"
}

export default nextConfig
