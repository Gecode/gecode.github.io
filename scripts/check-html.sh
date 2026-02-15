#!/usr/bin/env bash
set -euo pipefail

site_dir="${1:-_site}"

pages=()
while IFS= read -r page; do
  pages+=("$page")
done < <("$(dirname "$0")/list-active-html.sh" "$site_dir")

if [ "${#pages[@]}" -eq 0 ]; then
  echo "No active HTML pages found under $site_dir" >&2
  exit 1
fi

npx html-validate "${pages[@]}"
