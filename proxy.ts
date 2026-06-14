// Next.js provides these types for handling incoming HTTP requests and building responses.
import { NextRequest, NextResponse } from 'next/server'

// Relaxed CSP for the embedded SuperSplat viewer (`/supersplat-viewer/*`).
//
// The viewer is a prebuilt, static, first-party app served from public/. Its
// index.html contains inline <script> blocks and inline event handlers that a
// nonce can't cover (Next.js never renders that file). Because the viewer's
// only input is a URL parameter, allowing 'unsafe-inline' *inside this iframe
// document* is low-risk — and it's isolated from the strict policy on the app
// pages, which is where real/user-facing content lives.
//
//   script-src 'unsafe-inline'  → the two inline module scripts + inline
//                                 onpointerdown/onwheel handlers
//   'wasm-unsafe-eval' + blob:  → WebAssembly + the engine's blob Web Workers
//   style-src 'unsafe-inline'   → the viewer sets element styles at runtime
//   connect-src 'self'          → fetch() of settings.json + the splat file
//   frame-ancestors 'self'      → must allow being framed by the same-origin app
const VIEWER_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ')

// This function runs on every incoming page request (via Next.js middleware).
// Its job is to attach a Content Security Policy (CSP) header to each response.
export function proxy(request: NextRequest) {

  // The embedded viewer subtree gets the relaxed policy above. It's a static
  // document with its own response headers, so a looser CSP here does not
  // weaken the strict policy on the app page that embeds it.
  if (request.nextUrl.pathname.startsWith('/supersplat-viewer')) {
    const viewerResponse = NextResponse.next()
    viewerResponse.headers.set('Content-Security-Policy', VIEWER_CSP)
    return viewerResponse
  }

  // Generate a random one-time token called a "nonce" (number used once).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Check whether the app is running in development mode (npm run dev)
  // or production mode (npm run build && npm run start).
  const isDev = process.env.NODE_ENV === 'development'

  // Build the CSP policy string. Each directive controls a different type of resource:
  //
  //   default-src 'self'
  //     → Catch-all rule: only load resources from the same origin (our own domain).
  //
  //   script-src 'self' 'nonce-...' 'strict-dynamic' [+ 'unsafe-eval' in dev]
  //     → Scripts must come from our own domain OR carry the matching nonce.
  //     → 'strict-dynamic' lets trusted scripts load other scripts dynamically.
  //     → 'unsafe-eval' is added only in development because Next.js hot-reload
  //       uses eval() internally. We never want this in production.
  //     → Note: WebAssembly ('wasm-unsafe-eval') is NOT allowed here — WASM only
  //       runs inside the viewer iframe, which has its own relaxed policy.
  //
  //   style-src 'self'
  //     → Stylesheets may only come from our own origin. No 'unsafe-inline':
  //       all styling is via Tailwind classes / external CSS. There are no inline
  //       style="..." attributes on app pages (the gallery thumbnail uses a real
  //       <img>, not a CSS background), so a nonce/keyword is unnecessary.
  //
  //   font-src 'self'
  //     → Fonts come only from our own origin. Material Symbols is self-hosted
  //       (see public/fonts + the @font-face in app/globals.css); Inter is
  //       self-hosted by next/font. No third-party font CDN.
  //
  //   img-src 'self' blob: data:
  //     → Images can come from our domain, blob URLs (in-memory files),
  //       or data: URIs (base64-embedded images). The 3D viewer needs blob: and data:.
  //
  //   connect-src 'self'
  //     → fetch() and XHR requests can only go to our own origin.
  //       This covers loading .ply / .lcc splat files at runtime.
  //
  //   worker-src 'self' blob:
  //     → Web Workers (background threads) can be created from our domain or blob URLs.
  //       The SuperSplat viewer spawns workers this way to process 3D data off the main thread.
  //
  //   object-src 'none'
  //     → Block <object>, <embed>, and <applet> tags entirely (legacy attack vectors).
  //
  //   base-uri 'self'
  //     → The <base> HTML tag (which changes relative URL resolution) can only point
  //       to our own origin, preventing base-tag hijacking attacks.
  //
  //   form-action 'self'
  //     → HTML forms can only submit to our own origin.
  //
  //   frame-ancestors 'self'
  //     → Only same-origin pages can embed our pages in an <iframe>.
  //       Must be 'self' (not 'none') because the viewer page embeds
  //       /supersplat-viewer/index.html in an iframe — both are same-origin.
  //
  //   upgrade-insecure-requests
  //     → Automatically upgrade any http:// resource loads to https://.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self';
    font-src 'self';
    img-src 'self';
    connect-src 'self';
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
`

//  img-src 'self' blob: data:;


  // Clean up the multi-line string: collapse runs of whitespace into a single space
  // and trim leading/trailing whitespace. HTTP headers must be a single line.
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim()

  // Copy the incoming request's headers so we can add our own values.
  const requestHeaders = new Headers(request.headers)

  // Pass the nonce to the app via a custom header called 'x-nonce'.
  // Next.js server components can read this header to inject the nonce
  // into <script nonce="..."> and <style nonce="..."> tags in the HTML output.
  requestHeaders.set('x-nonce', nonce)

  // Also attach the full CSP string to the request headers.
  // This makes the policy available to server-side rendering if needed.
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  // Tell Next.js to continue processing the request, but use our modified headers.
  // NextResponse.next() means "don't block or redirect — just pass through".
  const response = NextResponse.next({
  request: {
      headers: requestHeaders,
    },
  })

  // Also set the CSP header on the *response* sent back to the browser.
  // This is what actually enforces the policy — browsers read it from the response.
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  return response
}





//To-Do exclude processed-files since I don't think we need to pass them through our proxy.ts
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|/processed-data).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
