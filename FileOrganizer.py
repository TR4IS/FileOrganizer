import os
import shutil
import threading
import configparser
import customtkinter as t
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from PIL import Image
import pystray
import time
import requests
from tkinter import font
import ctypes
from pathlib import Path
import sys

# TO-DO = while the file convert from crdownload to the actuall extention faster than the script could handle so it won't actually move it


# ==============================
# 📁 Windows File Organizer
# ------------------------------
# Organizes your Downloads folder into subfolders based on default file types:
# zip, image, pdf, exe, sound, video, OS images (ISO), and random. or your custom layout!.
# made with <3 by TR4IS on Github
# ==============================

# ==============================
# 📁 Named Mutex
# ==============================

mutex_handle = None  # global handle to keep mutex alive

def prevent_multiple_instances():
    global mutex_handle
    mutex_name = "Global\\FileOrganizerMutex"

    mutex_handle = ctypes.windll.kernel32.CreateMutexW(None, False, mutex_name)
    error = ctypes.windll.kernel32.GetLastError()

    if error == 183:
        ctypes.windll.user32.MessageBoxW(0, "File Organizer is already running.", "Warning", 0x40)
        sys.exit(0)

prevent_multiple_instances()


# ==============================
# 📁 Setup
# ==============================

t.set_appearance_mode("dark")


DOWNLOAD_PATH = str(Path.home()/"Downloads")
DOCS_PATH = str(Path.home() / "Documents")
CONFIG_PATH = os.path.join(DOCS_PATH, "FileOrganizer")
ICON_FILE = os.path.join(CONFIG_PATH, "FileOrganizer.ico")
CONFIG_FILE = os.path.join(CONFIG_PATH, "config.ini")
ICON_URL = "https://raw.githubusercontent.com/tr4is/fileorganizer/main/docs/FileOrganizer.ico"
FONT_URL = "https://raw.githubusercontent.com/tr4is/fileorganizer/main/docs/JetBrainsMono-Regular.ttf"
LOG_FILE = os.path.join(CONFIG_PATH, "log.txt")
FONT = os.path.join(CONFIG_PATH,'JetBrainsMono-Regular.ttf')


os.makedirs(CONFIG_PATH, exist_ok=True)



# File types / note: the dot is important because splitext fuc split the name alson and the dot considerd with the extentuin
FILE_TYPES = {
    'zip': ['.zip', '.rar'],
    'image': ['.png', '.jpg', '.gif', '.jpeg', '.psd'],
    'pdf': ['.pdf'],
    'exe': ['.exe', '.msi'],
    'sound': ['.mp3', '.wav', '.ogg', '.flac', '.m4a'],
    'video': ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
    'os': ['.iso', '.img'],
    'random': []
}
TEMP_EXTENSIONS = [
    ".crdownload", ".part", ".part1", ".part2", ".part3",
    ".tmp", ".temp", ".download"
]

# ==============================
# 📁 Logger
# ==============================

def log_txt(msg):
    with open(LOG_FILE,'a',encoding="utf8") as f:
        f.write(msg + "\n")


# ==============================
# 📁 Download icon + font
# ==============================

if not os.path.exists(ICON_FILE):
    try:
        r = requests.get(ICON_URL,timeout=10)
        with open(ICON_FILE,'wb') as f:
            f.write(r.content)
    except Exception as e:
        log_txt(f"Error: Couldn't Find Icon File : {e}")

if not os.path.exists(FONT):
    try:
        r = requests.get(FONT_URL,timeout=10)
        with open(FONT,'wb') as f:
            f.write(r.content)
    except Exception as e:
        log_txt(f"Error: Couldn't Find Font File : {e}")




# ==============================
# 🖥️ Tkinter UI
# ==============================

root = t.CTk()

# ------------------------------
# 📁 Load fonts
# ------------------------------

def load_font_windows(font_path):
    """Load a TTF font into Windows temporarily so Tkinter can use it."""
    FR_PRIVATE  = 0x10
    FR_NOT_ENUM = 0x20

    if os.path.exists(font_path):
        try:
            ctypes.windll.gdi32.AddFontResourceExW(font_path, FR_PRIVATE, 0)
            return True
        except Exception as e:
            log_txt(f"Error loading font via GDI: {e}")
            return False
    return False

# Load the font file now
load_font_windows(FONT)

try:
    font.nametofont("TkDefaultFont").configure(family="JetBrains Mono", size=12)
    font.nametofont("TkTextFont").configure(family="JetBrains Mono", size=12)
    font.nametofont("TkFixedFont").configure(family="JetBrains Mono", size=12)
except Exception as e:
    log_txt(f"Error: Couldn't Load Font File : {e}")




