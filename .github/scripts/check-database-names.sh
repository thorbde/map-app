#!/usr/bin/env bash
# Keeps previews away from the production database (ADR 0006). Fails if:
# - the deployed Worker config (the top level of wrangler.jsonc) or any environment but
#   "local" and "production" binds a database: a preview gets its own only in CI;
# - the "local" environment binds anything but memogra-local;
# - a workflow or CI script names a memogra-… database other than memogra-pr-<number> or
#   memogra-local;
# - the guard in preview-database.sh accepts a name it should refuse, or refuses a valid one.
# Runs in `pnpm check`. Needs no secrets and no network.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail=0

# wrangler.jsonc has only whole-line // comments; strip them and read the rest as JSON.
if ! problems="$(grep -vE '^\s*//' apps/web/wrangler.jsonc | jq -r '
  [ (if has("d1_databases") then "the top level binds a database" else empty end),
    ((.env // {}) | to_entries[]
      | select(.key != "local" and .key != "production" and (.value | has("d1_databases")))
      | "the environment \(.key) binds a database"),
    ((.env.local.d1_databases // [])[]
      | select(.database_name != "memogra-local")
      | "the local environment binds \(.database_name)")
  ] | .[]')"; then
  echo "::error::Couldn't read apps/web/wrangler.jsonc as JSON." >&2
  exit 1
fi
if [ -n "$problems" ]; then
  while IFS= read -r line; do echo "::error file=apps/web/wrangler.jsonc::$line" >&2; done <<< "$problems"
  fail=1
fi

# This script is left out: its test names are meant to be refused.
# The preview workflow writes memogra-pr-${{ ... }}, which this sees as "memogra-pr-".
unexpected="$(grep -rhoE --exclude=check-database-names.sh 'memogra-[A-Za-z0-9_-]+' .github | grep -vxE 'memogra-pr-([0-9]+)?|memogra-local' | sort -u || true)"
if [ -n "$unexpected" ]; then
  echo "::error::.github names databases that previews must never touch: $(echo "$unexpected" | tr '\n' ' ')" >&2
  fail=1
fi

guard=.github/scripts/preview-database.sh
for name in memogra-pr-1 memogra-pr-123; do
  if ! bash "$guard" validate "$name" > /dev/null 2>&1; then
    echo "::error::$guard refuses the valid name $name." >&2
    fail=1
  fi
done
for name in map-app-pr-1 memogra-pr- memogra-pr-1x "memogra-pr-1;x" memogra-local memogra-production; do
  if bash "$guard" validate "$name" > /dev/null 2>&1; then
    echo "::error::$guard accepts $name, which it must refuse." >&2
    fail=1
  fi
done

[ "$fail" -eq 0 ] && echo "Database names: previews can only reach memogra-pr-<number>."
exit "$fail"
