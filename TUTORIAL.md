# RinChekr - Complete User Guide

## 1. Getting Started

### Installation
1.  Download the latest release (Setup.exe or Portable).
2.  Run the installer or unzip the portable version.
3.  Launch **RinChekr**.

### First-Time Setup (Login)
To check for updates, the app needs to access the CS.RIN.RU forum.

1.  Click the **Settings (Gear)** icon in the top right.
2.  Scroll down to **Forum Access**.
3.  Click **"Login via Browser"**.
4.  A new window will open to the CS.RIN.RU login page.
5.  Log in with your username and password.
6.  Once you see the forum index page, the window will close automatically, and the status in Settings will turn **Green (Logged In)**.

---

## 2. Adding Games

1.  Click the **"+" (Plus)** button in the top right.
2.  **Name**: Enter the game name (e.g., "Cyberpunk 2077").
3.  **Forum URL**: Paste the link to the game's topic on CS.RIN.RU.
    *   *Example*: `https://cs.rin.ru/forum/viewtopic.php?f=10&t=...`
4.  **Click "Add Game"**.
5.  The app will automatically:
    *   Fetch the cover image from Steam (or IGDB).
    *   Check the forum for the latest version.

---

## 3. Configuring Metadata (IGDB)

For games not on Steam (like *Hytale* or *Starsector*), you can use IGDB to get covers and descriptions. This requires a free Twitch Developer account.

1.  Go to [Twitch Developers](https://dev.twitch.tv/console).
2.  Log in and click **"Register Your Application"**.
    *   **Name**: Any name (e.g., RinChekr).
    *   **Redirect URL**: `http://localhost`
    *   **Category**: Application Integration.
3.  Click **Create**, then **Manage**.
4.  Copy the **Client ID**.
5.  Click "New Secret" and copy the **Client Secret**.
6.  Open **RinChekr Settings**.
7.  Scroll to **Metadata Sources**.
8.  Paste your Client ID and Client Secret.
9.  Click **"Save & Test"**.

---

## 4. Managing Your Library

-   **Launch**: Click the **Play** button on a game card. (You must create a shortcut first).
-   **Edit**: Click the **Pencil** icon to rename a game or change its forum link.
-   **Remove**: Click the **Trash** icon to delete a game.
-   **Check Updates**: Click the **Refresh** icon in the header to check all games, or the refresh icon on an individual card.

## 5. Troubleshooting

-   **"Security Check" Error**: This means Cloudflare is blocking the connection. Try using the "Login via Browser" button again to refresh your session cookies.
-   **Wrong Cover Image**: Click the "Edit" button on the game card, ensure the name is correct, and try refreshing metadata.
