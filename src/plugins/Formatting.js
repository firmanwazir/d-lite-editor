/**
 * Formatting Plugin for D-Lite Editor
 * Text styles, typography headings, alignments, lists, checklists, colors, fonts, and print
 */
export class Formatting {
  constructor(editor) {
    this.editor = editor;
  }

  exec(command, value = null) {
    this.editor.canvas.focus();
    document.execCommand(command, false, value);
    this.editor._onContentChanged();
    this.editor.history.record();
    this.editor.toolbar?.updateActiveStates();
  }

  bold() { this.exec('bold'); }
  italic() { this.exec('italic'); }
  underline() { this.exec('underline'); }
  strike() { this.exec('strikeThrough'); }
  subscript() { this.exec('subscript'); }
  superscript() { this.exec('superscript'); }

  clearFormat() {
    this.exec('removeFormat');
    this.removeBgColor();
    this.formatBlock('p');
  }

  formatBlock(tag) {
    this.editor.canvas.focus();
    document.execCommand('formatBlock', false, `<${tag}>`);
    this.editor._onContentChanged();
    this.editor.history.record();
  }

  blockquote() {
    this.editor.canvas.focus();
    const existing = this.editor.selection.getClosest('blockquote');
    if (existing) {
      const p = document.createElement('p');
      p.innerHTML = existing.innerHTML;
      existing.replaceWith(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      this.editor.selection.save();
      this.editor._onContentChanged();
      this.editor.history.record(true);
    } else {
      this.formatBlock('blockquote');
    }
    this.editor.toolbar?.updateActiveStates();
  }

  /**
   * Smart alignment for text, images, and file attachment cards
   */
  align(alignment) {
    // 1. Check if an image is currently selected
    if (this.editor.plugins.image && this.editor.plugins.image.selectedImage) {
      const figure = this.editor.plugins.image.selectedImage.closest('figure') || this.editor.plugins.image.selectedImage;
      figure.classList.remove('dlite-align-left', 'dlite-align-center', 'dlite-align-right');
      figure.classList.add(`dlite-align-${alignment}`);
      this.editor.plugins.image.positionBubble();
      this.editor._onContentChanged();
      this.editor.history.record(true);
      return;
    }

    // 2. Check if cursor is on/inside a file container or image figure
    const fileContainer = this.editor.selection.getClosest('.dlite-file-container');
    if (fileContainer) {
      fileContainer.classList.remove('dlite-align-left', 'dlite-align-center', 'dlite-align-right');
      fileContainer.classList.add(`dlite-align-${alignment}`);
      this.editor._onContentChanged();
      this.editor.history.record(true);
      return;
    }

    const figure = this.editor.selection.getClosest('.dlite-media-figure');
    if (figure) {
      figure.classList.remove('dlite-align-left', 'dlite-align-center', 'dlite-align-right');
      figure.classList.add(`dlite-align-${alignment}`);
      this.editor._onContentChanged();
      this.editor.history.record(true);
      return;
    }

    // 3. Fallback to native text justify command
    const cmdMap = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull'
    };
    if (cmdMap[alignment]) {
      this.exec(cmdMap[alignment]);
    }
  }

  bulletList() { this.exec('insertUnorderedList'); }
  numberedList() { this.exec('insertOrderedList'); }

