from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import threading

from .metadata import DEFAULT_FILE_TYPES, TEMP_EXTENSIONS


@dataclass(frozen=True, slots=True)
class OrganizeResult:
    created_folders: int = 0
    moved_files: int = 0
    moved_directories: int = 0
    deferred_files: int = 0
    errors: int = 0

    @property
    def needs_retry(self) -> bool:
        return self.deferred_files > 0


class Organizer:
    def __init__(
        self,
        target_path: Path,
        logger: Callable[[str], None],
        file_types: Mapping[str, Sequence[str]] = DEFAULT_FILE_TYPES,
        temp_extensions: Sequence[str] = TEMP_EXTENSIONS,
        retry_limit: int = 720,
    ) -> None:
        self._target_path = Path(target_path)
        self._logger = logger
        self._file_types = {
            folder: tuple(extension.lower() for extension in extensions)
            for folder, extensions in file_types.items()
        }
        self._extension_map = self._build_extension_map(self._file_types)
        self._temp_extensions = {extension.lower() for extension in temp_extensions}
        self._retry_limit = retry_limit
        self._run_lock = threading.Lock()
        self._state_lock = threading.Lock()
        self._currently_moving: set[str] = set()
        self._retry_tracker: dict[str, int] = {}

    @property
    def target_path(self) -> Path:
        return self._target_path

    def set_target_path(self, target_path: Path) -> None:
        self._target_path = Path(target_path)

    def is_busy(self) -> bool:
        return self._run_lock.locked()

    def is_managed_path(self, path: str) -> bool:
        normalized = os.path.abspath(path)
        with self._state_lock:
            return normalized in self._currently_moving

    def organize(self) -> OrganizeResult | None:
        if not self._run_lock.acquire(blocking=False):
            return None

        try:
            return self._organize_impl()
        finally:
            self._run_lock.release()

    def _organize_impl(self) -> OrganizeResult:
        created_folders = 0
        moved_files = 0
        moved_directories = 0
        deferred_files = 0
        errors = 0
        target_path = self._target_path

        for folder in self._file_types:
            folder_path = target_path / folder
            if folder_path.exists():
                continue

            try:
                folder_path.mkdir(parents=True, exist_ok=True)
                created_folders += 1
                self._logger(f"[+] Created folder: {folder_path}")
            except Exception as exc:
                errors += 1
                self._logger(f"Error creating folder {folder_path}: {exc}")
                return OrganizeResult(
                    created_folders=created_folders,
                    moved_files=moved_files,
                    moved_directories=moved_directories,
                    deferred_files=deferred_files,
                    errors=errors,
                )

        try:
            items = list(target_path.iterdir())
        except Exception as exc:
            self._logger(f"[!] Error reading directory: {exc}")
            return OrganizeResult(
                created_folders=created_folders,
                moved_files=moved_files,
                moved_directories=moved_directories,
                deferred_files=deferred_files,
                errors=errors + 1,
            )

        for item in items:
            if item.name.lower() in self._file_types:
                continue

            if item.is_dir():
                destination = target_path / "random" / item.name
                if self._move_item(item, destination, is_directory=True):
                    moved_directories += 1
                    self._logger(f"[->] Moved folder: {item.name} -> random/")
                else:
                    errors += 1
                continue

            extension = item.suffix.lower()
            if extension in self._temp_extensions:
                continue

            if not is_file_ready(item):
                if self._mark_retry(item.name):
                    deferred_files += 1
                continue

            self._clear_retry(item.name)
            folder = self._extension_map.get(extension, "random")
            destination = target_path / folder / item.name

            if self._move_item(item, destination):
                moved_files += 1
                self._logger(f"[->] {item.name} -> {folder}/")
            else:
                errors += 1

        result = OrganizeResult(
            created_folders=created_folders,
            moved_files=moved_files,
            moved_directories=moved_directories,
            deferred_files=deferred_files,
            errors=errors,
        )

        if not result.needs_retry:
            self._logger(f"Done organizing {target_path}!")

        return result

    def _move_item(
        self,
        source: Path,
        destination: Path,
        *,
        is_directory: bool = False,
    ) -> bool:
        self._mark_managed_path(destination)
        try:
            shutil.move(str(source), str(destination))
            return True
        except Exception as exc:
            kind = "folder" if is_directory else "file"
            self._logger(f"Error: Failed to move {kind} {source.name}: {exc}")
            return False

    def _mark_managed_path(self, path: Path) -> None:
        normalized = os.path.abspath(str(path))
        with self._state_lock:
            self._currently_moving.add(normalized)

        timer = threading.Timer(1.0, self._discard_managed_path, args=(normalized,))
        timer.daemon = True
        timer.start()

    def _discard_managed_path(self, normalized_path: str) -> None:
        with self._state_lock:
            self._currently_moving.discard(normalized_path)

    def _mark_retry(self, item_name: str) -> bool:
        with self._state_lock:
            retries = self._retry_tracker.get(item_name, 0) + 1
            self._retry_tracker[item_name] = retries
            return retries < self._retry_limit

    def _clear_retry(self, item_name: str) -> None:
        with self._state_lock:
            self._retry_tracker.pop(item_name, None)

    @staticmethod
    def _build_extension_map(
        file_types: Mapping[str, Sequence[str]]
    ) -> dict[str, str]:
        mapping: dict[str, str] = {}
        for folder, extensions in file_types.items():
            for extension in extensions:
                mapping.setdefault(extension.lower(), folder)
        return mapping


def is_file_ready(file_path: Path) -> bool:
    try:
        if not file_path.exists():
            return False

        with file_path.open("a"):
            pass

        return True
    except PermissionError:
        return False
    except OSError:
        return False
