import os
import shutil
import threading
import configparser
import customtkinter as t
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from PIL import Image
import pystray

# ==============================
# 📁 Setup
# ==============================

t.set_appearance_mode("dark")

USER = os.getlogin()
DOWNLOAD_PATH = f"C:/Users/{USER}/Downloads"
DOCS_PATH = f"C:/Users/{USER}/Documents"
CONFIG_PATH = os.path.join(DOCS_PATH, "FileOrganizer")
CONFIG_FILE = os.path.join(CONFIG_PATH, "config.ini")

os.makedirs(CONFIG_PATH, exist_ok=True)

# Config
config = configparser.ConfigParser()
if not os.path.exists(CONFIG_FILE):
    config['App'] = {'run_in_back': 'false'}
    with open(CONFIG_FILE, 'w') as f:
        config.write(f)
config.read(CONFIG_FILE)

# File types
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
TEMP_EXTENSIONS = ['.crdownload', '.part', '.tmp']

# ==============================
# 🖥️ Tkinter UI
# ==============================

root = t.CTk()
root.geometry("250x400")
root.title("File Organizer")

textbox = t.CTkTextbox(root, wrap="word", state="disabled")
textbox.pack(padx=10, pady=10, expand=True, fill="both")

# ==============================
# 📂 Organizer
# ==============================

organize_running = False
organize_timer = None
currently_moving = set()
observer = None
run_background = config.getboolean('App', 'run_in_back')


def log(msg):
    textbox.configure(state="normal")
    textbox.insert("end", msg + "\n")
    textbox.configure(state="disabled")
    textbox.see("end")


def organize():
    global organize_running
    if organize_running:
        return
    organize_running = True

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
            currently_moving.add(path)
            shutil.move(path, dest)
            currently_moving.discard(path)
            log(f"[→] Moved folder: {item} → random/")
            continue

        _, ext = os.path.splitext(item.lower())
        if ext in TEMP_EXTENSIONS:
            continue

        moved = False
        for folder, exts in FILE_TYPES.items():
            if ext in exts:
                dest = os.path.join(DOWNLOAD_PATH, folder, item)
                currently_moving.add(path)
                shutil.move(path, dest)
                currently_moving.discard(path)
                log(f"[→] {item} → {folder}/")
                moved = True
                break

        if not moved:
            dest = os.path.join(DOWNLOAD_PATH, 'random', item)
            currently_moving.add(path)
            shutil.move(path, dest)
            currently_moving.discard(path)
            log(f"[→] {item} → random/")

    log("✅ Done organizing your Downloads folder!")
    organize_running = False

# ==============================
# 👀 Watchdog
# ==============================

class DownloadsHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        global organize_timer
        if event.is_directory:
            return
        if event.src_path in currently_moving:
            return
        if organize_timer and organize_timer.is_alive():
            organize_timer.cancel()
        organize_timer = threading.Timer(2.0, organize)
        organize_timer.start()

# ==============================
# 🎨 Buttons
# ==============================

def button_organize():
    organize()


def button_toggle_background():
    global run_background, observer
    if run_background:
        if observer:
            observer.stop()
            observer.join()
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
    root.after(0, root.deiconify)

def quit_app(icon, item):
    icon.stop()
    try:
        if organize_timer:
            organize_timer.cancel()
    except:
        pass
    root.quit()

def minimize_to_tray():
    root.withdraw()
    image = Image.open("FileOrganizer.ico")  # Your icon file
    menu = pystray.Menu(
        pystray.MenuItem('Show', show_window),
        pystray.MenuItem('Quit', quit_app)
    )
    icon = pystray.Icon("FileOrganizer", image, "File Organizer", menu)
    threading.Thread(target=icon.run, daemon=True).start()

def on_closing():
    minimize_to_tray()

root.protocol("WM_DELETE_WINDOW", on_closing)

# ==============================
# 🪛 UI Elements
# ==============================

label = t.CTkLabel(root, text=f"Do you want to organize the files in \n{DOWNLOAD_PATH}?")
button_org = t.CTkButton(root, text="Organize", fg_color="#FFD700", text_color="#000", command=button_organize)
button_bg = t.CTkButton(root,
                        text="Don't Run in Background" if run_background else "Run in Background",
                        fg_color="#FFD700", text_color="#000",
                        command=button_toggle_background)

label.pack(pady=(40,0))
button_org.pack(pady=10)
button_bg.pack(pady=10)
textbox.pack(padx=10, pady=10, expand=True, fill="both")

# ==============================
# 🚀 Run
# ==============================

if __name__ == "__main__":
    if run_background:
        observer = Observer()
        observer.schedule(DownloadsHandler(), DOWNLOAD_PATH, recursive=False)
        observer.start()
    root.mainloop()
