from __future__ import annotations

import ctypes
import os
import sys


_mutex_handle = None


def prevent_multiple_instances(app_mutex_name: str, warning_message: str) -> None:
    global _mutex_handle

    if os.name != "nt":
        return

    _mutex_handle = ctypes.windll.kernel32.CreateMutexW(None, False, app_mutex_name)
    error = ctypes.windll.kernel32.GetLastError()

    if error == 183:
        ctypes.windll.user32.MessageBoxW(0, warning_message, "Warning", 0x40)
        sys.exit(0)
