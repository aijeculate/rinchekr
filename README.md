<div align="center">
  <img src="build/icon.png" alt="RinChekr Logo" width="128" height="128" />
  
  # RinChekr
  
  **The Premium Update Tracker for CS.RIN.RU**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://github.com/)

  [Features](#features) • [Installation](#installation) • [Usage](#usage) • [Advanced](#advanced)
</div>

---

**RinChekr** is a modern, beautiful Electron application designed to help you track game updates from the CS.RIN.RU forum. It automatically checks for new posts, fetches rich metadata (covers, descriptions), and lets you launch your games directly.

## ✨ Features

-   **Automatic Update Checking**: Scrapes the forum topic for the latest posts and intelligently scores them to find updates.
-   **Rich Metadata**: Automatically fetches high-quality game covers, descriptions, and genres using **Steam** and **IGDB**.
-   **Premium UI**: A sleek, dark-themed interface with glassmorphism effects, smooth animations, and responsive layout.
-   **Notification System**: Get instant alerts (Toasts) when a new update is found.
-   **Interactive Login**: secure, browser-based login to CS.RIN.RU (no manual cookie copying required).
-   **Smart Search**: Just paste the forum link, and RinChekr handles the rest.
-   **Portable**: Available as a standalone portable exe or a full installer.

<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=App+Screenshot+Here" alt="Screenshot" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</div>

## 🚀 Installation

1.  Go to the [Releases](tags) page.
2.  Download the latest installer (`Setup.exe`) or the Portable version.
3.  Run the application.

## 📖 Usage

### First Run
1.  Click the **Settings** (Gear) icon.
2.  Under **Forum Access**, click **Login via Browser**.
3.  Log in to CS.RIN.RU in the window that appears. It will close automatically upon success.

### Adding a Game
1.  Click the **+** button.
2.  Enter the name of the game.
3.  Paste the link to the game's topic on the forum.
4.  Click **Add**. RinChekr will fetch the rest!

## 🔧 Advanced

### Non-Steam Games (IGDB)
To get covers for games not on Steam (e.g. *Hytale*), you can enable IGDB integration:
1.  Get a free **Client ID** & **Secret** from [Twitch Developers](https://dev.twitch.tv/console).
2.  Enter them in **Settings -> Metadata Sources**.

See [TUTORIAL.md](./TUTORIAL.md) for a complete step-by-step guide.

## 📦 Building from Source

```bash
# Clone
git clone https://github.com/yourusername/cs-rin-updates.git

# Install dependencies
npm install

# Run dev server
npm run dev

# Build production
npm run build
```

## 📄 License
MIT © 2026
