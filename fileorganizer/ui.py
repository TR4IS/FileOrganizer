from __future__ import annotations

import ctypes
from dataclasses import replace
import os
from pathlib import Path
import threading

import customtkinter as t
from customtkinter import filedialog
from PIL import Image
import pystray
from tkinter import font, messagebox

from .config import ConfigManager, build_app_paths
from .logging_utils import AppLogger
from .metadata import (
    APP_ID,
    APP_NAME,
    APP_VERSION,
    DEFAULT_FILE_TYPES,
    NETWORK_HEADERS,
    TEMP_EXTENSIONS,
    UPDATE_URL,
    WINDOW_GEOMETRY,
    WINDOW_MIN_SIZE,
)
from .organizer import Organizer
from .resources import ensure_runtime_assets, resolve_packaged_asset
from .updater import ReleaseInfo, UpdateClient
from .watcher import DirectoryWatcher


class FileOrganizerApp:
    def __init__(self) -> None:
        self.paths = build_app_paths()
        self.logger = AppLogger(self.paths.log_file)
        ensure_runtime_assets(self.paths, self.logger)

        self.config_manager = ConfigManager(self.paths)
        self.config = self.config_manager.load()

        self.organizer = Organizer(
            target_path=self.config.target_path,
            logger=self.logger.log,
            file_types=DEFAULT_FILE_TYPES,
            temp_extensions=TEMP_EXTENSIONS,
        )
        self.watcher = DirectoryWatcher(
            path=self.config.target_path,
            trigger=self.request_organize,
            is_busy=self.organizer.is_busy,
            is_managed_path=self.organizer.is_managed_path,
            temp_extensions=TEMP_EXTENSIONS,
        )
        self.updater = UpdateClient(
            current_version=APP_VERSION,
            update_url=UPDATE_URL,
            headers=NETWORK_HEADERS,
        )
        self._tray_icon: pystray.Icon | None = None

        t.set_appearance_mode("dark")
        self.root = t.CTk()
        self.root.geometry(WINDOW_GEOMETRY)
        self.root.minsize(*WINDOW_MIN_SIZE)
        self.root.title(APP_NAME)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        self._apply_font()
        self._apply_window_icon()
        self._build_ui()

        self.logger.set_listener(self._schedule_log_append)
        self.reload_logs()

    def run(self) -> None:
        self.check_for_updates()

        if self.config.run_in_background:
            try:
                self.watcher.start(self.config.target_path)
            except Exception as exc:
                self.logger.log(f"Error: Could not start watcher on launch: {exc}")
                self.config = replace(self.config, run_in_background=False)
                self.config_manager.save(self.config)
                self._sync_background_button()

        self.root.mainloop()

    def request_organize(self) -> None:
        if self.organizer.is_busy():
            return

        self.root.after(0, self._clear_log_view)
        thread = threading.Thread(target=self._run_organize, daemon=True)
        thread.start()

    def button_change_folder(self) -> None:
        if self.organizer.is_busy():
            messagebox.showwarning(
                "Busy",
                "Organization is currently in progress. Please wait until it finishes before changing the target folder.",
            )
            return

        new_folder = filedialog.askdirectory(
            title="Select Folder to Organize",
            initialdir=str(self.config.target_path),
        )
        if not new_folder:
            return

        new_path = Path(os.path.normpath(new_folder))
        if new_path == self.config.target_path:
            return

        if not os.access(new_path, os.R_OK) or not os.access(new_path, os.W_OK):
            messagebox.showerror(
                "Permission Error",
                f"Cannot organize '{new_path}'. The program requires read and write permissions for the selected directory.",
            )
            return

        self.config = replace(self.config, target_path=new_path)
        self.config_manager.save(self.config)
        self.organizer.set_target_path(new_path)
        self._update_target_label()

        if not self.config.run_in_background:
            return

        try:
            self.watcher.restart(new_path)
            self.logger.log(f"[*] Background tracking moved to {new_path}")
        except Exception as exc:
            self.logger.log(f"Error restarting watcher: {exc}")
            messagebox.showerror(
                "Watcher Error",
                "Could not start background tracking on the new folder.",
            )

    def button_toggle_background(self) -> None:
        if self.config.run_in_background:
            self.watcher.stop()
            self.config = replace(self.config, run_in_background=False)
            self.config_manager.save(self.config)
            self._sync_background_button()
            self.logger.log("[*] Background tracking stopped.")
            return

        try:
            self.watcher.start(self.config.target_path)
        except Exception as exc:
            self.logger.log(f"Error starting watcher: {exc}")
            messagebox.showerror("Error", "Could not start tracking. Check permissions.")
            return

        self.config = replace(self.config, run_in_background=True)
        self.config_manager.save(self.config)
        self._sync_background_button()
        self.logger.log("[*] Background tracking started.")

    def check_for_updates(self, manual: bool = False) -> None:
        thread = threading.Thread(
            target=self._check_for_updates_worker,
            args=(manual,),
            daemon=True,
        )
        thread.start()

    def show_window(self, icon=None, item=None) -> None:
        if self._tray_icon is not None:
            self._tray_icon.stop()
            self._tray_icon = None

        self.root.after(0, self._restore_window)

    def quit_app(self, icon=None, item=None) -> None:
        self.watcher.stop()

        if self._tray_icon is not None:
            self._tray_icon.stop()
            self._tray_icon = None

        self.root.after(0, self.root.quit)

    def minimize_to_tray(self) -> None:
        if self._tray_icon is not None:
            return

        self.root.withdraw()
        tray_image = self._load_tray_image()
        menu = pystray.Menu(
            pystray.MenuItem("Show", self.show_window),
            pystray.MenuItem(
                "Check for Updates",
                lambda icon, item: self.check_for_updates(manual=True),
            ),
            pystray.MenuItem("Quit", self.quit_app),
        )
        self._tray_icon = pystray.Icon(APP_ID, tray_image, APP_NAME, menu)

        thread = threading.Thread(target=self._tray_icon.run, daemon=True)
        thread.start()

    def on_closing(self) -> None:
        if not self.config.run_in_background:
            self.watcher.stop()
        self.minimize_to_tray()

    def reload_logs(self, max_lines: int = 0) -> None:
        lines = self.logger.read_lines(max_lines=max_lines)
        self.textbox.configure(state="normal")
        self.textbox.delete("0.0", "end")
        self.textbox.insert("end", "".join(lines))
        self.textbox.configure(state="disabled")
        self.textbox.see("end")

    def _run_organize(self) -> None:
        result = self.organizer.organize()
        if result is None:
            return

        if result.needs_retry:
            self.root.after(5000, self.request_organize)

    def _check_for_updates_worker(self, manual: bool) -> None:
        try:
            release = self.updater.fetch_latest_release()
        except Exception as exc:
            self.logger.log(f"Update check failed: {exc}")
            if manual:
                self.root.after(
                    0,
                    lambda: messagebox.showerror(
                        "Update Check",
                        "Could not check for updates. Check your internet connection.",
                    ),
                )
            return

        if self.updater.is_update_available(release):
            self.root.after(0, lambda: self._prompt_update(release))
            return

        if manual:
            self.root.after(
                0,
                lambda: messagebox.showinfo(
                    "Update Check",
                    f"You are on the latest version ({APP_VERSION}).",
                ),
            )

    def _prompt_update(self, release: ReleaseInfo) -> None:
        answer = messagebox.askyesno(
            "Update Available",
            (
                f"A new version ({release.version}) is available.\n\n"
                "Would you like to download and install it?"
            ),
        )
        if not answer:
            return

        thread = threading.Thread(
            target=self._download_and_launch_update,
            args=(release,),
            daemon=True,
        )
        thread.start()

    def _download_and_launch_update(self, release: ReleaseInfo) -> None:
        try:
            installer_path = self.paths.config_dir / "FileOrganizerSetup.exe"
            self.logger.log("Downloading update...")
            installer = self.updater.download_installer(release, installer_path)
            self.logger.log("Launching installer...")
            os.startfile(str(installer))
            self.root.after(0, self.root.destroy)
            os._exit(0)
        except Exception as exc:
            self.logger.log(f"Update download failed: {exc}")
            self.root.after(
                0,
                lambda: messagebox.showerror(
                    "Update",
                    "Could not download the update.",
                ),
            )

    def _build_ui(self) -> None:
        self.textbox = t.CTkTextbox(
            self.root,
            wrap="word",
            state="disabled",
            font=("JetBrains Mono", 13),
        )
        self.label = t.CTkLabel(
            self.root,
            text="",
            font=("JetBrains Mono", 14),
        )
        self.button_change = t.CTkButton(
            self.root,
            text="Change Folder",
            fg_color="#333",
            text_color="#FFF",
            hover_color="#555",
            command=self.button_change_folder,
            font=("JetBrains Mono", 12),
        )
        self.button_organize = t.CTkButton(
            self.root,
            text="Organize",
            fg_color="#FFD700",
            text_color="#000",
            hover_color="#00AEFF",
            command=self.request_organize,
            font=("JetBrains Mono", 14),
        )
        self.button_background = t.CTkButton(
            self.root,
            text="",
            fg_color="#FFD700",
            text_color="#000",
            hover_color="#00AEFF",
            command=self.button_toggle_background,
            font=("JetBrains Mono", 14),
        )
        self.button_updates = t.CTkButton(
            self.root,
            text="Check for Updates",
            fg_color="transparent",
            border_width=1,
            border_color="#FFD700",
            text_color="#FFD700",
            hover_color="#333",
            command=lambda: self.check_for_updates(manual=True),
            font=("JetBrains Mono", 12),
        )

        self.textbox.pack(padx=10, pady=10, expand=True, fill="both")
        self.label.pack(pady=(0, 5))
        self.button_change.pack(pady=(0, 10))
        self.button_organize.pack(pady=(0, 10))
        self.button_background.pack(pady=(0, 10))
        self.button_updates.pack(pady=(0, 10))

        self._update_target_label()
        self._sync_background_button()

    def _apply_font(self) -> None:
        self._load_font_windows(self.paths.font_file)

        try:
            font.nametofont("TkDefaultFont").configure(
                family="JetBrains Mono",
                size=12,
            )
            font.nametofont("TkTextFont").configure(
                family="JetBrains Mono",
                size=12,
            )
            font.nametofont("TkFixedFont").configure(
                family="JetBrains Mono",
                size=12,
            )
        except Exception as exc:
            self.logger.log(f"Error: Could not load font settings: {exc}")

    def _apply_window_icon(self) -> None:
        icon_path = self.paths.icon_file
        if not icon_path.exists():
            return

        try:
            self.root.iconbitmap(str(icon_path))
        except Exception as exc:
            self.logger.log(f"Error: Could not set window icon: {exc}")

    def _load_font_windows(self, font_path: Path) -> bool:
        if not font_path.exists():
            return False

        try:
            ctypes.windll.gdi32.AddFontResourceExW(str(font_path), 0x10, 0)
            return True
        except Exception as exc:
            self.logger.log(f"Error loading font via GDI: {exc}")
            return False

    def _update_target_label(self) -> None:
        formatted_path = self._format_target_path(self.config.target_path)
        self.label.configure(text=f"Organize files in \n{formatted_path}")

    def _sync_background_button(self) -> None:
        text = (
            "Don't Run in Background"
            if self.config.run_in_background
            else "Run in Background"
        )
        self.button_background.configure(text=text)

    def _schedule_log_append(self, message: str) -> None:
        self.root.after(0, lambda: self._append_log_line(message))

    def _append_log_line(self, message: str) -> None:
        try:
            if self.root.state() == "withdrawn":
                return
        except Exception:
            return

        self.textbox.configure(state="normal")
        self.textbox.insert("end", f"{message}\n")
        self.textbox.configure(state="disabled")
        self.textbox.see("end")

    def _clear_log_view(self) -> None:
        self.textbox.configure(state="normal")
        self.textbox.delete("0.0", "end")
        self.textbox.configure(state="disabled")

    def _restore_window(self) -> None:
        self.root.deiconify()
        self.reload_logs()

    def _load_tray_image(self) -> Image.Image:
        icon_path = self.paths.icon_file
        if icon_path.exists():
            try:
                with Image.open(icon_path) as image:
                    return image.copy()
            except Exception as exc:
                self.logger.log(f"Error: Could not load tray icon: {exc}")

        packaged_icon = resolve_packaged_asset("FileOrganizer.ico")
        if packaged_icon is not None:
            try:
                with Image.open(packaged_icon) as image:
                    return image.copy()
            except Exception as exc:
                self.logger.log(f"Error: Could not load packaged tray icon: {exc}")

        return Image.new("RGBA", (64, 64), (255, 215, 0, 255))

    @staticmethod
    def _format_target_path(path: Path) -> str:
        text = str(path)
        if len(text) < 30:
            return text
        return "..." + text[-27:]
