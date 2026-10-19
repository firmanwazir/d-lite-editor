# D-Lite Editor — Production Release Package

Production-ready distribution bundle for **D-Lite Editor**, a lightweight, zero-dependency WYSIWYG rich text editor built with vanilla JavaScript and CSS.

## Distribution Files

| File | Type | Description |
| :--- | :--- | :--- |
| `dlite-editor.min.js` | **Minified (UMD)** | Standalone browser bundle. Exposes `window.DLiteEditor`. |
| `dlite-editor.js` | Unminified (UMD) | Full source bundle with comments for debugging. |
| `dlite-editor.esm.min.js`| **Minified (ESM)** | ES Module format for modern bundlers (`import DLiteEditor from '...'`). |
| `dlite-editor.esm.js` | Unminified (ESM) | Full ES Module source bundle. |
| `dlite-editor.min.css` | **Minified CSS** | Unified stylesheet containing all UI and canvas styles. |
| `dlite-editor.css` | Unminified CSS | Complete stylesheet for development reference. |
| `upload.php` | Backend | Production PHP upload handler with MIME validation and `.htaccess` protection. |
| `index.html` | Demo | Standalone integration demonstration page. |

---

## Quick Start

### 1. Browser Script Tag

```html
<!-- 1. Stylesheet -->
<link rel="stylesheet" href="dlite-editor.min.css">

<!-- 2. Target Textarea -->
<textarea id="my-content" name="content">
  <p>Initial content...</p>
</textarea>

<!-- 3. Editor Script -->
<script src="dlite-editor.min.js"></script>

<!-- 4. Initialization -->
<script>
  const editor = new DLiteEditor({
    selector: '#my-content',
    height: '480px',
    placeholder: 'Write something...',
    upload: {
      endpoint: 'upload.php',
      fieldName: 'file',
      maxFileSize: 15 * 1024 * 1024 // 15MB
    }
  });
</script>
```

---

## ES Module Usage

```javascript
import { DLiteEditor, toast, modal } from './dlite-editor.esm.min.js';

const editor = new DLiteEditor({
  selector: '#editor-id',
  height: '500px'
});
```

---

## Key API Methods

| Method | Description |
| :--- | :--- |
| `editor.getContent()` | Returns clean, sanitized HTML content. |
| `editor.setContent(html)` | Sets canvas content and sanitizes input. |
| `editor.getText()` | Returns plain text content without HTML tags. |
| `editor.clear()` | Clears the canvas with user confirmation modal. |
| `editor.toggleTheme()` | Toggles between Light and Dark themes. |
| `editor.toggleFullscreen()` | Toggles fullscreen (zen) mode. |
| `editor.preview()` | Opens the responsive device preview modal. |
| `editor.openHelpModal()` | Opens the keyboard shortcut reference modal. |
| `editor.destroy()` | Destroys the instance and cleans up event listeners. |

---

## License

Distributed under the **MIT License**. Free for commercial and personal use.
