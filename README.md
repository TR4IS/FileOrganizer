
![icon](docs/FileOrganizer.ico)

[![Downloads](https://img.shields.io/github/downloads/TR4IS/FileOrganizer/total?style=flat-square&logo=github&label=Downloads)](https://github.com/TR4IS/FileOrganizer/releases)
[![Latest](https://img.shields.io/github/v/release/TR4IS/FileOrganizer?style=flat-square&label=Latest)](https://github.com/TR4IS/FileOrganizer/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENCE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078d4?style=flat-square&logo=windows)](https://github.com/TR4IS/FileOrganizer/releases/latest)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
[![Stars](https://img.shields.io/github/stars/TR4IS/FileOrganizer?style=flat-square&logo=github&color=FFD700)](https://github.com/TR4IS/FileOrganizer/stargazers)
# FileOrganizer

A fast, modern desktop app that automatically organizes your files into categorized subfolders — built with Electron, React, and TypeScript.

---

## Features

- **Dashboard** — live stats showing files organized today, all-time count, breakdown by category, and a recent activity feed
- **Background watcher** — monitors your folder and organizes new files automatically as they arrive
- **Manual organize** — run a one-click organize at any time
- **Real-time log** — color-coded live event stream so you can see exactly what moved where
- **Rules editor** — fully customizable extension → folder mapping with preset packs to get started
- **Themes** — Gold, Blue, and Green accent themes
- **Arabic language** — full RTL layout, switchable in Settings
- **Auto-updater** — checks for new releases on startup and installs them silently
- **System tray** — minimize to tray and keep the watcher running in the background

---

## Download

Grab the latest installer from [Releases](https://github.com/TR4IS/FileOrganizer/releases/latest).

**Windows** — `FileOrganizer Setup x.x.x.exe` (NSIS installer, x64)

---

## How It Works

1. Open the app and select the folder you want to organize (e.g. Downloads).
2. Files are sorted by extension into subfolders: `image`, `video`, `pdf`, `sound`, `zip`, `exe`, `font`, `gif`, `os`, `random`.
3. Enable the **watcher** to organize files automatically as they arrive, or click **Organize Now** to run it manually.
4. All activity is logged in real time. Stats and charts update after every run.

---

## Customizing Rules

Go to the **Rules** page to add, remove, or reset extension → folder mappings. You can also reset to one of the built-in presets (Default, Media, Dev, Documents) at any time.

---

## Requirements

- Windows 10/11 x64

---

## Performance

- RAM: ~50 MB idle
- Disk: near zero at idle; only active during organize runs
- CPU: negligible — event-driven, no polling

---

## Disclaimer

FileOrganizer moves files by changing their location on disk. If other programs reference those files by their original path (shortcuts, recent files lists, etc.), they may lose track of them after a move.

---

## Author

**TR4IS** — [github.com/TR4IS](https://github.com/TR4IS)
