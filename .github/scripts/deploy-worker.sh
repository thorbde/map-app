#!/usr/bin/env bash
# Deploys a Worker with the pinned wrangler (through npx, so the repo's dependencies are
# never installed next to the token) and prints its workers.dev URL on stdout.
# Usage: deploy-worker.sh <arguments for `wrangler deploy`>
# Needs WRANGLER_VERSION, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.
set -euo pipefail

# Cloudflare sometimes answers "This Worker does not exist on your account" (code 10007)
# right after wrangler has uploaded a new Worker. Seen twice within two minutes on
# PR #17 (first the app Worker, then on the re-run the Storybook Worker, while the app
# Worker deployed fine the second time), and not on PR #18 minutes later. Deploying the
# same Worker again works, so that one error is retried; anything else fails at once.
attempts=3
wait_seconds="${DEPLOY_RETRY_SECONDS:-15}"

log="$(mktemp)"
for attempt in $(seq 1 "$attempts"); do
  if npx --yes "wrangler@${WRANGLER_VERSION:?}" deploy "$@" 2>&1 | tee "$log" >&2; then
    break
  fi
  if [ "$attempt" -eq "$attempts" ] || ! grep -q "code: 10007" "$log"; then
    exit 1
  fi
  echo "::warning::Cloudflare doesn't see the new Worker yet (attempt ${attempt} of ${attempts}). Deploying again in ${wait_seconds} s." >&2
  sleep "$wait_seconds"
done

url="$(grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' "$log" | head -n 1)"
if [ -z "$url" ]; then
  echo "::error::No workers.dev URL in the deploy output. Does the Cloudflare account have a workers.dev subdomain?" >&2
  exit 1
fi
echo "$url"
