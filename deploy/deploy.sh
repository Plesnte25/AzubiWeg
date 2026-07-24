#!/usr/bin/env bash
# Manual redeploy: pull latest main, rebuild server+client, migrate, restart.
# Run this on the VPS as a sudo-capable admin user (not as `azubiweg` itself,
# since restarting the systemd unit needs sudo). Build steps run as
# `azubiweg` so the repo/client-dist stay owned by that user.
# See docs/DEPLOYMENT.md for first-time setup.
set -euo pipefail

REPO_DIR=/opt/azubiweg/repo
CLIENT_DIST=/opt/azubiweg/client-dist

sudo -u azubiweg git -C "$REPO_DIR" pull

# npm 11's script-allowlist blocks Prisma's postinstall hook, and `npm ci`
# wipes any previously generated client on every run, so `prisma generate`
# must be explicit here or `tsc` fails on every redeploy, not just the first.
sudo -u azubiweg bash -c "cd '$REPO_DIR/server' && npm ci && npx prisma generate && npm run build && npx prisma migrate deploy"

sudo -u azubiweg bash -c "cd '$REPO_DIR/client' && npm ci && npm run build"
sudo -u azubiweg rm -rf "$CLIENT_DIST"
sudo -u azubiweg cp -r "$REPO_DIR/client/dist" "$CLIENT_DIST"

sudo systemctl restart azubiweg

echo "Deployed $(git -C "$REPO_DIR" rev-parse --short HEAD)"
