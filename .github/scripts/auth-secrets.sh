#!/usr/bin/env bash
# Writes the sign-in secrets from the environment to a JSON file for `wrangler deploy
# --secrets-file`, and prints its path. The caller deletes it. Stops, naming each one, if any
# is missing, so a preview never deploys with sign-in half set up. Never prints a value.
# Needs BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
set -euo pipefail

missing=()
for name in BETTER_AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  [ -n "${!name:-}" ] || missing+=("$name")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "::error::Missing sign-in secrets: ${missing[*]}. They come from the repository secrets PREVIEW_AUTH_SECRET, PREVIEW_GOOGLE_CLIENT_ID and PREVIEW_GOOGLE_CLIENT_SECRET (docs/specs/m2.md)." >&2
  exit 1
fi

file="$(mktemp --suffix=.json)"
chmod 600 "$file"
jq -n '{BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET}' > "$file"
echo "$file"
