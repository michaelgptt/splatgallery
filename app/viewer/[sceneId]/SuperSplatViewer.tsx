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

  return (
    <iframe
      src={src}
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      className={`border-0 ${className ?? ''}`.trim()}
      allow="xr-spatial-tracking"
    />
  );
}
