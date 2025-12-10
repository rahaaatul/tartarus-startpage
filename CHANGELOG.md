## [Unreleased] - 2025-12-10

### Added
- Node.js proxy server (`proxy-server.js`) for seamless API integration
  - Enables weather API calls without CORS issues
  - Google search suggestions functionality
  - Express.js backend with CORS support
- Iconify multi-source icon system
  - Access to 100,000+ icons from 100+ collections
  - On-demand loading from CDN with local fallback options
  - Backward compatible with existing Tabler icons
- Development tools
  - `start-dev.bat` script for starting frontend and backend servers
  - `package-lock.json` for reproducible builds
- New search engines in config
  - ChatGPT (`c` key)
  - Duck AI (`da` key)
  - Perplexity (`p` key, updated from Pinterest)

### Changed
- Location in temperature config: Updated from "Matão, São Paulo" to "Dhaka, Bangladesh"
- Search engine URLs: Now use `%s` placeholder for query insertion
- Icon system: Migrated from local Tabler CSS fonts to Iconify web component
  - Removed local icon font loading code
  - Icons now load dynamically from CDN
- Userconfig: Explicit icon_source specifications for existing icons

### Fixed
- N/A (first patch on this fork)

### Removed
- N/A

### Security
- Added `/node_modules` to `.gitignore` for better repository hygiene

---

**Installation:** See README.md for updated setup instructions including Node.js setup and proxy server requirements.

**Breaking Changes:** Iconify migration may require `:icon_source: "tabler"` for custom icons if source conflicts occur.
