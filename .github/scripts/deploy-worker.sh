#!/usr/bin/env bash
# Deploys a Worker with the pinned wrangler (through npx, so the repo's dependencies are
# never installed next to the token) and prints its workers.dev URL on stdout.
# Usage: deploy-worker.sh <arguments for `wrangler deploy`>
# Needs WRANGLER_VERSION, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.
set -euo pipefail

log="$(mktemp)"
npx --yes "wrangler@${WRANGLER_VERSION:?}" deploy "$@" 2>&1 | tee "$log" >&2
url="$(grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' "$log" | head -n 1)"
if [ -z "$url" ]; then
  echo "::error::No workers.dev URL in the deploy output. Does the Cloudflare account have a workers.dev subdomain?" >&2
  exit 1
fi
echo "$url"
