# Chaxport

A Chrome extension that cleans your Claude.ai conversation responses and exports them to PDF via the browser.

## Features

- **Clean Export View**: Toggle between the original Claude.ai interface and a clean, print-friendly view
- **PDF Export**: Use your browser's print function to save conversations as PDF
- **Keyboard Navigation**: Press `Esc` to quickly return to the original Claude.ai view
- **Conversation Formatting**: Clean formatting with distinct styling for human and Claude messages

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The Chaxport icon should appear in your Chrome toolbar

## Usage

1. Navigate to any Claude.ai conversation
2. Click the Chaxport extension icon in your toolbar to toggle the clean export view
3. In export view, use your browser's print function (Ctrl/Cmd + P) to save as PDF
4. Press `Esc` or click the extension icon again to return to the original view

## How it Works

<video width="600" controls>
  <source src="video.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

The extension works by:

1. **Content Script Injection**: Runs on Claude.ai pages to access and manipulate the DOM
2. **Message Extraction**: Identifies and extracts human and Claude messages from the conversation
3. **DOM Replacement**: Temporarily replaces the page content with a clean, formatted version
4. **Keyboard Handling**: Listens for Esc key presses to quickly revert to the original view
5. **Print Optimization**: Applies CSS styling optimized for PDF export via browser print function

## Permissions

- `activeTab`: Required to interact with the current Claude.ai tab
- `host_permissions`: Limited to `https://claude.ai/*` for security

## Version History

- **v2.0**: Added Esc key functionality to revert to original DOM
- **v1.0**: Initial release with export view toggle