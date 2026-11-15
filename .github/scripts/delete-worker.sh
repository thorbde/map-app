#!/usr/bin/env bash
# Deletes a Worker. One that was never deployed, or is already gone, is fine; any other
# error fails. Usage: delete-worker.sh <worker name>
# Needs WRANGLER_VERSION, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.
set -euo pipefail

log="$(mktemp)"
if ! npx --yes "wrangler@${WRANGLER_VERSION:?}" delete --name "$1" --force 2>&1 | tee "$log"; then
  if grep -qiE 'does not exist|10007|not found' "$log"; then
    echo "No Worker named $1 to delete."
  else
    exit 1
  fi
fi