root.geometry("250x400+750+350")
root.minsize(250,400)
root.title("File Organizer")
root.iconbitmap(f'{ICON_FILE}')

textbox = t.CTkTextbox(root, wrap="word", state="disabled",font=('JetBrains Mono',13))

# ==============================
# 📂 Organizer
# ==============================

organize_running = False
organize_timer = None
currently_moving = set()
observer = None

def ensure_valid_config():
    """Verify config.ini is readable and contains required fields.
    If corrupted or missing keys, recreate it with defaults."""
    default_config = {
        'App': {
            'run_in_back': 'false'
        }
    }

    # If file doesn't exist → create fresh one
    if not os.path.exists(CONFIG_FILE):
        log_txt("Config missing. Creating new config.ini...")
        _write_default_config(default_config)
        return

    try:
        config.read(CONFIG_FILE)

        # Check required section and keys
        if 'App' not in config or 'run_in_back' not in config['App']:
            raise ValueError("Missing required config fields")

        # Validate the value itself
        if config['App']['run_in_back'].lower() not in ['true', 'false']:
            raise ValueError("Invalid boolean value in config")

    except Exception as e:
        log_txt(f"Config corrupted: {e}. Recreating config.ini...")
        _write_default_config(default_config)

def _write_default_config(default_config):
    config.clear()
    config.update(default_config)
    with open(CONFIG_FILE, 'w') as f:
        config.write(f)

# Config
config = configparser.ConfigParser()
ensure_valid_config()
run_background = config.getboolean('App', 'run_in_back')


def log(msg):
    with open(LOG_FILE,'a',encoding="utf8") as f:
        f.write(msg + "\n")
    def _ui_log():
        try:
            if root.state() != "withdrawn":
                textbox.configure(state="normal")
                textbox.insert("end", msg + "\n")
                textbox.configure(state="disabled")
                textbox.see("end")
        except Exception as e:
            log_txt(f"Error: Error with the window tray : {e}")

    try:
        root.after(0,_ui_log)
    except Exception as e:
        log_txt(f"Error: Error with logs : {e}")


def reload_logs(max_lines=50):
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'r', encoding="utf8") as f:
            lines = f.readlines()

        # Only keep the last 500 lines
        lines = lines[-max_lines:]

        textbox.configure(state="normal")
        textbox.delete("0.0", "end")
        textbox.insert("end", "".join(lines))
        textbox.configure(state="disabled")

        # Auto-scroll to bottom
        textbox.see("end")

def safe_discard(path):
    """Remove a path from currently_moving after a short delay."""
    def _remove():
        currently_moving.discard(os.path.abspath(path))
    threading.Timer(1.0, _remove).start()


def wait_for_complete(file_path, timeout=30):
    """Wait until file is no longer growing in size (download finished)."""
    last_size = -1
    for _ in range(timeout * 2):  # check for up to timeout seconds
        try:
            size = os.path.getsize(file_path)
        except FileNotFoundError:
            return False
        except PermissionError:
            time.sleep(1)
            continue
        if size == last_size and size > 0:
            return True
        last_size = size
        time.sleep(0.5)
    return False


