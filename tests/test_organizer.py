from __future__ import annotations

from pathlib import Path
import shutil
import unittest
from uuid import uuid4

from fileorganizer.organizer import Organizer


class OrganizerTests(unittest.TestCase):
    def test_organize_moves_supported_and_unknown_files(self) -> None:
        root = Path.cwd() / f"test-organizer-{uuid4().hex}"
        root.mkdir()
        try:
            (root / "archive.zip").write_text("zip", encoding="utf8")
            (root / "photo.jpg").write_text("image", encoding="utf8")
            (root / "loop.gif").write_text("gif", encoding="utf8")
            (root / "unknown.xyz").write_text("random", encoding="utf8")
            (root / "download.crdownload").write_text("temp", encoding="utf8")
            (root / "nested").mkdir()

            messages: list[str] = []
            organizer = Organizer(target_path=root, logger=messages.append)

            result = organizer.organize()

            self.assertIsNotNone(result)
            assert result is not None
            self.assertEqual(result.moved_files, 4)
            self.assertEqual(result.moved_directories, 1)
            self.assertFalse(result.needs_retry)

            self.assertTrue((root / "zip" / "archive.zip").exists())
            self.assertTrue((root / "image" / "photo.jpg").exists())
            self.assertTrue((root / "gif" / "loop.gif").exists())
            self.assertTrue((root / "random" / "unknown.xyz").exists())
            self.assertTrue((root / "random" / "nested").exists())
            self.assertTrue((root / "download.crdownload").exists())
        finally:
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
