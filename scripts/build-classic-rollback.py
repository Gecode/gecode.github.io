#!/usr/bin/env python3
"""Build the last classic website without the oversized documentation archive."""

from pathlib import Path
import os
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent
REVISION = "e7f812a19549b9ca8e2472c3fd4723e71ddee779"
OUTPUT = ROOT / "dist" / "classic-rollback"


def main():
    if OUTPUT.exists():
        raise SystemExit(f"Rollback output already exists: {OUTPUT}")
    entries = subprocess.check_output(
        ["git", "ls-tree", "--name-only", REVISION], cwd=ROOT, text=True,
    ).splitlines()
    entries = [entry for entry in entries if entry not in {"doc", "doc-latest"}]
    with tempfile.TemporaryDirectory(prefix="gecode-classic-") as temporary:
        source = Path(temporary)
        archive = subprocess.Popen(["git", "archive", REVISION, "--", *entries], cwd=ROOT, stdout=subprocess.PIPE)
        subprocess.run(["tar", "-xf", "-", "-C", str(source)], stdin=archive.stdout, check=True)
        archive.stdout.close()
        if archive.wait() != 0:
            raise RuntimeError("Could not export the classic source")
        env = {**os.environ, "BUNDLE_GEMFILE": str(source / "Gemfile"),
               "BUNDLE_PATH": str(ROOT / "vendor" / "bundle"), "BUNDLE_FORCE_RUBY_PLATFORM": "true"}
        subprocess.run(["bundle", "exec", "jekyll", "build", "--source", str(source), "--destination", str(OUTPUT)], cwd=source, env=env, check=True)
    for item in OUTPUT.rglob("*"):
        if item.is_symlink():
            data = item.read_bytes()
            item.unlink()
            item.write_bytes(data)
    for required in ("index.html", "download.html", "documentation.html", "users-archive/index.html"):
        if not (OUTPUT / required).is_file():
            raise RuntimeError(f"Missing rollback page: {required}")
    if (OUTPUT / "doc").exists() or (OUTPUT / "doc-latest").exists():
        raise RuntimeError("Rollback must use the documentation Worker")
    size = sum(item.stat().st_size for item in OUTPUT.rglob("*") if item.is_file())
    if size >= 1_000_000_000:
        raise RuntimeError("Rollback exceeds the Pages size limit")
    with tarfile.open(OUTPUT.with_suffix(".tar.gz"), "w:gz") as archive:
        archive.add(OUTPUT, arcname=".")
    print(f"Classic rollback: {size:,} bytes from {REVISION}")
    print(f"Archive: {OUTPUT.with_suffix('.tar.gz')}")
    print("Requires the production documentation Worker; remove active-site redirects when restoring.")


if __name__ == "__main__":
    main()
