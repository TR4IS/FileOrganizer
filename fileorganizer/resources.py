from __future__ import annotations

from pathlib import Path
import shutil
import sys

from .config import AppPaths
from .logging_utils import AppLogger


ASSET_FILENAMES = {
    "FileOrganizer.ico": "icon_file",
    "JetBrainsMono-Regular.ttf": "font_file",
}


def ensure_runtime_assets(paths: AppPaths, logger: AppLogger) -> None:
    for asset_name, destination_attr in ASSET_FILENAMES.items():
        destination = getattr(paths, destination_attr)
        if destination.exists():
            continue

        source = resolve_packaged_asset(asset_name)
        if source is None:
            logger.log(f"Asset not found: {asset_name}")
            continue

        try:
            shutil.copyfile(source, destination)
        except Exception as exc:
            logger.log(f"Failed to copy asset {asset_name}: {exc}")


def resolve_packaged_asset(asset_name: str) -> Path | None:
    for root in _candidate_roots():
        candidate = root / asset_name
        if candidate.exists():
            return candidate
    return None


def _candidate_roots() -> list[Path]:
    roots: list[Path] = []
    bundle_root = getattr(sys, "_MEIPASS", None)
    if bundle_root:
        roots.append(Path(bundle_root))

    project_root = Path(__file__).resolve().parent.parent
    roots.append(project_root)
    roots.append(Path.cwd())
    return roots
