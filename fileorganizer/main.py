from __future__ import annotations

from .metadata import APP_ID, APP_NAME
from .mutex import prevent_multiple_instances
from .ui import FileOrganizerApp


def main() -> None:
    prevent_multiple_instances(
        app_mutex_name=f"Global\\{APP_ID}Mutex",
        warning_message=f"{APP_NAME} is already running.",
    )
    app = FileOrganizerApp()
    app.run()
