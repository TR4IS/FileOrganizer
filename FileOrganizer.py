import os
import shutil
import threading
import configparser
import customtkinter as t
from customtkinter import filedialog
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from PIL import Image
import pystray
import time
import requests
from tkinter import font, messagebox
import ctypes
from pathlib import Path
import sys

# followrs want 1 - set gifs,ttf fonts folder 2 -

# ==============================
# 📁 Windows File Organizer
# ==============================

VERSION = "1.2.1"
UPDATE_URL = "https://raw.githubusercontent.com/tr4is/fileorganizer/main/docs/version.json"
ICON_URL = "https://raw.githubusercontent.com/tr4is/fileorganizer/main/docs/FileOrganizer.ico"
FONT_URL = "https://raw.githubusercontent.com/tr4is/fileorganizer/main/docs/JetBrainsMono-Regular.ttf"

# ==============================
# 📁 Named Mutex
# ==============================

mutex_handle = None 

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

LOCAL_APP_DATA = os.environ.get('LOCALAPPDATA', str(Path.home() / "AppData" / "Local"))
CONFIG_PATH = os.path.join(LOCAL_APP_DATA, "FileOrganizer")
ICON_FILE = os.path.join(CONFIG_PATH, "FileOrganizer.ico")
CONFIG_FILE = os.path.join(CONFIG_PATH, "config.ini")
LOG_FILE = os.path.join(CONFIG_PATH, "log.txt")
FONT = os.path.join(CONFIG_PATH,'JetBrainsMono-Regular.ttf')

os.makedirs(CONFIG_PATH, exist_ok=True)

