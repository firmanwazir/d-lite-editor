/**
 * D-Lite Editor - Production Release Builder
 * Bundles and minifies JavaScript and CSS into standalone production files.
 * Zero external dependencies required - pure Node.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const RELEASE_DIR = path.join(ROOT_DIR, 'release');

const BANNER = `/*!
 * D-Lite Editor v1.0.0 (Production Release)
 * https://github.com/your-repo/d-lite-editor
 * (c) 2026 D-Lite Editor. Released under MIT License.
 * Modern, Lightweight & Extensible WYSIWYG Rich Text Editor Plugin
 */
`;

// 1. Ensure release directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

console.log('📦 Starting D-Lite Editor Build Process...\n');

// 2. JavaScript Modules in Strict Dependency Order
const JS_MODULES = [
  'src/ui/Icons.js',
  'src/core/Sanitizer.js',
  'src/core/Selection.js',
  'src/core/History.js',
  'src/ui/Toast.js',
  'src/ui/Modal.js',
  'src/plugins/Formatting.js',
  'src/plugins/Uploader.js',
  'src/plugins/ImagePlugin.js',
  'src/plugins/FilePlugin.js',
  'src/plugins/LinkPlugin.js',
  'src/plugins/TablePlugin.js',
  'src/plugins/CodePlugin.js',
  'src/plugins/MediaEmbedPlugin.js',
  'src/plugins/SpecialCharPlugin.js',
  'src/plugins/FindReplacePlugin.js',
  'src/ui/StatusBar.js',
  'src/ui/BubbleMenu.js',
  'src/ui/Toolbar.js',
  'src/core/Editor.js'
];

/**
 * Clean ES Module syntax (imports and exports) for bundled scope
 */
function cleanModule(code) {
  // Remove import statements
  code = code.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  
  // Replace `export class Foo` -> `class Foo`
  code = code.replace(/export\s+class\s+(\w+)/g, 'class $1');
  
  // Replace `export const Foo` -> `const Foo`
  code = code.replace(/export\s+const\s+(\w+)/g, 'const $1');

  // Replace `export function Foo` -> `function Foo`
  code = code.replace(/export\s+function\s+(\w+)/g, 'function $1');

  // Replace `export let/var Foo` -> `let/var Foo`
  code = code.replace(/export\s+(let|var)\s+(\w+)/g, '$1 $2');

  // Remove `export default ...;` and `export { ... };`
  code = code.replace(/export\s+default\s+[\w$]+;?/g, '');
  code = code.replace(/export\s*\{[^}]*\};?/g, '');

  return code.trim();
}

// 3. Assemble Core JavaScript Body
const moduleContents = JS_MODULES.map(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File tidak ditemukan: ${relPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return `// --- Module: ${relPath} ---\n` + cleanModule(raw);
}).join('\n\n');

// 4. Wrap into Universal Module Definition (UMD / Global)
const umdBundle = `${BANNER}(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, (function () {
    var exports = factory();
    global.DLiteEditor = exports.DLiteEditor;
    global.DLiteToast = exports.DLiteToast;
    global.DLiteModal = exports.DLiteModal;
    global.dliteToast = exports.toast;
    global.dliteModal = exports.modal;
    global.Sanitizer = exports.Sanitizer;
    global.Icons = exports.Icons;
  })());
})(this, function () {
  'use strict';

${moduleContents}

  return {
    DLiteEditor: DLiteEditor,
    DLiteToast: DLiteToast,
    DLiteModal: DLiteModal,
    toast: toast,
    modal: modal,
    Sanitizer: Sanitizer,
    Icons: Icons,
    default: DLiteEditor
  };
});
`;

// 5. Wrap into ES Module (ESM)
const esmBundle = `${BANNER}${moduleContents}

// Attach to window if in browser environment
if (typeof window !== 'undefined') {
  window.DLiteEditor = DLiteEditor;
  window.DLiteToast = DLiteToast;
  window.DLiteModal = DLiteModal;
  window.dliteToast = toast;
  window.dliteModal = modal;
  window.Sanitizer = Sanitizer;
  window.Icons = Icons;
}

export { DLiteEditor, DLiteToast, DLiteModal, toast, modal, Sanitizer, Icons };
export default DLiteEditor;
`;

/**
 * Robust JavaScript Minifier
 * Strips comments, collapses whitespace, preserves string literals, template strings (with nested expressions), and regexes.
 */
