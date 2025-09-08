import customtkinter as t
import os
import shutil
import threading
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ==============================
# 📁 Windows File Organizer
# ------------------------------
# Organizes your Downloads folder into subfolders based on file types:
# zip, image, pdf, exe, sound, video, OS images (ISO), and random.
# made by TR4IS on Github <3
# ==============================


# --- Setup ---
t.set_appearance_mode("dark")
# t.set_default_color_theme("yellow")


# Get the user Downloads Folder
user = os.getlogin()
download_path = f"C:/Users/{user}/Downloads"


#File types
file_types = {
    'zip': ['.zip', '.rar'],
    'image': ['.png', '.jpg', '.gif', '.jpeg', '.psd'],
    'pdf': ['.pdf'],
    'exe': ['.exe', '.msi'],
    'sound': ['.mp3', '.wav', '.ogg', '.flac', '.m4a'],
    'video': ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
    'os': ['.iso', '.img'],
    'random': []  # Everything else goes here
}


# --- Tkinter UI ---
root = t.CTk()
root.geometry("250x400")
root.minsize(250, 400)
root.title("File Organizer")
# root.resizable(False, False)
# root.iconbitmap("FO.ico")

# TextBox for the logs
textbox = t.CTkTextbox(root, wrap="word")
textbox.configure(state="disabled")

# --- Organize function ---
# this the main function for organizing the files 

# For running the organzie function only once
organize_running = False

def organize():

    global organize_running
    organize_running = True


    # Clear the text box with every run of the function
    textbox.configure(state="normal")
    textbox.delete("0.0", "end")  # Clear textbox
    textbox.configure(state="disabled")

    # Create folders if they don't exist
    for folder in file_types.keys():
        folder_path = os.path.join(download_path, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            textbox.configure(state="normal")
            textbox.insert("end", f"[+] Created folder: {folder_path}\n")
            textbox.configure(state="disabled")

    # List all items in Downloads
    items = os.listdir(download_path)
    sort_folders = set(file_types.keys())

    for item in items:
        item_path = os.path.join(download_path, item)

        # Skip sorting folders
        if item.lower() in sort_folders:
            continue

        # Get file extension
        _, ext = os.path.splitext(item.lower())
        moved = False

        # Check each category
        for folder, extensions in file_types.items():
            
            if ext in extensions:
                dest_path = os.path.join(download_path, folder, item)
                shutil.move(item_path, dest_path)
                textbox.configure(state="normal")
                textbox.insert("end", f"[→] Moved: {item} → {folder}/\n")
                textbox.configure(state="disabled")
                moved = True
                break

        
        

        # Move unmatched files to 'random'
        # Added a condition to avoid moving temporary files (e.g., files still downloading).
        # However, if a temporary file has a name that never changes, it will stay in the
        # Downloads folder forever—until its name changes or you move it manually.
        temp=['.crdownload', '.part', '.tmp']
        if not moved and ext not in temp:
            dest_path = os.path.join(download_path, 'random', item)
            shutil.move(item_path, dest_path)
            textbox.configure(state="normal")
            textbox.insert("end", f"[→] Moved: {item} → random/\n")
            textbox.configure(state="disabled")

    # Done message
    textbox.configure(state="normal")
    textbox.insert("end", "\n✅ Done organizing your Downloads folder!")
    textbox.configure(state="disabled")

    # To Run organize Function once
    organize_running = False

organize_timer = None

class DownloadsHandler(FileSystemEventHandler):
    def on_any_event(self,event):
        global organize_timer
        if event.is_directory:
            return
        
        if organize_timer and organize_timer.is_alive():
            organize_timer.cancel()

        if organize_running:
            return
        
        organize_timer = threading.Timer(2.0,organize)
        organize_timer.start()


def button_event():
    organize()

run = False
observer = None


def button_event2():
    global run
    global observer
    if run:
        button_run_back.configure(text="Run in Background")
        observer.stop()
        observer.join()
        run = False
    else:
        button_run_back.configure(text="Don't Run in Back")
        observer = Observer()
        handler = DownloadsHandler()
        observer.schedule(handler,download_path,recursive=False)
        observer.start()
        run = True
    #textbox.configure(state="normal")
    #textbox.insert("end", f"{run}")
    #textbox.configure(state="disabled")


# --- UI Elements ---
label = t.CTkLabel(root, text=f"Do you want to organize the files in \n{download_path} ?")
button = t.CTkButton(
    root,
    text="Organize",
    fg_color="#FFD700",
    hover_color="#b29600",
    text_color="#000",
    border_color="#000",
    command=button_event
)
button_run_back = t.CTkButton(
    root,
    text="Run in Background",
    fg_color="#FFD700",
    hover_color="#b29600",
    text_color="#000",
    border_color="#000",
    command=button_event2
)



# --- Layout ---
label.pack(pady=(40, 0))
textbox.pack(padx=10, pady=17, side="bottom", expand=True, fill='both')
button.pack(pady=(15, 0),side="top",expand=False)
button_run_back.pack(pady=(15, 0),side="top",expand=False)

# --- Main loop ---
if __name__ == "__main__":
    root.mainloop()
