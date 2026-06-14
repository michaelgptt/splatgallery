// app/viewer/[sceneId]/SuperSplatViewer.tsx
'use client'

interface Props {
  contentUrl: string;     // absolute URL to the splat
  collisionUrl?: string;  // optional absolute URL to the .voxel.json (or .glb) collision file
  className?: string;
}

//?content=<encoded url> <-- Tells viewer which splat file to load
//?collision=<encoded url> <-- Optional; viewer reads ?collision (or ?voxel) for walk-mode collisions
export function SuperSplatViewer({ contentUrl, collisionUrl, className }: Props) {
  let src = `/supersplat-viewer/index.html?content=${encodeURIComponent(contentUrl)}&noui`;
  if (collisionUrl) {
    src += `&collision=${encodeURIComponent(collisionUrl)}`;
  }

  // Sandbox trade-off, intentional:
  //   allow-same-origin is required — the viewer fetch()es its own settings.json
  //     and the splat file, which only works under connect-src 'self'.
  //   allow-scripts + allow-same-origin together technically let the framed
  //     document remove its own sandbox. We accept that here because the viewer
  //     is first-party, prebuilt, static content whose only input is a URL param.
  //   Future work: serve the viewer from a separate subdomain so it is genuinely
  //     cross-origin, then allow-same-origin can be dropped for a real sandbox.
  //     (See REFACTOR_PLAN "Future considerations: Real iframe sandbox".)
  return (
    <iframe
      src={src}
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      className={`border-0 ${className ?? ''}`.trim()}
      allow="xr-spatial-tracking"
    />
  );
}
