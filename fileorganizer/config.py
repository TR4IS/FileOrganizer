from __future__ import annotations

from configparser import ConfigParser
from dataclasses import dataclass
import os
from pathlib import Path

from .metadata import DEFAULT_DOWNLOAD_PATH, RUNTIME_DIR_NAME


@dataclass(frozen=True, slots=True)
class AppPaths:
    config_dir: Path
    config_file: Path
    log_file: Path
    icon_file: Path
    font_file: Path


@dataclass(frozen=True, slots=True)
class AppConfig:
    run_in_background: bool
    target_path: Path


def build_app_paths() -> AppPaths:
    local_app_data = Path(
        os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
    )
    config_dir = local_app_data / RUNTIME_DIR_NAME
    return AppPaths(
        config_dir=config_dir,
        config_file=config_dir / "config.ini",
        log_file=config_dir / "log.txt",
        icon_file=config_dir / "FileOrganizer.ico",
        font_file=config_dir / "JetBrainsMono-Regular.ttf",
    )


class ConfigManager:
    def __init__(
        self,
        paths: AppPaths,
        default_download_path: Path = DEFAULT_DOWNLOAD_PATH,
    ) -> None:
        self.paths = paths
        self.default_download_path = default_download_path

    def load(self) -> AppConfig:
        self.paths.config_dir.mkdir(parents=True, exist_ok=True)
        parser = ConfigParser()

        if not self.paths.config_file.exists():
            config = AppConfig(
                run_in_background=False,
                target_path=self.default_download_path,
            )
            self.save(config)
            return config

        try:
            parser.read(self.paths.config_file, encoding="utf8")
            if "App" not in parser:
                raise ValueError("Missing [App] section")

            section = parser["App"]
            run_in_background = self._parse_bool(section.get("run_in_back"))
            target_path = Path(section.get("target_path", "")).expanduser()

            if not target_path.exists():
                target_path = self.default_download_path
                config = AppConfig(
                    run_in_background=run_in_background,
                    target_path=target_path,
                )
                self.save(config)
                return config

            return AppConfig(
                run_in_background=run_in_background,
                target_path=target_path,
            )
        except Exception:
            config = AppConfig(
                run_in_background=False,
                target_path=self.default_download_path,
            )
            self.save(config)
            return config

    def save(self, config: AppConfig) -> None:
        self.paths.config_dir.mkdir(parents=True, exist_ok=True)
        parser = ConfigParser()
        parser["App"] = {
            "run_in_back": "true" if config.run_in_background else "false",
            "target_path": str(config.target_path),
        }
        with self.paths.config_file.open("w", encoding="utf8") as handle:
            parser.write(handle)

    @staticmethod
    def _parse_bool(value: str | None) -> bool:
        normalized = (value or "").strip().lower()
        if normalized not in {"true", "false"}:
            raise ValueError(f"Invalid boolean value: {value!r}")
        return normalized == "true"
