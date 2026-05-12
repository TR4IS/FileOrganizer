from __future__ import annotations

from pathlib import Path
import json
import re
import sys


REPO_ROOT = Path(__file__).resolve().parent.parent
FILES = {
    "metadata": REPO_ROOT / "fileorganizer" / "metadata.py",
    "pyproject": REPO_ROOT / "pyproject.toml",
    "setup": REPO_ROOT / "setup.iss",
    "root_version": REPO_ROOT / "version.json",
    "docs_version": REPO_ROOT / "docs" / "version.json",
}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/sync_version.py <version>")
        return 1

    version = sys.argv[1].strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print("Version must use semantic versioning, for example 1.2.3")
        return 1

    update_text_file(
        FILES["metadata"],
        r'APP_VERSION = ".*"',
        f'APP_VERSION = "{version}"',
    )
    update_text_file(
        FILES["pyproject"],
        r'version = ".*"',
        f'version = "{version}"',
    )
    update_text_file(
        FILES["setup"],
        r'#define MyAppVersion ".*"',
        f'#define MyAppVersion "{version}"',
    )
    update_json_file(FILES["root_version"], version)
    update_json_file(FILES["docs_version"], version)
    print(f"Synchronized version to {version}")
    return 0


def update_text_file(path: Path, pattern: str, replacement: str) -> None:
    text = path.read_text(encoding="utf8")
    updated = re.sub(pattern, replacement, text, count=1)
    path.write_text(updated, encoding="utf8")


def update_json_file(path: Path, version: str) -> None:
    data = json.loads(path.read_text(encoding="utf8"))
    data["version"] = version
    path.write_text(f"{json.dumps(data, indent=2)}\n", encoding="utf8")


if __name__ == "__main__":
    raise SystemExit(main())
