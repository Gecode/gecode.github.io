#!/usr/bin/env bash
set -euo pipefail

site_dir="${1:-_site}"

if [ ! -d "$site_dir" ]; then
  echo "Site directory not found: $site_dir" >&2
  exit 1
fi

find "$site_dir" -type f -name '*.html' \
  ! -path "$site_dir/doc/*" \
  ! -path "$site_dir/doc-latest/*" \
  ! -path "$site_dir/users-archive/*" \
  | LC_ALL=C sort