  /**
   * Interactive Checklist / Tasklist
   * Inserts cleanly at current caret position without jumping to the top!
   */
  taskList() {
    const taskItem = document.createElement('div');
    taskItem.className = 'dlite-task-item';
    taskItem.innerHTML = `
      <input type="checkbox" class="dlite-task-checkbox" contenteditable="false" />
      <span class="dlite-task-text" contenteditable="true">Tugas baru...</span>
    `;

    // Insert block at exact caret position
    this.editor.selection.insertBlockNode(taskItem);

    // Focus inside task text
    const textSpan = taskItem.querySelector('.dlite-task-text');
    if (textSpan) {
      const range = document.createRange();
      range.selectNodeContents(textSpan);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      this.editor.selection.save();
    }

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  indent() { this.exec('indent'); }
  outdent() { this.exec('outdent'); }

  horizontalRule() {
    const hr = document.createElement('hr');
    hr.className = 'dlite-hr';
    this.editor.selection.insertBlockNode(hr);

    const p = document.createElement('p');
    p.innerHTML = '<br>';
    hr.after(p);

    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.editor.selection.save();

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  pageBreak() {
    this.editor.canvas.focus();
    const hr = document.createElement('div');
    hr.className = 'dlite-page-break';
    hr.setAttribute('contenteditable', 'false');
    hr.innerHTML = `<span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v4"/><path d="M4 16v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path d="M20 8V4a2 2 0 0 0-2-2h-4"/><line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="3 3"/></svg> Pemisah Halaman (Page Break)</span>`;

    this.editor.selection.insertBlockNode(hr);

    const p = document.createElement('p');
    p.innerHTML = '<br>';
    hr.after(p);

    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.editor.selection.save();

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  insertDateTime() {
    this.editor.canvas.focus();
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', optionsDate);
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const fullStr = `${dateStr}, ${timeStr} WIB`;

    const span = document.createElement('span');
    span.className = 'dlite-datetime-badge';
    span.textContent = fullStr;

    this.editor.selection.insertNode(span);

    const space = document.createTextNode(' ');
    span.after(space);

    const range = document.createRange();
    range.setStartAfter(space);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.editor.selection.save();

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  inlineCode() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText) {
      const code = document.createElement('code');
      code.className = 'dlite-inline-code';
      code.textContent = selectedText;
      range.deleteContents();
      range.insertNode(code);
      this.editor._onContentChanged();
      this.editor.history.record(true);
    }
  }

  textColor(color) {
    if (!color || color === 'transparent') {
      this.exec('foreColor', 'inherit');
      return;
    }
    this.exec('foreColor', color);
  }

  /**
   * Highlight color with support for clear / transparent
   */
  bgColor(color) {
    if (!color || color === 'transparent') {
      this.removeBgColor();
      return;
    }
    this.exec('hiliteColor', color);
  }

  removeBgColor() {
    this.editor.canvas.focus();
    const range = this.editor.selection.getRange();
    if (!range) return;

    document.execCommand('hiliteColor', false, 'transparent');

    // Clean up any remaining background inline styles from selection nodes
    const ancestor = range.commonAncestorContainer;
    const root = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentElement;
    if (root) {
      const styledSpans = root.querySelectorAll('span[style*="background"], font[style*="background"], mark');
      styledSpans.forEach(el => {
        el.style.backgroundColor = '';
        if (!el.getAttribute('style')) {
          while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
          el.remove();
        }
      });
    }

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  fontFamily(font) {
    this.exec('fontName', font);
  }

  fontSize(sizePx) {
    this.editor.canvas.focus();
    const range = this.editor.selection.getRange();
    if (!range) return;

    if (!range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } else {
      const block = this.editor.selection.getClosest('p, h1, h2, h3, h4, h5, h6, li, div');
      if (block) {
        block.style.fontSize = sizePx;
      }
    }
    this.editor._onContentChanged();
    this.editor.history.record();
  }

  lineHeight(val) {
    this.editor.canvas.focus();
    const block = this.editor.selection.getClosest('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');
    if (block) {
      block.style.lineHeight = val;
      this.editor._onContentChanged();
      this.editor.history.record();
    }
  }

  selectAll() {
    this.editor.canvas.focus();
    document.execCommand('selectAll', false, null);
  }

  print() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Jendela pencetakan diblokir oleh browser. Izinkan pop-up untuk mencetak dokumen.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Dokumen - D-Lite Editor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #111; }
          img { max-width: 100%; height: auto; }
          table { width: 100%; border-collapse: collapse; margin: 1em 0; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; }
          th { background: #f5f5f5; }
          blockquote { border-left: 4px solid #3b82f6; padding-left: 14px; margin: 1em 0; color: #555; }
          pre { background: #f8f9fa; border: 1px solid #e9ecef; padding: 12px; border-radius: 6px; }
          .dlite-file-card { border: 1px solid #ccc; padding: 10px; border-radius: 6px; display: inline-block; }
        </style>
      </head>
      <body>
        ${this.editor.getContent()}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
