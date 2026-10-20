# D-Lite Editor

A lightweight, zero-dependency WYSIWYG rich text editor built with vanilla JavaScript and CSS. Designed as an efficient, modern replacement for heavyweight editors, D-Lite Editor provides a comprehensive editing toolbar, direct image and file uploads with progress tracking, built-in XSS sanitization, and a native modal/toast UI system without relying on third-party libraries.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Module: UMD & ESM](https://img.shields.io/badge/module-UMD%20%7C%20ESM-orange.svg)](#)

---

## Features

### Editing & Typography
- **Hierarchical Formatting**: Paragraphs and Headings (H1 through H6).
- **Font Controls**: Font family selector (Inter, Arial, Roboto, Georgia, Times New Roman, Courier New, Verdana, JetBrains Mono) and font sizes (11px to 36px).
- **Inline Styles**: Bold, Italic, Underline, Strikethrough, Subscript, Superscript, and Inline Code.
- **Color Tools**: Text color and background highlight picker with clear/transparent reset.
- **Alignment & Spacing**: Left, Center, Right, Justify, Indent, Outdent, and Line Height spacing controls (1.0 to 2.5).
- **Structure**: Blockquotes, Horizontal Rules, and Page Breaks.

### Lists & Tables
- **Lists**: Ordered lists, unordered lists, and interactive task checklists with automatic continuation on `Enter`.
- **Tables**: Visual grid picker (up to 8×6) and contextual bubble menu for inserting or removing rows and columns.

### Media & Attachments
- **Direct Image Upload**: Drag-and-drop from the desktop, clipboard paste (`Ctrl+V`), or file selection dialog.
- **Upload Progress**: In-place progress bar and shimmer placeholder at the cursor position during asynchronous upload.
- **Floating Image Controls**: Contextual toolbar for alignment (left, center, right, float), preset width resizing (25%, 50%, 75%, 100%), alt text configuration, and captions.
- **File Attachment Cards**: Non-image documents (PDF, DOCX, XLSX, ZIP) render as interactive download cards with file size indicators.
- **Media Embeds**: Responsive embeds for YouTube, Vimeo, direct MP4 videos, and sanitized iframe code.

### UI & Utility
- **Non-blocking Dialogs**: Custom modal dialogs and toast notifications. Completely avoids browser-native `alert()`, `confirm()`, or `prompt()` calls.
- **Find & Replace**: Modal tool supporting keyword search, case sensitivity matching, and batch replacement.
- **Preview Modal**: Multi-device viewport preview (Desktop, Tablet, Mobile) with direct print trigger.
- **Source Code Mode**: Toggle between WYSIWYG canvas and raw HTML editing.
- **Fullscreen Mode**: Zen distraction-free editing layout.
- **Real-time Status Bar**: Live word counter, character counter, and estimated reading time.
- **Theme Support**: Integrated Light and Dark mode with instant toggle.


---

## Distribution Files

Pre-built and minified production bundles are available in the `release/` directory:

| File | Type | Size | Description |
| :--- | :--- | :--- | :--- |
| `release/dlite-editor.min.js` | UMD (Minified) | ~128 KB | Standalone browser bundle. Exposes `window.DLiteEditor`. |
| `release/dlite-editor.esm.min.js` | ESM (Minified) | ~127 KB | ES Module format for modern bundlers (`import DLiteEditor from '...'`). |
| `release/dlite-editor.min.css` | CSS (Minified) | ~30 KB | Unified stylesheet including all UI and canvas styles. |
| `release/upload.php` | Backend Reference | ~19 KB | Hardened PHP upload endpoint with MIME verification and `.htaccess` protection. |
| `release/index.html` | Demo | ~4.7 KB | Standalone integration demonstration. |

Unminified versions (`dlite-editor.js`, `dlite-editor.esm.js`, and `dlite-editor.css`) are also included in `release/` for debugging purposes.

---

## Quick Start

### 1. Browser (Script Tag)

Include the minified stylesheet and JavaScript file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="release/dlite-editor.min.css">
</head>
<body>

  <textarea id="editor" name="content">
    <p>Initial content goes here...</p>
  </textarea>

  <script src="release/dlite-editor.min.js"></script>
  <script>
    const editor = new DLiteEditor({
      selector: '#editor',
      height: '450px',
      upload: {
        endpoint: 'upload.php',
        fieldName: 'file',
        maxFileSize: 15 * 1024 * 1024 // 15MB
      }
    });
  </script>
</body>
</html>
```

### 2. ES Module / Modern Bundler

```javascript
import { DLiteEditor } from './release/dlite-editor.esm.min.js';
import './release/dlite-editor.min.css';

const editor = new DLiteEditor({
  selector: '#editor',
  theme: 'dark'
});
```

---

## Configuration Options

Pass an options object to the `DLiteEditor` constructor:

```javascript
const editor = new DLiteEditor(options);
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `selector` | `string` | `null` | CSS selector for the target element (e.g., `#editor`, `textarea.content`). |
| `target` | `HTMLElement` | `null` | Direct DOM element reference. Takes precedence over `selector`. |
| `height` | `string` | `'480px'` | Minimum height of the editor container. |
| `placeholder` | `string` | `'Tuliskan...'` | Placeholder text displayed when the canvas is empty. |
| `theme` | `string` | `'light'` | Initial UI theme: `'light'` or `'dark'`. |
| `initialContent` | `string` | `''` | Initial HTML content. If empty and target is a `<textarea>`, its value is used. |
| `upload` | `object` | `{}` | File and image upload configuration (see table below). |
| `onChange` | `function` | `null` | Callback executed whenever content changes: `(html) => void`. |
| `onInit` | `function` | `null` | Callback executed once the editor finishes initialization: `(editor) => void`. |

### Upload Options (`options.upload`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `endpoint` | `string` | `'/api/upload'` | Target URL for HTTP POST upload requests. |
| `fieldName` | `string` | `'file'` | Form field name used in the `FormData` payload. |
| `headers` | `object` | `{}` | Custom HTTP headers sent with the upload request (e.g., `Authorization`). |
| `maxFileSize` | `number` | `10485760` (10MB) | Maximum permitted file size in bytes. |
| `allowedImageTypes` | `string[]` | `['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']` | Permitted image MIME types. |
| `allowedFileTypes` | `string[]` | `['application/pdf', 'application/zip', '.docx', '.xlsx', '.txt']` | Permitted document MIME types or extensions. |
| `customUploader` | `function` | `null` | Custom asynchronous upload handler: `async (file, onProgress) => { url, name, size, type }`. |

---

## API Reference

### Methods

| Method | Return Type | Description |
| :--- | :--- | :--- |
| `getContent()` | `string` | Returns the current canvas content as clean, sanitized HTML. |
| `setContent(html)` | `void` | Sanitizes and updates the editor content, resetting undo history. |
| `getHTML()` | `string` | Returns raw, unparsed HTML currently inside the canvas. |
| `getText()` | `string` | Returns plain text content without HTML tags. |
| `clear()` | `Promise<void>` | Prompts user confirmation via custom modal and empties the canvas. |
| `toggleTheme()` | `void` | Toggles between light and dark theme classes. |
| `toggleFullscreen()` | `void` | Toggles fullscreen (zen) mode. |
| `preview()` | `void` | Opens a modal displaying a multi-device preview (Desktop, Tablet, Mobile). |
| `openHelpModal()` | `void` | Opens the keyboard shortcut reference modal. |
| `on(event, handler)` | `void` | Subscribes to internal editor events (e.g., `'change'`). |
| `emit(event, data)` | `void` | Triggers an internal editor event. |
| `destroy()` | `void` | Removes all UI elements, unbinds event listeners, and restores target element. |

### Form Integration

When initialized on a `<textarea>` inside an HTML `<form>`, D-Lite Editor automatically:
1. Keeps the `<textarea>` hidden.
2. Synchronizes its value on content changes.
3. Performs a final synchronization before the form submits.

```html
<form action="/save" method="POST">
  <textarea id="article-content" name="content"></textarea>
  <button type="submit">Publish</button>
</form>

<script>
  const editor = new DLiteEditor({ selector: '#article-content' });
</script>
```

---

## Backend Upload Protocol

### Expected Response

The upload endpoint must accept an HTTP POST multipart request and return a JSON object in the following format:

**Success (`HTTP 200`):**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/uploads/2026/10/file-name.jpg",
    "name": "original-filename.jpg",
    "size": 245000,
    "type": "image"
  },
  "message": "File uploaded successfully."
}
```

**Failure:**
```json
{
  "success": false,
  "message": "File size exceeds the 15 MB limit."
}
```

### Reference Backend (`upload.php`)

A production-ready PHP handler is provided in [`release/upload.php`](file:///d:/WebServer/www/Plugins/D-Lite%20Editor/release/upload.php). Key security protections implemented:
- Server-side MIME verification using `finfo` (not solely relying on client-supplied headers).
- Extension allowlisting with double-extension inspection (prevents `.php.jpg` execution).
- Nonce and timestamp-based random filename generation to prevent directory traversal.
- Automatic creation of an upload directory `.htaccess` file disabling PHP execution (`php_flag engine off` and `Options -ExecCGI`).

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + B` / `Cmd + B` | Bold |
| `Ctrl + I` / `Cmd + I` | Italic |
| `Ctrl + U` / `Cmd + U` | Underline |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo |
| `Ctrl + K` / `Cmd + K` | Insert / Edit Link |
| `Ctrl + F` / `Cmd + F` | Find and Replace |
| `Ctrl + P` / `Cmd + P` | Print Document |
| `Ctrl + /` / `Cmd + /` | Keyboard Shortcuts & Help |
| `Tab` | Indent |
| `Shift + Tab` | Outdent |
| `Enter` | New Block (or new checklist item when inside a task list) |
| `Shift + Enter` | Soft Line Break (`<br>`) |

---

## Building from Source

The repository contains a build script that bundles and minifies JavaScript and CSS using standard Node.js runtime APIs. No npm install or third-party build tools are required.

To compile a new release:

```bash
node build.js
```

This generates:
- `release/dlite-editor.js` & `release/dlite-editor.min.js`
- `release/dlite-editor.esm.js` & `release/dlite-editor.esm.min.js`
- `release/dlite-editor.css` & `release/dlite-editor.min.css`
- `release/index.html` (interactive demo page)
- `release/upload.php`

---

## Browser Support

Compatible with all modern Evergreen browsers:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Apple Safari (latest)
- Microsoft Edge (latest)

---

## License

This project is licensed under the [MIT License](LICENSE).
