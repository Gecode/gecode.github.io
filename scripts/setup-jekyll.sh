#!/usr/bin/env bash
set -euo pipefail

required_major=3
required_minor=1

if ! command -v ruby >/dev/null 2>&1; then
  echo "Ruby is not installed. Install Ruby >= 3.1, then rerun this command."
  exit 1
fi

ruby_version="$(ruby -e 'print RUBY_VERSION')"
ruby_major="${ruby_version%%.*}"
ruby_minor="$(echo "$ruby_version" | cut -d. -f2)"

if [ "$ruby_major" -lt "$required_major" ] || { [ "$ruby_major" -eq "$required_major" ] && [ "$ruby_minor" -lt "$required_minor" ]; }; then
  echo "Ruby $ruby_version detected. This project requires Ruby >= 3.1 for local Jekyll/Bundler."
  echo "Suggested fix (rbenv):"
  echo "  brew install rbenv ruby-build"
  echo "  rbenv install 3.1.6"
  echo "  rbenv local 3.1.6"
  echo "  gem install bundler"
  exit 1
fi

if ! command -v bundle >/dev/null 2>&1; then
  echo "Bundler is not installed for Ruby $ruby_version. Run: gem install bundler"
  exit 1
fi

export BUNDLE_FORCE_RUBY_PLATFORM=true
export BUNDLE_PATH=vendor/bundle

bundle config set --local path "$BUNDLE_PATH"
bundle config set --local force_ruby_platform "$BUNDLE_FORCE_RUBY_PLATFORM"

bundle check || bundle install

if ! bundle exec jekyll -v >/dev/null 2>&1; then
  echo "Bundler installed dependencies, but the jekyll executable is still unavailable."
  echo "Run 'bundle install' manually and check for errors."
  exit 1
fi