function minifyJS(source) {
  let output = '';
  let i = 0;
  const len = source.length;
  const stack = [];

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    // Inside template literal text part
    if (stack.length > 0 && stack[stack.length - 1] === 'TEMPLATE') {
      if (ch === '\\') {
        output += ch + (source[i + 1] || '');
        i += 2;
        continue;
      }
      if (ch === '$' && next === '{') {
        output += '${';
        i += 2;
        stack.push('EXPR');
        continue;
      }
      if (ch === '`') {
        output += '`';
        stack.pop();
        i++;
        continue;
      }
      output += ch;
      i++;
      continue;
    }

    // Inside template expression ${ ... }
    if (stack.length > 0 && (stack[stack.length - 1] === 'EXPR' || stack[stack.length - 1] === 'BRACE')) {
      if (ch === '{') {
        stack.push('BRACE');
        output += '{';
        i++;
        continue;
      }
      if (ch === '}') {
        stack.pop();
        output += '}';
        i++;
        continue;
      }
    }

    // Strings: single or double quotes
    if (ch === '"' || ch === "'") {
      const quote = ch;
      output += quote;
      i++;
      while (i < len) {
        const c = source[i];
        output += c;
        if (c === '\\') {
          i++;
          if (i < len) output += source[i];
        } else if (c === quote) {
          break;
        }
        i++;
      }
      i++;
      continue;
    }

    // Start of template literal
    if (ch === '`') {
      output += '`';
      stack.push('TEMPLATE');
      i++;
      continue;
    }

    // Single-line comment: // ...
    if (ch === '/' && next === '/') {
      while (i < len && source[i] !== '\n' && source[i] !== '\r') {
        i++;
      }
      // Emit a newline to safely terminate the statement
      if (!output.endsWith('\n')) {
        output += '\n';
      }
      continue;
    }

    // Multi-line comment: /* ... */
    if (ch === '/' && next === '*') {
      const isBanner = source[i + 2] === '!';
      const start = i;
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        i++;
      }
      i += 2; // skip */
      if (isBanner) {
        output += source.substring(start, i) + '\n';
      } else {
        // Safe token separation
        let prev = output.slice(-1);
        if (/[a-zA-Z0-9_$]/.test(prev)) {
          output += ' ';
        }
      }
      continue;
    }

    // Regex literal
    if (ch === '/') {
      let prevIdx = output.length - 1;
      while (prevIdx >= 0 && /\s/.test(output[prevIdx])) prevIdx--;
      const prevChar = prevIdx >= 0 ? output[prevIdx] : '';
      const isKeyword = output.endsWith('return') || output.endsWith('case') || 
                        output.endsWith('throw') || output.endsWith('typeof') ||
                        output.endsWith('delete') || output.endsWith('void') ||
                        output.endsWith('yield') || output.endsWith('await');

      if (/[(,=:[!&|?{};~+\-*%<>]/.test(prevChar) || isKeyword || prevIdx < 0) {
        output += '/';
        i++;
        while (i < len) {
          const c = source[i];
          output += c;
          if (c === '\\') {
            i++;
            if (i < len) output += source[i];
          } else if (c === '[') {
            while (i + 1 < len && source[i + 1] !== ']') {
              i++;
              if (source[i] === '\\') {
                output += source[i];
                i++;
              }
              output += source[i];
            }
            if (i + 1 < len) {
              i++;
              output += source[i];
            }
          } else if (c === '/') {
            break;
          }
          i++;
        }
        i++;
        while (i < len && /[a-z]/i.test(source[i])) {
          output += source[i];
          i++;
        }
        continue;
      }
    }

    // Whitespace outside strings/templates/regex
    if (/\s/.test(ch)) {
      let hasNewline = false;
      while (i < len && /\s/.test(source[i])) {
        if (source[i] === '\n') hasNewline = true;
        i++;
      }
      const nextChar = source[i] || '';
      let prev = output.slice(-1);

      if (hasNewline) {
        // Only emit newline if needed (prevents breaking ASI without ballooning size)
        if (prev && !/[\n;{([:,=+\-*%<>?|&!]/.test(prev) && !/[\n;})\]:,=+\-*%<>?|&!]/.test(nextChar)) {
          output += '\n';
        } else if (/[a-zA-Z0-9_$]/.test(prev) && /[a-zA-Z0-9_$]/.test(nextChar)) {
          output += ' ';
        }
      } else {
        // Spaces/tabs: only emit if separating identifier/keyword tokens
        if (/[a-zA-Z0-9_$]/.test(prev) && /[a-zA-Z0-9_$]/.test(nextChar)) {
          output += ' ';
        } else if ((prev === '+' && nextChar === '+') || (prev === '-' && nextChar === '-')) {
          output += ' ';
        }
      }
      continue;
    }

    output += ch;
    i++;
  }

  return output.trim();
}

