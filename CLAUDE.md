# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chaxport is a Chrome Extension (Manifest V3) that exports Claude.ai conversations to PDF or JSON. It's a TypeScript codebase built with Bun, using strict type checking and the native Bun bundler.

## Build Commands

```bash
# Install dependencies
bun install

# Build for production (minified)
bun run build

# Type check without building
bun run type-check

# Clean build directory
bun run clean

# Generate icons from SVG
bun run icons
```

## Development Workflow

1. Edit TypeScript files in `src/`
2. Run `bun run type-check` before committing
3. Run `bun run build` to compile to `dist/`
4. Load `dist/` folder in Chrome at `chrome://extensions/` (Developer mode → Load unpacked)
5. Click reload icon in Chrome extensions to test changes

## Architecture

### Chrome Extension Components

**Three-part architecture:**

1. **Background Service Worker** (`src/background.ts`) - Minimal, only logs on load
2. **Popup UI** (`src/popup.ts` + `src/popup.html`) - Controls the extension, initiates actions
3. **Content Script** (`src/content.ts`) - Runs on claude.ai pages, manipulates DOM

### Message Passing System

The extension uses **type-safe message passing** between popup and content script:

- **Message types** defined in `src/types/messages.types.ts` as discriminated unions
- Popup sends: `toggleExportView`, `toggleJsonView`, `getState`
- Content script responds with: `SuccessResponse` or `GetStateResponse`
- If content script not loaded, popup injects it via `chrome.scripting.executeScript`

**Pattern:**
```typescript
// All messages use discriminated union by 'action' field
type ContentScriptMessage =
  | { action: 'toggleExportView' }
  | { action: 'toggleJsonView' }
  | { action: 'getState' }
```

### DOM Manipulation Flow

**Export View:**
1. Content script stores `document.body.innerHTML` in state
2. Calls `getContent()` to extract conversation from Claude.ai DOM
3. Replaces body with clean HTML template for printing
4. Adds Esc key listener to revert

**JSON View:**
1. Similar flow but renders JSON with editable metadata inputs
2. Users can customize participant names, blurb, tags
3. Download button triggers JSON file download

**Key selectors:**
- Messages: `[data-testid="user-message"]`, `.font-claude-response`
- Title: `header div.truncate`

### Type System

**Strict TypeScript configuration** (`tsconfig.json`):
- `strict: true` - All strict checks enabled
- `noUnusedLocals`, `noUnusedParameters` - Enforced
- `target: ES2022` - Modern JavaScript for Chrome

**Key type files:**
- `src/types/content.types.ts` - Domain models (ConversationContent, MessageData)
- `src/types/messages.types.ts` - Message passing types
- `src/types/chrome.types.ts` - Chrome API helpers and type guards

**Type patterns:**
- Use `??` (nullish coalescing) instead of `||`
- Optional chaining: `element?.textContent?.trim()`
- Type assertions: `document.getElementById('id') as HTMLInputElement | null`
- Prefix unused params with `_` (e.g., `_sender`)

### HTML to Markdown Conversion

`src/utils/htmlToMarkdown.ts` converts Claude's HTML responses to Markdown:
- Recursive DOM traversal with `processNode()`
- Handles: headings, lists, code blocks, links, images, blockquotes
- Used for both export views and JSON export

## File Organization

```
src/          Source TypeScript files and popup.html
public/       Static assets (manifest.json, icons/)
dist/         Build output - load this in Chrome
```

**Do not edit:**
- Files in `dist/` - regenerated on each build
- `bun.lockb` - managed by Bun

## Build System

Uses **Bun's native bundler** (not webpack/rollup):
- Three separate entry points: background.ts, popup.ts, content.ts
- `--target=browser` for Chrome extension environment
- `--minify` for production builds
- Assets copied from `src/` and `public/` to `dist/`

The build is **fast** (<10ms per file) due to Bun's performance.

## Chrome Extension Specifics

**Manifest V3 requirements:**
- Service worker instead of background page
- `chrome.scripting.executeScript` for dynamic injection
- Host permissions limited to `https://claude.ai/*`

**Common issue:** Content script may not be ready when popup opens. Solution: popup catches injection failure and retries after injecting script.

## State Management

Content script uses single state object:
```typescript
const state: ContentScriptState = {
  originalBodyContent: string | null,  // Stored DOM for revert
  isExportView: boolean,               // Currently in export view?
  isJsonView: boolean,                 // Currently in JSON view?
  escKeyHandler: function | null       // Keyboard event handler
}
```

Views are **mutually exclusive** - only one can be active at a time.

## Icon Generation

Icons generated from `public/icons/favicon.svg` using ImageMagick:
```bash
make icongen  # or bun run icons
```

Generates: icon-16.png, icon-32.png, icon-48.png, icon-128.png in `public/icons/`

## Version Updates

When bumping version, update **both**:
1. `package.json` - version field (e.g., "4.0.0")
2. `public/manifest.json` - version field (e.g., "4.0")

Then rebuild to copy updated manifest to `dist/`.
