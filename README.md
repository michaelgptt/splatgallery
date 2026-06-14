# Splatgallery

A web gallery for viewing high-fidelity 3D Gaussian Splat scenes from the
University of Saskatchewan BigLab. Browse a grid of scenes and open any one in an
interactive 3D viewer.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, `output: "standalone"`)
- React 19 + TypeScript (strict)
- Tailwind CSS v4
- [SuperSplat viewer](https://github.com/playcanvas/supersplat) (prebuilt, embedded)

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build (standalone)
npm run start    # run the standalone server
npm run lint     # eslint
```

## Scene data

Scenes live under `public/processed-data/`. The directory is tracked by git, but
**its contents are not** — the scene data is very large and is delivered to the
host out-of-band (scp + a docker volume), never committed. The example
`airplaneroom` scene exists locally but is not in the repo.

Each scene follows this layout:

```
public/processed-data/<scene>/
  <scene>-sog/                 # the splat (SOG format, level-of-detail tiled)
    lod-meta.json              # entry point referenced as "splat" in scenes.json
    env/                       # environment map (.webp planes + meta.json)
    <lod>_<tile>/              # LOD tiles, e.g. 0_0 … 3_0
  <scene>.voxel/               # collision data for walk-mode
    <scene>.voxel.json         # referenced as "collisions" in scenes.json
    <scene>.voxel.bin
```

### Adding a scene locally

1. Drop the scene folder under `public/processed-data/<scene>/`, following the
   layout above.
2. Add an entry to [`public/scenes.json`](public/scenes.json):

   ```json
   {
     "id": "2",
     "title": "My Scene",
     "subtitle": "By BigLab",
     "thumb": "/fallbackthumb.jpg",
     "splat": "/processed-data/<scene>/<scene>-sog/lod-meta.json",
     "collisions": "/processed-data/<scene>/<scene>.voxel/<scene>.voxel.json"
   }
   ```

   `id`, `title`, `subtitle`, `thumb`, and `splat` are required; `collisions` is
   optional. The gallery validates entries on load — a malformed entry throws in
   development and is skipped with a warning in production.

The scene files themselves are never committed.

## Deployment

Built as a Next.js standalone server. Splat data is copied to the host
separately (scp) and mounted into the application container via a docker volume,
so the large binaries are served from `public/processed-data/` without ever
living in the repo or image.
