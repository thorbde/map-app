#!/usr/bin/env bash
# The D1 database of a PR preview, in the Previews account (ADR 0006).
#
#   preview-database.sh validate <name>
#   preview-database.sh deploy <name> <migrations dir> <worker config>
#       Creates the database in the EU if it doesn't exist yet, applies the migrations that
#       haven't run, and binds it as DB in the built Worker's config (wrangler.json).
#   preview-database.sh delete <name>
#       Deletes the database. One that is already gone is fine.
#
# Refuses any name but memogra-pr-<number>, before it calls Cloudflare, so a mistake in a
# workflow can't touch another database. Wrangler runs through npx at WRANGLER_VERSION, so the
# repo's dependencies are never installed next to the token. Needs WRANGLER_VERSION,
# CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment (validate needs none).
set -euo pipefail

usage() {
  echo "Usage: preview-database.sh validate|deploy|delete <name> [...]" >&2
  exit 2
}

[ "$#" -ge 2 ] || usage
command="$1"
name="$2"

if ! [[ "$name" =~ ^memogra-pr-[0-9]+$ ]]; then
  echo "::error::Refusing the database name '$name': previews may only use memogra-pr-<number> (ADR 0006)." >&2
  exit 2
fi

wrangler() {
  npx --yes "wrangler@${WRANGLER_VERSION:?}" "$@"
}

# The database's ID, or nothing if there is no database with that name.
database_id() {
  wrangler d1 list --json | jq -r --arg name "$1" '.[] | select(.name == $name) | .uuid'
}

case "$command" in
  validate)
    echo "$name is a valid preview database name."
    ;;

  deploy)
    [ "$#" -eq 4 ] || usage
    migrations_dir="$(cd "$3" && pwd)"
    worker_config="$4"

    id="$(database_id "$name")"
    if [ -z "$id" ]; then
      log="$(mktemp)"
      # The jurisdiction can only be set here, never afterwards.
      if ! wrangler d1 create "$name" --jurisdiction=eu 2>&1 | tee "$log" >&2; then
        echo "::error::Couldn't create the preview database $name. If the account is at its limit of databases (10 on the free plan, shared by all apps), close old PRs or delete leftover preview databases. The preview databases now in the account:" >&2
        wrangler d1 list --json | jq -r '.[] | select(.name | startswith("memogra-pr-")) | .name' >&2 || true
        exit 1
      fi
      id="$(database_id "$name")"
      if [ -z "$id" ]; then
        echo "::error::Created $name, but Cloudflare doesn't list it." >&2
        exit 1
      fi
      echo "Created $name ($id) in the EU." >&2
    else
      echo "Using the existing $name ($id)." >&2
    fi

    # A config that names only this database, so the migrations can't go anywhere else.
    migrations_config="$(mktemp --suffix=.json)"
    jq -n --arg name "$name" --arg id "$id" --arg dir "$migrations_dir" \
      '{name: "migrations-only", compatibility_date: "2026-11-01",
        d1_databases: [{binding: "DB", database_name: $name, database_id: $id, migrations_dir: $dir}]}' \
      > "$migrations_config"
    wrangler d1 migrations apply "$name" --remote --config "$migrations_config" >&2

    # Bind it in the built Worker's config. The build itself never sees a database (ADR 0006).
    bound="$(mktemp)"
    jq --arg name "$name" --arg id "$id" \
      '.d1_databases = [{binding: "DB", database_name: $name, database_id: $id}]' \
      "$worker_config" > "$bound"
    mv "$bound" "$worker_config"
    echo "Bound $name as DB in $worker_config." >&2
    ;;

  delete)
    log="$(mktemp)"
    if ! wrangler d1 delete "$name" --skip-confirmation 2>&1 | tee "$log"; then
      if grep -qiE "couldn't find|not found|does not exist" "$log"; then
        echo "No database named $name to delete."
      else
        exit 1
      fi
    fi
    ;;

  *)
    usage
    ;;
esac
