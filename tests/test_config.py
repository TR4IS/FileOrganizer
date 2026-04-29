from __future__ import annotations

from configparser import ConfigParser
from pathlib import Path
import shutil
import unittest
from uuid import uuid4

from fileorganizer.config import AppPaths, ConfigManager


class ConfigManagerTests(unittest.TestCase):
    def test_missing_config_creates_defaults(self) -> None:
        root = Path.cwd() / f"test-config-{uuid4().hex}"
        root.mkdir()
        try:
            downloads = root / "Downloads"
            downloads.mkdir()
            paths = AppPaths(
                config_dir=root,
                config_file=root / "config.ini",
                log_file=root / "log.txt",
                icon_file=root / "icon.ico",
                font_file=root / "font.ttf",
            )

            manager = ConfigManager(paths=paths, default_download_path=downloads)
            config = manager.load()

            self.assertFalse(config.run_in_background)
            self.assertEqual(config.target_path, downloads)
            self.assertTrue(paths.config_file.exists())
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def test_invalid_target_path_is_reset_to_default(self) -> None:
        root = Path.cwd() / f"test-config-{uuid4().hex}"
        root.mkdir()
        try:
            downloads = root / "Downloads"
            downloads.mkdir()
            paths = AppPaths(
                config_dir=root,
                config_file=root / "config.ini",
                log_file=root / "log.txt",
                icon_file=root / "icon.ico",
                font_file=root / "font.ttf",
            )

            parser = ConfigParser()
            parser["App"] = {
                "run_in_back": "true",
                "target_path": str(root / "missing"),
            }
            with paths.config_file.open("w", encoding="utf8") as handle:
                parser.write(handle)

            manager = ConfigManager(paths=paths, default_download_path=downloads)
            config = manager.load()

            self.assertTrue(config.run_in_background)
            self.assertEqual(config.target_path, downloads)
        finally:
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
