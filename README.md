![icon](docs/FileOrganizer.ico)


# 🧹 File Organizer (Python)

A simple and effective app that automatically organizes your Windows **Downloads** folder into categorized subfolders like `zip`, `image`, `video`, `pdf`, `sound`, `os`, and `random`.

---

## 🚀 Features

- Automatically creates folders for:
  - 📁 Zip files (`.zip`, `.rar`)
  - 🖼️ Images (`.jpg`, `.png`, `.gif`, etc.)
  - 🎞️ Videos (`.mp4`, `.mkv`, `.avi`, etc.)
  - 📄 PDFs (`.pdf`)
  - 🎧 Audio files (`.mp3`, `.wav`, `.ogg`, etc.)
  - 💿 OS images (`.iso`, `.img`)
  - 🧪 Random/unknown files
- Safe, simple, readable code

---

## 📉 Performance

- My Specs:
  - i7-8700 3.20GHz
  - 32G RAM
  - Nivida RTX 4060ti
    
- Script Performance:
  - RAM Usage => 32.1 MB
  - Disk Usage (Idle) => 0 MB/S
  - Disk Usage (Working) => it depends on the content but usually not above 0.90 MB/s
 
The data presented are based on my specific use case and may vary from your own experience

---

## 📂 How It Works

The script:
1. Scans your `Downloads` folder.
2. Identifies each file’s extension.
3. Moves the file to its corresponding category folder.
4. Creates folders if they don’t exist.

---

## ▶️ How to Run

1. Download the latest exe from [here](https://github.com/tr4is/windows-downloads-file-organizer/releases/) and run it!

---

## 🛠 Requirements

  - Windows OS

  - ~~Python 3.x~~   - no need for python to be installed yay!

---

## 🙋‍♂️ Author

  - TR4IS

  - GitHub: @tr4is

---

## ⚠️ Disclaimer
  This app organizes your files by moving them to new folders.  
  If other programs are using those files, they may appear to "disappear" because their paths have changed.  
  Make sure to update any shortcuts or software that relies on the original file locations.


---

## 📝 To-Do / Ideas

- ~~Build a simple GUI~~ ✔️  
- ~~Listening for events (toggle)~~ ✔️  
- Add config file support (custom categories) ⏳ (in progress)  
- ~~Minimize to system tray 🖥️~~ ✔️
- Add a redo fucntion (Restores changes)


