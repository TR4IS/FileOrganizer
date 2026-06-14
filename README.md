# FileOrganizer

[![Downloads](https://img.shields.io/github/downloads/TR4IS/FileOrganizer/total?style=flat-square&logo=github&label=Downloads)](https://github.com/TR4IS/FileOrganizer/releases)
[![Latest](https://img.shields.io/github/v/release/TR4IS/FileOrganizer?style=flat-square&label=Latest)](https://github.com/TR4IS/FileOrganizer/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENCE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078d4?style=flat-square&logo=windows)](https://github.com/TR4IS/FileOrganizer/releases/latest)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
[![Stars](https://img.shields.io/github/stars/TR4IS/FileOrganizer?style=flat-square&logo=github&color=FFD700)](https://github.com/TR4IS/FileOrganizer/stargazers)

Automatically organizes your files into categorized subfolders — built with Electron, React, and TypeScript.

---

## Features

- **Dashboard** — live stats: files organized today, all-time count, category breakdown, recent activity feed
- **Background watcher** — monitors your folder and organizes new files automatically as they arrive
- **Manual organize** — one-click organize at any time
- **Real-time log** — see exactly what moved where
- **Rules editor** — grouped by destination folder; add extension, filename-prefix, and subfolder-name rules per group; presets included
- **Themes** — Gold, Blue, and Green accent themes
- **Arabic language** — full RTL layout, switchable in Settings
- **Auto-updater** — checks for new releases on startup and installs silently
- **System tray** — minimize to tray, keep the watcher running in the background
- **Subfolder organizer** — optionally move unmatched subfolders to a catch-all folder (configurable in Settings)

---

## Download

Grab the latest installer from [Releases](https://github.com/TR4IS/FileOrganizer/releases/latest).

**Windows** — `FileOrganizerSetup.exe` (NSIS installer, x64)

---

## How It Works

1. Open the app and select the folder to organize (e.g. Downloads).
2. Files are sorted by extension into subfolders: `image`, `video`, `pdf`, `sound`, `zip`, `exe`, `font`, `gif`, `os`, `random`.
3. Enable the **watcher** to organize files automatically as they arrive, or click **Organize Now** to run manually.
4. All activity is logged in real time. Stats and charts update after every run.

---

## Customizing Rules

Go to the **Rules** page to add, remove, or reset extension → folder mappings. Reset to a built-in preset (Default, Developer, Designer, Media, Minimal) at any time.

---

## Requirements

- Windows 10/11 x64

---

## Performance

- RAM: ~50 MB idle
- CPU: negligible — event-driven, no polling

---

## Disclaimer

FileOrganizer moves files by changing their location on disk. Programs that reference files by their original path (shortcuts, recent file lists, etc.) may lose track of them after a move.

---

## Author

**TR4IS** — [github.com/TR4IS](https://github.com/TR4IS)
