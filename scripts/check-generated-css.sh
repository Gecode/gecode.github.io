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

dark_mode_stylesheets=()
while IFS= read -r stylesheet; do
  dark_mode_stylesheets+=("$stylesheet")
done < <(find doc -path '*/reference/doxygen.css' -type f -print)

if [ "${#dark_mode_stylesheets[@]}" -gt 0 ] &&
   grep -HnE 'prefers-color-scheme:[[:space:]]*dark' "${dark_mode_stylesheets[@]}"; then
  echo "Published Gecode documentation must use the light color scheme." >&2
  exit 1
fi

echo "Published documentation uses the light color scheme."
