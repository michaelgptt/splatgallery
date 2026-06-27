#!/usr/bin/env bash
set -euo pipefail
REPO=/home/me/app
DATA=/srv/data
cd "$REPO"

git checkout main
git pull --ff-only origin main

# Mirror git-tracked light assets into the nginx web root (same checkout the image
# builds from → no drift; --chmod normalizes perms so we never chmod by hand).
rsync -a --delete --exclude='processed-data' --chmod=D755,F644 \
  "$REPO/public/" "$DATA/"

docker compose up -d --build
docker image prune -f
echo "Deployed: $(git rev-parse --short HEAD)"

# `chmod +x deploy-scripts/deploy.sh` once on the VM. Processed-data stays a
# separate manual sync (don't ship multi-GB splats through CI).