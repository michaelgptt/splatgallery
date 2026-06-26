#!/usr/bin/env bash
#
# Splatgallery redeploy script — the single source of truth for "deploy".
# Both the manual path (you, over SSH) and the automated path (GitHub Actions,
# see .github/workflows/deploy.yml) run THIS exact script, so they never drift.
#
# Runs the runbook from DEPLOY.md §3: pull latest main, rebuild the image,
# recreate the container, prune dangling images.
#
# Asset sync is intentionally NOT here — never ship multi-GB splats through CI.
# New scenes still need a manual rsync into public/processed-data (DEPLOY.md §4).
#
# One-time setup on the VM:  chmod +x deploy-scripts/deploy.sh

set -euo pipefail   # -e: stop on first error  -u: error on unset vars  -o pipefail: catch errors mid-pipe

# ── FILL THIS IN ──────────────────────────────────────────────────────────────
# Absolute path to the git clone of this repo ON THE VM (e.g. /home/youruser/splatgallery).
REPO_DIR="/path/to/splatgallery"   # ← CHANGE ME
# ──────────────────────────────────────────────────────────────────────────────

cd "$REPO_DIR"

echo "==> Pulling latest main"
git checkout main
git pull --ff-only origin main

echo "==> Rebuilding image and recreating container"
docker compose up -d --build

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Deployed: $(git rev-parse --short HEAD)"
