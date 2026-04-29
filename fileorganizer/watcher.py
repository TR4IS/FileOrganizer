from __future__ import annotations

from collections.abc import Callable, Sequence
import os
from pathlib import Path
import threading

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from .metadata import TEMP_EXTENSIONS


class DirectoryEventHandler(FileSystemEventHandler):
    def __init__(
        self,
        trigger: Callable[[], None],
        is_busy: Callable[[], bool],
        is_managed_path: Callable[[str], bool],
        temp_extensions: Sequence[str] = TEMP_EXTENSIONS,
        debounce_seconds: float = 2.0,
    ) -> None:
        self._trigger = trigger
        self._is_busy = is_busy
        self._is_managed_path = is_managed_path
        self._temp_extensions = {extension.lower() for extension in temp_extensions}
        self._debounce_seconds = debounce_seconds
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()

    def on_created(self, event) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        self._handle_path(event.src_path)

    def on_modified(self, event) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        self._handle_path(event.src_path)

    def on_moved(self, event) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        self._handle_path(event.dest_path)

    def cancel_pending(self) -> None:
        with self._lock:
            if self._timer and self._timer.is_alive():
                self._timer.cancel()
            self._timer = None

    def _handle_path(self, path: str) -> None:
        if self._is_busy():
            return

        extension = Path(path).suffix.lower()
        if extension in self._temp_extensions:
            return

        if self._is_managed_path(os.path.abspath(path)):
            return

        with self._lock:
            if self._timer and self._timer.is_alive():
                self._timer.cancel()

            self._timer = threading.Timer(self._debounce_seconds, self._trigger)
            self._timer.daemon = True
            self._timer.start()


class DirectoryWatcher:
    def __init__(
        self,
        path: Path,
        trigger: Callable[[], None],
        is_busy: Callable[[], bool],
        is_managed_path: Callable[[str], bool],
        temp_extensions: Sequence[str] = TEMP_EXTENSIONS,
    ) -> None:
        self._path = Path(path)
        self._handler = DirectoryEventHandler(
            trigger=trigger,
            is_busy=is_busy,
            is_managed_path=is_managed_path,
            temp_extensions=temp_extensions,
        )
        self._observer: Observer | None = None
        self._lock = threading.Lock()

    def start(self, path: Path | None = None) -> None:
        with self._lock:
            if self._observer is not None:
                return

            if path is not None:
                self._path = Path(path)

            observer = Observer()
            observer.schedule(self._handler, str(self._path), recursive=False)
            observer.start()
            self._observer = observer

    def stop(self) -> None:
        with self._lock:
            observer = self._observer
            self._observer = None

        self._handler.cancel_pending()

        if observer is None:
            return

        observer.stop()
        observer.join()

    def restart(self, path: Path) -> None:
        self.stop()
        self.start(path)

    def is_running(self) -> bool:
        with self._lock:
            return self._observer is not None
