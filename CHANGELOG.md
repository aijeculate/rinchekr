# Changelog


## [3.18.3] - 2026-01-18 (Gold Release)

### Added
-   **Smart Update Logic**: Differentiates between "Latest Activity" (new posts) and verified "Updates" (releases/cracks).
-   **Text Snippets**: Game Details now shows a preview of the latest post content so you know what the update is about.
-   **Custom Icon**: Application now properly uses the custom `RinChekr.ico` for all windows and installers.
-   **Metadata**: Added full author and description metadata to the package.

### Fixed
-   **Persistence Bug**: Fixed a critical issue where the app would "forget" it had seen an update, causing it to notify you about the same update repeatedly.
-   **Scraper Logic**: Completely rewrote the scraping engine to use robust numeric ID detection (`p12345`) and fallback selectors, fixing the "Found 0 posts" error.
-   **URL Extraction**: Fixed an issue where the "View Post" button would link to the wrong page or generic URL.
-   **Infinite Spinner**: Fixed cases where the "Checking..." status would get stuck indefinitely.

## [3.17] - 2026-01-17

### Added
-   **IGDB Integration**: Added support for non-Steam games (e.g., *Hytale*, *Starsector*) via IGDB API. Configure keys in Settings.
-   **Interactive Login**: New "Login via Browser" button in Settings opens a secure window to capture your CS.RIN.RU session cookies automatically.
-   **Status Indicator**: Added a persistent Green "Logged In" indicator in Settings.
-   **Settings Persistence**: The app now remembers your IGDB credentials and Login status across restarts.
-   **Launch Support**: Added support for launching `.vbs`, `.lnk`, `.bat`, and `.url` files using the native OS shell.

### Changed
-   **UI Overhaul**: Completely redesigned the Settings modal for better usability.
-   **Auth Flow**: Removed manual Session ID input fields in favor of the more reliable browser-based login.
-   **Performance**: Improved metadata fetching reliability by bypassing Cloudflare checks with a real User-Agent.

### Fixed
-   **Critical**: Fixed blank screen issue in production builds by correcting Vite base path and build output directory.
-   Fixed a crash when trying to launch non-executable file types (vbs/lnk).
-   Fixed broken layout in the Settings window.
-   Fixed "X" button visibility issues in Game Details and Settings.
-   Fixed window dragging issues interfering with modal interactions.

## [2.1] - 2026-01-16
-   Initial Premium Release.
-   Steam Store metadata scraping.
-   Dark/Light mode support.
-   Grid and List views.