/**
 * CSS Bundler & Minifier
 */
function buildCSS() {
  const CSS_FILES = [
    'src/styles/variables.css',
    'src/styles/editor.css',
    'src/styles/toolbar.css',
    'src/styles/bubble.css',
    'src/styles/modal.css',
    'src/styles/toast.css',
    'src/styles/media.css'
  ];

  let fontImports = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');\n\n";
  let combined = fontImports;

  CSS_FILES.forEach(relPath => {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      const css = fs.readFileSync(fullPath, 'utf8');
      combined += `/* --- ${relPath} --- */\n` + css + '\n\n';
    }
  });

  // Minify CSS
  let minified = fontImports;
  let bodyCSS = combined.replace(fontImports, '');
  // Strip comments
  bodyCSS = bodyCSS.replace(/\/\*[\s\S]*?\*\//g, '');
  // Collapse whitespace
  bodyCSS = bodyCSS.replace(/\s+/g, ' ');
  bodyCSS = bodyCSS.replace(/\s*([{:;,>+~])\s*/g, '$1');
  bodyCSS = bodyCSS.replace(/;}/g, '}');
  bodyCSS = bodyCSS.trim();

  minified = BANNER + fontImports + bodyCSS;

  return {
    raw: BANNER + combined,
    min: minified
  };
}

// Write JS files
console.log('⚡ Generating JavaScript release bundles...');
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.js'), umdBundle, 'utf8');
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.esm.js'), esmBundle, 'utf8');

const minifiedJS = BANNER + minifyJS(umdBundle);
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.min.js'), minifiedJS, 'utf8');

const minifiedESM = BANNER + minifyJS(esmBundle);
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.esm.min.js'), minifiedESM, 'utf8');

// Write CSS files
console.log('🎨 Generating CSS release stylesheets...');
const { raw: rawCSS, min: minCSS } = buildCSS();
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.css'), rawCSS, 'utf8');
fs.writeFileSync(path.join(RELEASE_DIR, 'dlite-editor.min.css'), minCSS, 'utf8');

// Copy PHP Upload Handler
console.log('🛡️ Copying production upload.php to release...');
const uploadSrc = path.join(ROOT_DIR, 'upload.php');
if (fs.existsSync(uploadSrc)) {
  fs.copyFileSync(uploadSrc, path.join(RELEASE_DIR, 'upload.php'));
}

// Generate Release Demo index.html
console.log('📄 Generating plug-and-play release/index.html demo...');
const releaseDemoHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>D-Lite Editor — Versi Rilis Produksi (Production Release)</title>
  <meta name="description" content="Contoh implementasi D-Lite Editor versi rilis minified siap pakai untuk produksi.">
  
  <!-- D-Lite Editor Minified CSS -->
  <link rel="stylesheet" href="dlite-editor.min.css">

  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 30px 16px;
      margin: 0;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }
    .header p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .actions {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 150ms ease;
    }
    .btn-primary {
      background-color: #3b82f6;
      color: #fff;
    }
    .btn-primary:hover {
      background-color: #2563eb;
    }
    .btn-secondary {
      background-color: #e2e8f0;
      color: #334155;
    }
    .btn-secondary:hover {
      background-color: #cbd5e1;
    }
    .output-box {
      margin-top: 24px;
      background: #0f172a;
      color: #38bdf8;
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <span class="badge">Production Release v1.0.0 (Minified)</span>
      <h1>D-Lite Editor — Demo Rilis Siap Pakai</h1>
      <p>Hanya membutuhkan 1 file JS (<code>dlite-editor.min.js</code>) dan 1 file CSS (<code>dlite-editor.min.css</code>), tanpa dependency eksternal.</p>
    </div>

    <!-- Target Form / Textarea -->
    <textarea id="my-editor" name="article_content">
      <h2>Selamat Datang di Versi Rilis D-Lite Editor! 🚀</h2>
      <p>Ini adalah paket rilis siap pakai (minified) yang sangat ringan, cepat, dan aman.</p>
      <blockquote>D-Lite Editor dirancang sebagai pengganti TinyMCE dan CKEditor dengan zero-dependency dan native UI modern.</blockquote>
      <div class="dlite-task-item">
        <input type="checkbox" class="dlite-task-checkbox" checked />
        <span class="dlite-task-text">Bundle Minified CSS & JS siap produksi</span>
      </div>
      <div class="dlite-task-item">
        <input type="checkbox" class="dlite-task-checkbox" checked />
        <span class="dlite-task-text">Upload direct image & file card interaktif</span>
      </div>
      <div class="dlite-task-item">
        <input type="checkbox" class="dlite-task-checkbox" checked />
        <span class="dlite-task-text">Keamanan XSS & integrasi backend upload.php</span>
      </div>
    </textarea>

    <div class="actions">
      <button type="button" class="btn btn-primary" id="btn-get-content">Dapatkan Konten HTML (getContent)</button>
      <button type="button" class="btn btn-secondary" id="btn-toggle-theme">Ganti Tema</button>
    </div>

    <pre class="output-box" id="output-box"></pre>
  </div>

  <!-- D-Lite Editor Minified JS (UMD / Standalone) -->
  <script src="dlite-editor.min.js"></script>

  <script>
    // Inisialisasi Editor
    const editor = new DLiteEditor({
      selector: '#my-editor',
      height: '480px',
      placeholder: 'Tuliskan isi artikel Anda di sini...',
      upload: {
        endpoint: 'upload.php',
        fieldName: 'file',
        maxFileSize: 15 * 1024 * 1024
      }
    });

    // Dapatkan konten HTML yang telah tersanitasi
    document.getElementById('btn-get-content').addEventListener('click', () => {
      const html = editor.getContent();
      const box = document.getElementById('output-box');
      box.style.display = 'block';
      box.textContent = html;
      box.scrollIntoView({ behavior: 'smooth' });
    });

    // Ganti Tema
    document.getElementById('btn-toggle-theme').addEventListener('click', () => {
      editor.toggleTheme();
    });
  </script>

</body>
</html>
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'index.html'), releaseDemoHtml, 'utf8');

