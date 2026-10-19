import { Sanitizer } from '../core/Sanitizer.js';
import { toast } from '../ui/Toast.js';

/**
 * Code Plugin for D-Lite Editor
 * Code blocks, blockquotes, and HTML Source View Toggle Mode
 */
export class CodePlugin {
  constructor(editor) {
    this.editor = editor;
    this.isSourceMode = false;
    this.sourceTextarea = null;
    this.init();
  }

  init() {
    this.sourceTextarea = document.createElement('textarea');
    this.sourceTextarea.className = 'dlite-source-textarea dlite-hidden';
    this.sourceTextarea.spellcheck = false;
    this.editor.container.querySelector('.dlite-body-wrapper').appendChild(this.sourceTextarea);

    this.sourceTextarea.addEventListener('input', () => {
      this.editor._onContentChanged();
    });
  }

  /**
   * Insert a formatted code block <pre><code>...</code></pre>
   */
  insertCodeBlock() {
    this.editor.selection.restore();
    const pre = document.createElement('pre');
    pre.className = 'dlite-code-block';
    const code = document.createElement('code');
    code.textContent = '// Tuliskan potongan kode di sini...';
    pre.appendChild(code);

    const p = document.createElement('p');
    p.innerHTML = '<br>';

    this.editor.selection.insertNode(pre);
    pre.after(p);

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  /**
   * Insert a modern blockquote
   */
  insertBlockquote() {
    this.editor.plugins.formatting.blockquote();
  }

  /**
   * Toggle between visual WYSIWYG mode and raw HTML Source Code mode
   */
  toggleSourceMode() {
    this.isSourceMode = !this.isSourceMode;

    if (this.isSourceMode) {
      // Switch to HTML source
      const currentHTML = this.editor.getHTML();
      const formatted = Sanitizer.formatHTML(currentHTML);
      this.sourceTextarea.value = formatted;

      this.editor.canvas.classList.add('dlite-hidden');
      this.sourceTextarea.classList.remove('dlite-hidden');
      this.editor.container.classList.add('dlite-source-active');

      toast.info('Mode Kode Sumber (HTML) aktif.');
    } else {
      // Switch back to Visual
      const html = this.sourceTextarea.value;
      const cleanHtml = Sanitizer.clean(html);
      this.editor.canvas.innerHTML = cleanHtml;

      this.sourceTextarea.classList.add('dlite-hidden');
      this.editor.canvas.classList.remove('dlite-hidden');
      this.editor.container.classList.remove('dlite-source-active');

      this.editor._onContentChanged();
      this.editor.history.record(true);
      toast.info('Mode Visual WYSIWYG aktif.');
    }

    this.editor.toolbar?.updateSourceButton(this.isSourceMode);
  }
}