def organize():
    global organize_running
    if organize_running:
        return
    organize_running = True

    if root.state() != "withdrawn":
        # Clear log
        textbox.configure(state="normal")
        textbox.delete("0.0", "end")
        textbox.configure(state="disabled")

    # Ensure folders exist
    for folder in FILE_TYPES.keys():
        folder_path = os.path.join(DOWNLOAD_PATH, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            log(f"[+] Created folder: {folder_path}")

    # Process items
    for item in os.listdir(DOWNLOAD_PATH):
        path = os.path.join(DOWNLOAD_PATH, item)

        if item.lower() in FILE_TYPES:
            continue

        if os.path.isdir(path):
            dest = os.path.join(DOWNLOAD_PATH, 'random', item)
            currently_moving.add(os.path.abspath(dest))
            try:
                shutil.move(path, dest)
            except Exception as e:
                log_txt(f"Error: Failed to move : {e}")
            safe_discard(os.path.abspath(dest))
            log(f"[→] Moved folder: {item} → random/")
            continue

        _, ext = os.path.splitext(item.lower())
        if ext in TEMP_EXTENSIONS:
            continue

        if not wait_for_complete(path):
            log(f"[!] Skipping incomplete file: {item}")
            continue

        moved = False
        for folder, exts in FILE_TYPES.items():
            if ext in exts:
                dest = os.path.join(DOWNLOAD_PATH, folder, item)
                currently_moving.add(os.path.abspath(dest))
                try:
                    shutil.move(path, dest)
                except Exception as e:
                    log_txt(f"Error: Failed to move : {e}")

                safe_discard(os.path.abspath(dest))
                log(f"[→] {item} → {folder}/")
                moved = True
                break

        if not moved:
            dest = os.path.join(DOWNLOAD_PATH, 'random', item)
            currently_moving.add(os.path.abspath(dest))
            try:
                shutil.move(path, dest)
            except Exception as e:
                log_txt(f"Error: Failed to move : {e}")

            safe_discard(os.path.abspath(dest))
            log(f"[→] {item} → random/")

    log("✅ Done organizing your Downloads folder!")
    organize_running = False

# ==============================
# 👀 Watchdog
# ==============================

class DownloadsHandler(FileSystemEventHandler):
    DEBOUNCE_SECONDS = 2.0

    def on_created(self, event):
        if event.is_directory:
            return
        self._handle_path(event.src_path)

    def on_modified(self, event):
        if event.is_directory:
            return
        self._handle_path(event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        # IMPORTANT FIX:
        # When a file finishes downloading, Chrome RENAMES it
        # from .crdownload -> final extension
        self._handle_path(event.dest_path)

    def _handle_path(self, path):
        global organize_timer, organize_running

        # Ignore while organizer is running
        if organize_running:
            return

        _, ext = os.path.splitext(path.lower())

        # Ignore temp/incomplete files
        if ext in TEMP_EXTENSIONS:
            return

        # Ignore files being moved by organizer itself
        if os.path.abspath(path) in currently_moving:
            return

        # Debounce multiple events
        if organize_timer and organize_timer.is_alive():
            organize_timer.cancel()

        organize_timer = threading.Timer(
            self.DEBOUNCE_SECONDS,
            organize
        )
        organize_timer.start()

# ==============================
# 🎨 Buttons
# ==============================

def button_organize():
    organize()


def button_toggle_background():
    global run_background, observer
    if run_background:
        try:
            if observer:
                observer.stop()
                observer.join()
        except Exception as e:
            log_txt(f"Error: Error stopping observer : {e}")
        finally:
            observer = None
        button_bg.configure(text="Run in Background")
        run_background = False
    else:
        observer = Observer()
        observer.schedule(DownloadsHandler(), DOWNLOAD_PATH, recursive=False)
        observer.start()
        button_bg.configure(text="Don't Run in Background")
        run_background = True

    config['App']['run_in_back'] = 'true' if run_background else 'false'
    with open(CONFIG_FILE, 'w') as f:
        config.write(f)

# ==============================
# 🪟 System Tray
# ==============================

def show_window(icon, item):
    icon.stop()
    def _show():
        root.deiconify()
        reload_logs()
    root.after(0, _show)

def quit_app(icon, item):
    global observer
    try:
        if organize_timer:
            organize_timer.cancel()

    except Exception as e:
        log_txt(f"Error: Error with system tray : {e}")

    if observer:
        observer.stop()
        observer.join()
        observer = None
    icon.stop()
    root.quit()

def minimize_to_tray():
    root.withdraw()
    try:
        image = Image.open(ICON_FILE)  # Your icon file
    except Exception as e:
        log_txt(f"Error: Error Loading Tray Icon : {e}")
        image = None
    menu = pystray.Menu(
        pystray.MenuItem('Show', show_window),
        pystray.MenuItem('Quit', quit_app)
    )
    icon = pystray.Icon("FileOrganizer", image, "File Organizer", menu)
    threading.Thread(target=icon.run, daemon=True).start()

def on_closing():
    global observer
    if not run_background and observer:
        observer.stop()
        observer.join()
        observer = None
    minimize_to_tray()

root.protocol("WM_DELETE_WINDOW", on_closing)

# ==============================
# 🪛 UI Elements
# ==============================

label = t.CTkLabel(root, text=f"Organize files in \n{DOWNLOAD_PATH} ?",font=("JetBrains Mono",14))
button_org = t.CTkButton(root, text="Organize", fg_color="#FFD700", text_color="#000", command=button_organize,hover_color="#00aeff",
    font=("JetBrains Mono",14))
button_bg = t.CTkButton(root,
                        text="Don't Run in Background" if run_background else "Run in Background",
                        fg_color="#FFD700", text_color="#000",
                        hover_color="#00aeff",
                        command=button_toggle_background,
    font=("JetBrains Mono",14))

textbox.pack(padx=10, pady=10, expand=True, fill="both")
label.pack(pady=(0,0))
button_org.pack(pady=(10,0))
button_bg.pack(pady=10)

# ==============================
# 🚀 Run
# ==============================

if __name__ == "__main__":
    if run_background:
        observer = Observer()
        observer.schedule(DownloadsHandler(), DOWNLOAD_PATH, recursive=False)
        observer.start()
    root.mainloop()
