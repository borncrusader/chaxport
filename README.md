# Chaxport

A Chrome extension that cleans your Claude.ai conversation responses and exports them to PDF or JSON via the browser.

## Features

- **Clean Export View**: Toggle between the original Claude.ai interface and a clean, print-friendly view
- **PDF Export**: Use your browser's print function to save conversations as PDF
- **JSON Export**: Export conversations as JSON for programmatic use and archival
- **Keyboard Navigation**: Press `Esc` to quickly return to the original Claude.ai view
- **Conversation Formatting**: Clean formatting with distinct styling for human and Claude messages

## Installation

### For Users

1. Clone or download this repository
2. Install [Bun](https://bun.sh/) if you haven't already
3. Build the extension:
   ```bash
   bun install
   bun run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the `dist/` directory
7. The Chaxport icon should appear in your Chrome toolbar

### For Developers

See the [Development](#development) section below for detailed instructions.

## Usage

1. Navigate to any Claude.ai conversation
2. Click the Chaxport extension icon in your toolbar to toggle the clean export view
3. In export view, use your browser's print function (Ctrl/Cmd + P) to save as PDF
4. Press `Esc` or click the extension icon again to return to the original view

## How it Works

[Watch the video](https://github.com/user-attachments/assets/d95f01ee-68b5-4810-8402-9fa9631979c5)

The extension works by:

1. **Content Script Injection**: Runs on Claude.ai pages to access and manipulate the DOM
2. **Message Extraction**: Identifies and extracts human and Claude messages from the conversation
3. **DOM Replacement**: Temporarily replaces the page content with a clean, formatted version
4. **Keyboard Handling**: Listens for Esc key presses to quickly revert to the original view
5. **Print Optimization**: Applies CSS styling optimized for PDF export via browser print function

## Permissions

- `activeTab`: Required to interact with the current Claude.ai tab
- `host_permissions`: Limited to `https://claude.ai/*` for security

## Development

This extension is written in TypeScript and built using Bun.

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0

### Project Structure

```
chaxport/
├── src/
│   ├── types/           # TypeScript type definitions
│   │   ├── content.types.ts
│   │   ├── messages.types.ts
│   │   └── chrome.types.ts
│   ├── utils/           # Shared utilities
│   │   └── htmlToMarkdown.ts
│   ├── background.ts    # Service worker
│   ├── popup.ts         # Popup UI logic
│   ├── popup.html       # Popup HTML
│   └── content.ts       # Content script
├── public/
│   ├── icons/           # Extension icons
│   │   ├── favicon.svg
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── manifest.json    # Extension manifest
├── dist/                # Built extension (load this in Chrome)
├── package.json
└── tsconfig.json
```

### Setup

```bash
# Install dependencies
bun install

# Build extension
bun run build

# Type checking only (no build)
bun run type-check

# Clean build directory
bun run clean
```

### Building

The extension uses Bun's native bundler for fast, efficient builds:

- `bun run build` - Production build (minified)
- `bun run dev` - Development build (same as build)
- `bun run clean` - Remove dist/ folder
- `bun run type-check` - Run TypeScript type checker

After building, load the `dist/` folder as an unpacked extension in Chrome.

### TypeScript Features

- **Strict mode enabled** - Full type safety with strict null checks
- **Chrome API types** - Fully typed Chrome Extension APIs via `@types/chrome`
- **Type-safe messaging** - Discriminated unions for popup ↔ content script messages
- **DOM type safety** - Proper typing for DOM manipulation and event handlers

### Making Changes

1. Edit TypeScript files in `src/`
2. Run `bun run type-check` to verify types
3. Run `bun run build` to compile
4. Reload the extension in Chrome (`chrome://extensions/` → click reload icon)
5. Test your changes

## Version History

- **v4.0**: Complete TypeScript rewrite with strict type safety
  - Converted all JavaScript files to TypeScript
  - Added comprehensive type definitions for Chrome APIs and domain models
  - Implemented type-safe message passing between popup and content scripts
  - Introduced Bun build system for fast, optimized builds
  - Reorganized project structure (src/, public/, dist/)
  - Zero breaking changes - all functionality preserved
- **v3.0**: Added JSON export support
- **v2.0**: Added Esc key functionality to revert to original DOM
- **v1.0**: Initial release with export view toggle