// Generate Release README.md
console.log('📝 Generating release/README.md documentation...');
const releaseReadme = `# D-Lite Editor — Production Release Package

Production-ready distribution bundle for **D-Lite Editor**, a lightweight, zero-dependency WYSIWYG rich text editor built with vanilla JavaScript and CSS.

## Distribution Files

| File | Type | Description |
| :--- | :--- | :--- |
| \`dlite-editor.min.js\` | **Minified (UMD)** | Standalone browser bundle. Exposes \`window.DLiteEditor\`. |
| \`dlite-editor.js\` | Unminified (UMD) | Full source bundle with comments for debugging. |
| \`dlite-editor.esm.min.js\`| **Minified (ESM)** | ES Module format for modern bundlers (\`import DLiteEditor from '...'\`). |
| \`dlite-editor.esm.js\` | Unminified (ESM) | Full ES Module source bundle. |
| \`dlite-editor.min.css\` | **Minified CSS** | Unified stylesheet containing all UI and canvas styles. |
| \`dlite-editor.css\` | Unminified CSS | Complete stylesheet for development reference. |
| \`upload.php\` | Backend | Production PHP upload handler with MIME validation and \`.htaccess\` protection. |
| \`index.html\` | Demo | Standalone integration demonstration page. |

---

## Quick Start

### 1. Browser Script Tag

\`\`\`html
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
\`\`\`

---

## ES Module Usage

\`\`\`javascript
import { DLiteEditor, toast, modal } from './dlite-editor.esm.min.js';

const editor = new DLiteEditor({
  selector: '#editor-id',
  height: '500px'
});
\`\`\`

---

## Key API Methods

| Method | Description |
| :--- | :--- |
| \`editor.getContent()\` | Returns clean, sanitized HTML content. |
| \`editor.setContent(html)\` | Sets canvas content and sanitizes input. |
| \`editor.getText()\` | Returns plain text content without HTML tags. |
| \`editor.clear()\` | Clears the canvas with user confirmation modal. |
| \`editor.toggleTheme()\` | Toggles between Light and Dark themes. |
| \`editor.toggleFullscreen()\` | Toggles fullscreen (zen) mode. |
| \`editor.preview()\` | Opens the responsive device preview modal. |
| \`editor.openHelpModal()\` | Opens the keyboard shortcut reference modal. |
| \`editor.destroy()\` | Destroys the instance and cleans up event listeners. |

---

## License

Distributed under the **MIT License**. Free for commercial and personal use.
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'README.md'), releaseReadme, 'utf8');

// Print Statistics
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('\n📊 Ringkasan Ukuran Berkas Rilis:');
['dlite-editor.js', 'dlite-editor.min.js', 'dlite-editor.esm.min.js', 'dlite-editor.css', 'dlite-editor.min.css'].forEach(file => {
  const stat = fs.statSync(path.join(RELEASE_DIR, file));
  console.log(`   - ${file.padEnd(25)} : ${formatBytes(stat.size)}`);
});

console.log('\n✅ Versi rilis produksi berhasil dibuat di folder: release/\n');
