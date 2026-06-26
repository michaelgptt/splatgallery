# Deploying Splatgallery

A personal runbook for redeploying the web app to the VM after merging changes
into `main`, plus a path toward automating it with GitHub Actions.

Setup this assumes (from how the VM is configured today):

- **Ubuntu VM**, reached over **SSH**, commands run in `bash`.
- A **git clone** of this repo lives on the VM.
- The app runs as a **Docker Compose** (v2 plugin → `docker compose`) service
  (`web`) that builds the image from `Dockerfile.txt` and binds host port `3000`
  → container port `3000`.
- **nginx** terminates **HTTPS** for **biglab.usask.ca** (Let's Encrypt / Certbot)
  and reverse-proxies to `localhost:3000`. See [§6](#6-the-nginx-reverse-proxy).
- The heavy splat assets live **only on the VM** under
  `./public/processed-data` and are **bind-mounted read-only** into the
  container. They are not in git and not baked into the image.

---

## 1. Mental model — what a redeploy actually does

When you merge code into `main` and redeploy, this is the chain of events:

```
git pull                →  new source code lands on the VM
docker compose build    →  Next.js is rebuilt inside a fresh image
                           (npm ci → next build → standalone output)
docker compose up -d    →  old container is replaced by one running the new image
reverse proxy           →  unchanged; keeps pointing at 127.0.0.1:3000
```

Two things to keep straight, because they live in **different places**:

| Thing                                                 | Where it lives                             | How it updates                                                 |
| ----------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| App code, `public/scenes.json`, the SuperSplat viewer | **Baked into the image** at build time     | Requires an **image rebuild**                                  |
| Splat assets in `public/processed-data/<scene>/…`     | **On the VM disk**, bind-mounted read-only | Just copy files to the VM; **no rebuild needed** for the bytes |

> **Important consequence:** adding a new scene is usually _both_ jobs at once —
> you edit `public/scenes.json` (code → needs a rebuild) **and** you drop the new
> scene's asset folder into `public/processed-data` on the VM (bytes → just a
> file copy). See [§4](#4-when-you-add-or-change-a-scene-asset-sync).

What **survives** a redeploy: the bind-mounted `public/processed-data` assets,
and anything outside the container (the reverse proxy, TLS certs, the OS).

---

## 3. The redeploy runbook (every merge to `main`)

### Step 1 — Merge to `main` (on your machine / GitHub)

Merge your feature branch into `main` and make sure it's pushed to GitHub. Per
the repo convention, features are developed on a branch and merged in — the VM
only ever tracks `main`.

### Step 2 — SSH into the VM and go to the repo

```bash
ssh you@your-vm-host
cd /path/to/splatgallery        # the clone on the VM
```

### Step 3 — Pull the latest `main`

```bash
git checkout main
git pull --ff-only origin main
```

`--ff-only` keeps the VM's checkout a clean mirror of `main` and fails loudly
instead of creating a surprise merge commit. If it fails, see
[§7 Troubleshooting](#7-troubleshooting).

### Step 4 — Sync scene assets _if you added/changed a scene_

If this deploy includes a new or changed scene, copy its assets to the VM now.
See [§4](#4-when-you-add-or-change-a-scene-asset-sync) for the exact command.
**Skip this step for code-only changes** (the common case).

### Step 5 — Rebuild the image and restart the container

```bash
docker compose up -d --build
```

This rebuilds the image from the new source and, because the image changed,
recreates the `web` container. `-d` runs it detached. There's a brief blip
(seconds) while the container swaps — fine for this app.

### Step 6 — Verify

```bash
docker compose ps                 # web should be "running" / healthy
docker compose logs -f web        # watch startup; Ctrl-C to stop following
curl -I http://127.0.0.1:3000     # expect HTTP/1.1 200 (or 307 redirect from /)
```

Then load **https://biglab.usask.ca** in a browser and hard-refresh
(`Ctrl-Shift-R`). Open a scene in the viewer to confirm assets still resolve.
If the page is up locally on `:3000` but broken on the domain, the problem is in
**nginx**, not the container — see [§6](#6-the-nginx-reverse-proxy) and
[§7](#7-troubleshooting).

### Step 7 — Clean up old images (occasionally)

Each rebuild leaves the previous image behind as a dangling layer; they add up.

```bash
docker image prune -f
```

### Copy-paste quick version (code-only deploy)

```bash
ssh you@your-vm-host
cd /path/to/splatgallery
git checkout main && git pull --ff-only origin main
docker compose up -d --build
docker compose ps && curl -I http://127.0.0.1:3000
docker image prune -f
```

---

## 4. When you add or change a scene (asset sync)

A scene has **two halves** that update independently:

1. **`public/scenes.json`** — the metadata entry (`id`, `title`, `thumb`,
   `splat`, `subtitle`, optional `collisions`). This is **code**: commit it,
   merge to `main`, and it lands on the VM via `git pull` and takes effect on the
   next **rebuild** (Step 6). It is baked into the image.

2. **The asset folder** — `public/processed-data/<scene>/…` (the `-sog/` splat
   tiles and any `.voxel/` collision data). These are **not** in git and **not**
   in the image. They must be copied onto the VM's disk, into the bind-mounted
   `public/processed-data` directory.

Because the assets are bind-mounted (not baked in), copying them does **not**
require a rebuild — the running container sees new files immediately. But since
adding a scene also changes `scenes.json`, you'll typically do the rebuild
anyway.

**Recommended copy command** — `rsync` over SSH from wherever you process the
splats (resumable and only transfers diffs, which matters for multi-GB scenes):

```bash
# Run from the machine that HAS the processed assets, pointing at the VM.
rsync -avh --progress \
  ./public/processed-data/<scene>/ \
  you@your-vm-host:/path/to/splatgallery/public/processed-data/<scene>/
```

`scp -r` works too but isn't resumable:

```bash
scp -r ./public/processed-data/<scene> \
  you@your-vm-host:/path/to/splatgallery/public/processed-data/
```

> The bind mount is **read-only** (`:ro`) from the container's side — that only
> stops the _app_ from writing there. You (the host user over SSH) can still
> write to the directory normally.

**Order of operations when adding a scene:**

1. Process assets locally → get `public/processed-data/<scene>/…`.
2. Edit `public/scenes.json`, commit, merge to `main`.
3. On the VM: Step 3 (`git pull`) → Step 4 (rsync the new asset folder) →
   Step 5 (`up -d --build`) → Step 6 (verify the scene loads).

---

## 5. Rollback (if a deploy goes bad)

The VM is just a git checkout, so rolling back is "check out the last good
commit and rebuild":

```bash
cd /path/to/splatgallery
git log --oneline -n 10            # find the last-good commit hash
git checkout <good-hash>           # detached HEAD at the good commit
docker compose up -d --build
# when main is fixed, go back to tracking it:
git checkout main && git pull --ff-only origin main && docker compose up -d --build
```

Assets are untouched by rollback — they live outside git and the image.

---

## 6. The nginx reverse proxy

nginx on the VM terminates HTTPS for **biglab.usask.ca** (Let's Encrypt / Certbot
certs) and forwards traffic to the container on `localhost:3000`. A redeploy swaps
the container _behind_ that port; the mapping (`3000:3000`) is stable, so **nginx
needs no changes for a normal code deploy.**

The live config lives on the VM (a copy is kept in the repo for reference):

- `/etc/nginx/nginx.conf` — global config (copy: `./nginx.conf`). Sets gzip,
  TLS protocols, and `include`s the site below.
- `/etc/nginx/sites-enabled/default` — the site block (copy: `./default`). It:
  - returns `444` for requests whose `Host` doesn't match (catch-all on :80);
  - serves `biglab.usask.ca` on :443, `proxy_pass http://localhost:3000`, with
    `Upgrade`/`Connection` headers and `proxy_buffering off` +
    `X-Accel-Buffering no` so Next.js streaming / Server Actions work;
  - 301-redirects plain HTTP (:80) → HTTPS.

> The repo copies (`./default`, `./nginx.conf`) are **reference only** — editing
> them does nothing until you scp them to the VM paths above. `./default` is
> git-ignored.

You only touch nginx when **its own** config changes, e.g.:

- you change the domain, TLS, or add a route;
- you change the host port in `docker-compose.yml` (then update `proxy_pass` to
  match);
- large splat downloads need a more generous `proxy_read_timeout`.

After editing the live config on the VM:

```bash
sudo nginx -t                 # validate before reloading — never skip this
sudo systemctl reload nginx   # zero-downtime reload
```

Certbot auto-renews the TLS cert via a systemd timer; no action needed on deploy.
The app's own CSP is handled inside Next.js (`proxy.ts`), **not** in nginx.

---

## 7. Troubleshooting

| Symptom                                         | Likely cause / fix                                                                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git pull --ff-only` fails                      | Someone/something committed on the VM. Run `git status`; if it's junk, `git reset --hard origin/main` (this discards local edits — assets are safe, they're untracked). |
| Build fails at `npm ci`                         | `package-lock.json` out of sync with `package.json`, or the lockfile didn't get pulled. Re-pull; ensure both are committed.                                             |
| Build uses old code                             | You forgot `--build` on the `docker compose up`.                                                                                                                        |
| Container restart-loops                         | `docker compose logs web` — usually a runtime crash or a bad env var.                                                                                                   |
| App works on `:3000` but not on biglab.usask.ca | nginx issue: `sudo nginx -t`, `sudo systemctl status nginx`, check `/var/log/nginx/error.log`, confirm the cert is valid (`sudo certbot certificates`).                 |
| Scene 404s / viewer is blank                    | Asset folder missing or misnamed under `public/processed-data/<scene>/`, or the `splat`/`collisions` paths in `scenes.json` don't match the folder layout.              |
| Disk filling up                                 | Old images: `docker image prune -f` (or `docker system prune` for a deeper clean — read what it removes first).                                                         |

---

## 8. Toward CI/CD — GitHub Actions deploying over SSH

The goal you described — "a listener for every merge into `main`" — is exactly a
**GitHub Actions workflow triggered on push to `main`**. GitHub already watches
the repo; on each merge it spins up a runner that **SSHes into your VM and runs
the same redeploy steps** from §3. Push-based, nothing extra to install on the
VM beyond what's already there.

### 8a. Put the runbook in a script on the VM

So the workflow stays tiny and the manual path and the automated path run the
_exact same_ commands, create `deploy-scripts/deploy.sh` in the repo (the
`.dockerignore` already excludes `deploy-scripts`, so it won't bloat the image):

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /path/to/splatgallery

git checkout main
git pull --ff-only origin main

docker compose up -d --build
docker image prune -f

echo "Deployed: $(git rev-parse --short HEAD)"
```

Make it executable on the VM once: `chmod +x deploy-scripts/deploy.sh`.
(Asset sync stays manual — you don't want CI shipping multi-GB splats.)

### 8b. Add SSH secrets to the GitHub repo

Create a dedicated SSH key pair for deploys (don't reuse your personal key):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
# put the PUBLIC key on the VM:
ssh-copy-id -i deploy_key.pub you@your-vm-host
# (or append deploy_key.pub to ~/.ssh/authorized_keys on the VM)
```

In the GitHub repo → **Settings → Secrets and variables → Actions**, add:

- `VM_HOST` — the VM's hostname or IP
- `VM_USER` — your SSH user
- `VM_SSH_KEY` — the **contents of the private key** (`deploy_key`)

Then delete the local private key copy, or store it safely.

### 8c. The workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VM

on:
  push:
    branches: [main] # fires on every merge/push to main
  workflow_dispatch: {} # lets you trigger a deploy manually from the Actions tab

concurrency:
  group: deploy-main # never run two deploys at once
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: bash /path/to/splatgallery/deploy-scripts/deploy.sh
```

That's the whole pipeline: merge to `main` → GitHub runs this → your VM rebuilds
and restarts. Watch runs under the repo's **Actions** tab; failures email you.

### 8d. Sensible next steps once that works

- **Build/lint before deploying.** Add a job that runs `npm ci && npm run lint &&
npm run build` (and `npm test` — the repo has Vitest wired up) and only deploy
  if it passes. Catches breakage before it hits the VM.
- **Smoke-test after deploy.** Have the script `curl -fsS http://127.0.0.1:3000`
  at the end so a broken boot fails the workflow loudly.
- **Notifications.** Wire a Slack/Discord/email step on failure.
- **Harden the SSH key** to a single command if you want least-privilege
  (`command="..."` in `authorized_keys`).

---

## TL;DR

```bash
# every merge to main, on the VM:
cd /path/to/splatgallery
git checkout main && git pull --ff-only origin main
# (rsync new scene assets into public/processed-data ONLY if you added a scene)
docker compose up -d --build
docker compose ps && curl -I http://127.0.0.1:3000
docker image prune -f
```
