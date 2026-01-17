# Changelog

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
-   Fixed a crash when trying to launch non-executable file types (vbs/lnk).
-   Fixed broken layout in the Settings window.
-   Fixed "X" button visibility issues in Game Details and Settings.
-   Fixed window dragging issues interfering with modal interactions.

## [2.1] - 2026-01-16
-   Initial Premium Release.
-   Steam Store metadata scraping.
-   Dark/Light mode support.
-   Grid and List views.
