#!/usr/bin/env bash
set -euo pipefail

if [ ! -f assets/css/site.css ]; then
  echo "Missing generated CSS file: assets/css/site.css" >&2
  echo "Run: npm run build:css" >&2
  exit 1
fi

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

before_checksum="$(checksum assets/css/site.css)"

npm run --silent build:css

after_checksum="$(checksum assets/css/site.css)"

if [ "$before_checksum" != "$after_checksum" ]; then
  echo "Generated CSS was out of date and has been regenerated: assets/css/site.css" >&2
  echo "Run: npm run build:css" >&2
  exit 1
fi

echo "Generated CSS matches source."
