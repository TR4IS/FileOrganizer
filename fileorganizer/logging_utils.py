from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
import threading


class AppLogger:
    def __init__(self, log_file: Path) -> None:
        self.log_file = log_file
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self._listener: Callable[[str], None] | None = None
        self._lock = threading.Lock()

    def set_listener(self, listener: Callable[[str], None] | None) -> None:
        self._listener = listener

    def log(self, message: str) -> None:
        with self._lock:
            with self.log_file.open("a", encoding="utf8") as handle:
                handle.write(f"{message}\n")

        listener = self._listener
        if listener is None:
            return

        try:
            listener(message)
        except Exception:
            return

    def read_lines(self, max_lines: int = 0) -> list[str]:
        if not self.log_file.exists():
            return []

        with self._lock:
            with self.log_file.open("r", encoding="utf8") as handle:
                lines = handle.readlines()

        if max_lines > 0:
            return lines[-max_lines:]
        return lines
