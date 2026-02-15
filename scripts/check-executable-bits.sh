#!/usr/bin/env bash
set -euo pipefail

bad_files=()
while IFS= read -r path; do
  if [ -f "$path" ] && [ -x "$path" ]; then
    bad_files+=("$path")
  fi
done < <(git ls-files | grep -Ev '^(doc/|users-archive/|scripts/)' || true)

if [ "${#bad_files[@]}" -gt 0 ]; then
  echo "Unexpected executable bits set on tracked files:" >&2
  printf '  %s\n' "${bad_files[@]}" >&2
  echo "Only scripts under scripts/ (and frozen archives under doc/ and users-archive/) may be executable." >&2
  exit 1
fi

echo "Executable bits check passed."
