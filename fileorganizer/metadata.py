from __future__ import annotations

from pathlib import Path

APP_NAME = "File Organizer"
APP_ID = "FileOrganizer"
APP_VERSION = "1.2.1"
APP_AUTHOR = "TR4IS"
APP_REPOSITORY = "https://github.com/TR4IS/FileOrganizer"
UPDATE_URL = "https://raw.githubusercontent.com/TR4IS/FileOrganizer/main/docs/version.json"
WINDOW_GEOMETRY = "300x480+750+350"
WINDOW_MIN_SIZE = (300, 480)
RUNTIME_DIR_NAME = "FileOrganizer"

NETWORK_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36"
    )
}

DEFAULT_DOWNLOAD_PATH = Path.home() / "Downloads"

DEFAULT_FILE_TYPES = {
    "zip": [".zip", ".rar"],
    "image": [".png", ".jpg", ".jpeg", ".psd"],
    "pdf": [".pdf"],
    "exe": [".exe", ".msi"],
    "sound": [".mp3", ".wav", ".ogg", ".flac", ".m4a"],
    "video": [".mp4", ".mkv", ".avi", ".mov", ".wmv"],
    "os": [".iso", ".img"],
    "gif": [".gif", ".webp", ".apng", ".avif"],
    "font": [".ttf", ".otf", ".ttc"],
    "random": [],
}

TEMP_EXTENSIONS = (
    ".crdownload",
    ".part",
    ".part1",
    ".part2",
    ".part3",
    ".tmp",
    ".temp",
    ".download",
)