FILE_TYPES = {
    'zip': ['.zip', '.rar'],
    'image': ['.png', '.jpg', '.gif', '.jpeg', '.psd'],
    'pdf': ['.pdf'],
    'exe': ['.exe', '.msi'],
    'sound': ['.mp3', '.wav', '.ogg', '.flac', '.m4a'],
    'video': ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
    'os': ['.iso', '.img'],
    'gif':['.gif','.webp','.apng','avif'], 
    'font':['.ttf','.otf','.ttc'],
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

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

if not os.path.exists(ICON_FILE):
    try:
        r = requests.get(ICON_URL, headers=HEADERS, timeout=10)
        r.raise_for_status()
        with open(ICON_FILE,'wb') as f:
            f.write(r.content)
    except Exception as e:
        log_txt(f"Error: Couldn't Find Icon File : {e}")

if not os.path.exists(FONT):
    try:
        r = requests.get(FONT_URL, headers=HEADERS, timeout=10)
        r.raise_for_status()
        with open(FONT,'wb') as f:
            f.write(r.content)
    except Exception as e:
        log_txt(f"Error: Couldn't Find Font File : {e}")

# ==============================
# 🖥️ Tkinter UI
# ==============================

root = t.CTk()

def load_font_windows(font_path):
    FR_PRIVATE  = 0x10
    if os.path.exists(font_path):
        try:
            ctypes.windll.gdi32.AddFontResourceExW(font_path, FR_PRIVATE, 0)
            return True
        except Exception as e:
            log_txt(f"Error loading font via GDI: {e}")
            return False
    return False

load_font_windows(FONT)

try:
    font.nametofont("TkDefaultFont").configure(family="JetBrains Mono", size=12)
    font.nametofont("TkTextFont").configure(family="JetBrains Mono", size=12)
    font.nametofont("TkFixedFont").configure(family="JetBrains Mono", size=12)
except Exception as e:
    log_txt(f"Error: Couldn't Load Font File : {e}")

root.geometry("300x480+750+350")
root.minsize(300,480)
root.title("File Organizer")
if os.path.exists(ICON_FILE):
    try:
        root.iconbitmap(f'{ICON_FILE}')
    except Exception as e:
        log_txt(f"Error: Could not set window icon: {e}")

textbox = t.CTkTextbox(root, wrap="word", state="disabled",font=('JetBrains Mono',13))

# ==============================
# 📂 Configuration & Path Management
# ==============================

DEFAULT_DOWNLOAD_PATH = str(Path.home()/"Downloads")

def ensure_valid_config():
    default_config = {
        'App': {
            'run_in_back': 'false',
            'target_path': DEFAULT_DOWNLOAD_PATH
        }
    }

    if not os.path.exists(CONFIG_FILE):
        log_txt("Config missing. Creating new config.ini...")
        _write_default_config(default_config)
        return

    try:
        config.read(CONFIG_FILE)
        if 'App' not in config or 'run_in_back' not in config['App'] or 'target_path' not in config['App']:
            raise ValueError("Missing required config fields")

        if config['App']['run_in_back'].lower() not in ['true', 'false']:
            raise ValueError("Invalid boolean value in config")
        
        if not os.path.exists(config['App']['target_path']):
            log_txt("Saved target path no longer exists. Reverting to default.")
            config['App']['target_path'] = DEFAULT_DOWNLOAD_PATH
            with open(CONFIG_FILE, 'w') as f:
                config.write(f)

    except Exception as e:
        log_txt(f"Config corrupted: {e}. Recreating config.ini...")
        _write_default_config(default_config)

def _write_default_config(default_config):
    config.clear()
    config.update(default_config)
    with open(CONFIG_FILE, 'w') as f:
        config.write(f)

config = configparser.ConfigParser()
ensure_valid_config()

run_background = config.getboolean('App', 'run_in_back')
TARGET_PATH = config.get('App', 'target_path')

# ==============================
# 📂 Organizer Core
# ==============================

organize_running = False
organize_timer = None
currently_moving = set()
observer = None

def check_for_updates(manual=False):
    def _check():
        try:
            response = requests.get(UPDATE_URL, headers=HEADERS, timeout=10)
            response.raise_for_status()
            data = response.json()
            remote_version = data.get("version")
            download_url = data.get("url")

            if remote_version and remote_version > VERSION:
                if messagebox.askyesno("Update Available", f"A new version ({remote_version}) is available.\n\nWould you like to download and install it?"):
                    log("Downloading update...")
                    installer_path = os.path.join(CONFIG_PATH, "FileOrganizerSetup.exe")
                    r = requests.get(download_url, headers=HEADERS, stream=True)
                    with open(installer_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    log("Launching installer...")
                    os.startfile(installer_path)
                    root.after(0, root.destroy)
                    os._exit(0)
            elif manual:
                messagebox.showinfo("Update Check", f"You are on the latest version ({VERSION}).")
        except Exception as e:
            log_txt(f"Update check failed: {e}")
            if manual:
                messagebox.showerror("Update Check", "Could not check for updates. Check your internet connection.")

    threading.Thread(target=_check, daemon=True).start()

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

def reload_logs(max_lines=0):
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'r', encoding="utf8") as f:
            lines = f.readlines()
        lines = lines[-max_lines:]
        textbox.configure(state="normal")
        textbox.delete("0.0", "end")
        textbox.insert("end", "".join(lines))
        textbox.configure(state="disabled")
        textbox.see("end")

def safe_discard(path):
    def _remove():
        currently_moving.discard(os.path.abspath(path))
    threading.Timer(1.0, _remove).start()

def is_file_ready(file_path):
    """
    Non-blocking check to see if a file is completely downloaded and unlocked.
    Handles both large files and 0-byte files safely.
    """
    try:
        # If the file was moved or deleted before we could check, abort.
        if not os.path.exists(file_path):
            return False
            
        # The ultimate check on Windows: Can we get a write lock?
        # Browsers and download managers lock the file while actively downloading.
        with open(file_path, 'a'):
            pass
            
        return True
        
    except PermissionError:
        # The file is currently locked (actively downloading or being scanned)
        return False
    except OSError:
        # Catch-all for other low-level Windows file access errors
        return False

# Global dictionary to track retries and prevent infinite loops on stuck files
retry_tracker = {}

def organize():
    global organize_running, TARGET_PATH, retry_tracker
    
    # Prevent multiple threads from organizing at the exact same time
    if organize_running:
        return
    organize_running = True
    
    files_deferred = False  # Tracks if we skipped any files and need a wake-up call

    def _clear_ui():
        try:
            if root.state() != "withdrawn":
                textbox.configure(state="normal")
                textbox.delete("0.0", "end")
                textbox.configure(state="disabled")
        except Exception as e:
            log_txt(f"Error: Failed to clear textbox: {e}")

    root.after(0, _clear_ui)

    # Ensure target folders exist
    for folder in FILE_TYPES.keys():
        folder_path = os.path.join(TARGET_PATH, folder)
        if not os.path.exists(folder_path):
            try:
                os.makedirs(folder_path)
                log(f"[+] Created folder: {folder_path}")
            except Exception as e:
                log_txt(f"Error creating folder {folder_path}: {e}")
                organize_running = False
                return

    try:
        items = os.listdir(TARGET_PATH)
    except Exception as e:
        log(f"[!] Error reading directory: {e}")
        organize_running = False
        return

    for item in items:
        path = os.path.join(TARGET_PATH, item)

        # Ignore the target folders themselves
        if item.lower() in FILE_TYPES:
            continue

        # Handle moving directories to 'random'
        if os.path.isdir(path):
            dest = os.path.join(TARGET_PATH, 'random', item)
            currently_moving.add(os.path.abspath(dest))
            try:
                shutil.move(path, dest)
                log(f"[→] Moved folder: {item} → random/")
            except Exception as e:
                log_txt(f"Error: Failed to move folder {item}: {e}")
            safe_discard(os.path.abspath(dest))
            continue

        _, ext = os.path.splitext(item.lower())
        
        # Ignore known temporary browser extensions
        if ext in TEMP_EXTENSIONS:
            continue

        # == THE NON-BLOCKING CHECK ==
        if not is_file_ready(path):
            # Track retries to avoid an infinite loop if a file is permanently locked (e.g., left open in another app)
            retry_tracker[item] = retry_tracker.get(item, 0) + 1
            
            # If we've retried for less than ~1 hour (720 loops * 5 seconds), schedule a wake-up call
            if retry_tracker[item] < 720:
                files_deferred = True
            continue
            
        # If the file is ready, clean it out of the retry tracker
        if item in retry_tracker:
            del retry_tracker[item]

        # Process and move the ready file
        moved = False
        for folder, exts in FILE_TYPES.items():
            if ext in exts:
                dest = os.path.join(TARGET_PATH, folder, item)
                currently_moving.add(os.path.abspath(dest))
                try:
                    shutil.move(path, dest)
                    log(f"[→] {item} → {folder}/")
                except Exception as e:
                    log_txt(f"Error: Failed to move {item}: {e}")
                safe_discard(os.path.abspath(dest))
                moved = True
                break

        if not moved:
            dest = os.path.join(TARGET_PATH, 'random', item)
            currently_moving.add(os.path.abspath(dest))
            try:
                shutil.move(path, dest)
                log(f"[→] {item} → random/")
            except Exception as e:
                log_txt(f"Error: Failed to move {item}: {e}")
            safe_discard(os.path.abspath(dest))

    # Release the lock so the script can be triggered again
    organize_running = False

    # == THE WAKE-UP CALL ==
    if files_deferred:
        # File(s) were locked. Wait 5 seconds, then fire the organize button logic again in the background.
        threading.Timer(5.0, button_organize).start()
    else:
        log(f"✅ Done organizing {TARGET_PATH}!")
# ==============================
# 👀 Watchdog
# ==============================

class DownloadsHandler(FileSystemEventHandler):
    DEBOUNCE_SECONDS = 2.0

    def on_created(self, event):
        if event.is_directory: return
        self._handle_path(event.src_path)

    def on_modified(self, event):
        if event.is_directory: return
        self._handle_path(event.src_path)

    def on_moved(self, event):
        if event.is_directory: return
        self._handle_path(event.dest_path)

    def _handle_path(self, path):
        global organize_timer, organize_running

        if organize_running:
            return

        _, ext = os.path.splitext(path.lower())

        if ext in TEMP_EXTENSIONS:
            return

        if os.path.abspath(path) in currently_moving:
            return

        if organize_timer and organize_timer.is_alive():
            organize_timer.cancel()

        organize_timer = threading.Timer(self.DEBOUNCE_SECONDS, organize)
        organize_timer.start()

# ==============================
# 🎨 Buttons & Actions
# ==============================

def button_organize():
    threading.Thread(target=organize, daemon=True).start()

def button_change_folder():
    global TARGET_PATH, observer, organize_running

    # Use Case 1 Guard: Prevent changing while currently moving files
    if organize_running:
        messagebox.showwarning("Busy", "Organization is currently in progress. Please wait until it finishes before changing the target folder.")
        return

    new_folder = filedialog.askdirectory(title="Select Folder to Organize", initialdir=TARGET_PATH)
    
    # Handle user cancellation
    if not new_folder:
        return

    # Use Case 2 Guard: Check for Read/Write Permissions
    if not os.access(new_folder, os.W_OK) or not os.access(new_folder, os.R_OK):
        messagebox.showerror("Permission Error", f"Cannot organize '{new_folder}'. The program requires read and write permissions for the selected directory.")
        return

    # Avoid redundant operations if the path is identical
    new_folder = os.path.normpath(new_folder)
    if new_folder == TARGET_PATH:
        return

    TARGET_PATH = new_folder

    # Save to config
    config['App']['target_path'] = TARGET_PATH
    with open(CONFIG_FILE, 'w') as f:
        config.write(f)

    # Update UI Label
    formatted_path = TARGET_PATH if len(TARGET_PATH) < 30 else "..." + TARGET_PATH[-27:]
    label.configure(text=f"Organize files in \n{formatted_path}")

    # Use Case 3 Guard: Safely transition the Watchdog Observer to the new directory
    if run_background:
        def restart_observer():
            global observer
            if observer:
                observer.stop()
                observer.join()
            
            try:
                observer = Observer()
                observer.schedule(DownloadsHandler(), TARGET_PATH, recursive=False)
                observer.start()
                log(f"[*] Background tracking moved to {TARGET_PATH}")
            except Exception as e:
                log_txt(f"Error restarting observer: {e}")
                messagebox.showerror("Observer Error", "Could not start background tracking on the new folder.")
        
        threading.Thread(target=restart_observer, daemon=True).start()

def button_toggle_background():
    global run_background, observer, TARGET_PATH
    if run_background:
        def stop_observer():
            global observer
            try:
                if observer:
                    observer.stop()
                    observer.join()
            except Exception as e:
                log_txt(f"Error: Error stopping observer : {e}")
            finally:
                observer = None
        
        threading.Thread(target=stop_observer, daemon=True).start()
        button_bg.configure(text="Run in Background")
        run_background = False
        log("[*] Background tracking stopped.")
    else:
        try:
            observer = Observer()
            observer.schedule(DownloadsHandler(), TARGET_PATH, recursive=False)
            observer.start()
            button_bg.configure(text="Don't Run in Background")
            run_background = True
            log("[*] Background tracking started.")
        except Exception as e:
            log_txt(f"Error starting observer: {e}")
            messagebox.showerror("Error", "Could not start tracking. Check permissions.")
            return

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
        image = Image.open(ICON_FILE)
    except Exception as e:
        log_txt(f"Error: Error Loading Tray Icon : {e}")
        image = None
    menu = pystray.Menu(
        pystray.MenuItem('Show', show_window),
        pystray.MenuItem('Check for Updates', lambda: check_for_updates(manual=True)),
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

display_path = TARGET_PATH if len(TARGET_PATH) < 30 else "..." + TARGET_PATH[-27:]
label = t.CTkLabel(root, text=f"Organize files in \n{display_path}",font=("JetBrains Mono",14))

button_change = t.CTkButton(root, text="Change Folder", fg_color="#333", text_color="#FFF", command=button_change_folder, hover_color="#555",
    font=("JetBrains Mono",12))
button_org = t.CTkButton(root, text="Organize", fg_color="#FFD700", text_color="#000", command=button_organize,hover_color="#00aeff",
    font=("JetBrains Mono",14))
button_bg = t.CTkButton(root,
                        text="Don't Run in Background" if run_background else "Run in Background",
                        fg_color="#FFD700", text_color="#000",
                        hover_color="#00aeff",
                        command=button_toggle_background,
    font=("JetBrains Mono",14))
button_upd = t.CTkButton(root, text="Check for Updates", fg_color="transparent", border_width=1, border_color="#FFD700", text_color="#FFD700", command=lambda: check_for_updates(manual=True), hover_color="#333",
    font=("JetBrains Mono",12))

textbox.pack(padx=10, pady=10, expand=True, fill="both")
label.pack(pady=(0,5))
button_change.pack(pady=(0,10))
button_org.pack(pady=(0,10))
button_bg.pack(pady=(0,10))
button_upd.pack(pady=(0,10))

# ==============================
# 🚀 Run
# ==============================

if __name__ == "__main__":
    check_for_updates()
    
    if run_background:
        try:
            observer = Observer()
            observer.schedule(DownloadsHandler(), TARGET_PATH, recursive=False)
            observer.start()
        except Exception as e:
            log_txt(f"Error: Could not start observer on launch: {e}")
            run_background = False
    root.mainloop()