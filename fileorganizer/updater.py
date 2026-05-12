from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from packaging.version import InvalidVersion, Version
import requests

from .metadata import NETWORK_HEADERS, UPDATE_URL


@dataclass(frozen=True, slots=True)
class ReleaseInfo:
    version: str
    url: str


class UpdateClient:
    def __init__(
        self,
        current_version: str,
        update_url: str = UPDATE_URL,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.current_version = current_version
        self.update_url = update_url
        self.headers = headers or NETWORK_HEADERS

    def fetch_latest_release(self) -> ReleaseInfo:
        response = requests.get(self.update_url, headers=self.headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        version = data.get("version")
        download_url = data.get("url")
        if not version or not download_url:
            raise ValueError("Invalid update metadata")

        return ReleaseInfo(version=version, url=download_url)

    def is_update_available(self, release: ReleaseInfo) -> bool:
        try:
            return Version(release.version) > Version(self.current_version)
        except InvalidVersion:
            return release.version != self.current_version

    def download_installer(self, release: ReleaseInfo, destination: Path) -> Path:
        response = requests.get(
            release.url,
            headers=self.headers,
            timeout=30,
            stream=True,
        )
        response.raise_for_status()

        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    handle.write(chunk)

        return destination
