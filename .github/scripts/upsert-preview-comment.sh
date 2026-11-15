#!/usr/bin/env bash
# Creates or updates the single preview comment on a PR.
# Usage: upsert-preview-comment.sh <pr-number> <body> [--update-only]
# The body's first line is a hidden marker that identifies the comment.
# Only comments by github-actions[bot] are ever edited.
set -euo pipefail

pr="$1"
body="$2"
mode="${3:-}"
marker="$(head -n 1 <<<"$body")"
repo="$GITHUB_REPOSITORY"

id="$(gh api "repos/$repo/issues/$pr/comments" --paginate \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"$marker\"))) | .id" |
  head -n 1)"

if [ -n "$id" ]; then
  gh api -X PATCH "repos/$repo/issues/comments/$id" -f body="$body" >/dev/null
elif [ "$mode" != "--update-only" ]; then
  gh api "repos/$repo/issues/$pr/comments" -f body="$body" >/dev/null
fi
