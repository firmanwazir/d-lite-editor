import { Icons } from './Icons.js';

/**
 * BubbleMenu - Floating inline formatting toolbar when selecting text
 */
export class BubbleMenu {
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this.init();
  }

  init() {
    this.el = document.createElement('div');
    this.el.className = 'dlite-bubble-menu dlite-bubble-hidden';
    this.el.innerHTML = `
      <button type="button" class="dlite-bubble-btn" data-cmd="bold" title="Tebal (Ctrl+B)">${Icons.bold}</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="italic" title="Miring (Ctrl+I)">${Icons.italic}</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="underline" title="Garis Bawah (Ctrl+U)">${Icons.underline}</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="strike" title="Coret">${Icons.strikethrough}</button>
      <div class="dlite-bubble-sep"></div>
      <button type="button" class="dlite-bubble-btn" data-cmd="h2" title="Heading 2">H2</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="h3" title="Heading 3">H3</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="quote" title="Kutipan">${Icons.quote}</button>
      <button type="button" class="dlite-bubble-btn" data-cmd="code" title="Inline Code">${Icons.code}</button>
      <div class="dlite-bubble-sep"></div>
      <button type="button" class="dlite-bubble-btn" data-cmd="link" title="Tautan">${Icons.link}</button>
    `;

    document.body.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('.dlite-bubble-btn');
      if (!btn) return;

      const cmd = btn.dataset.cmd;
      switch (cmd) {
        case 'bold': this.editor.plugins.formatting.bold(); break;
        case 'italic': this.editor.plugins.formatting.italic(); break;
        case 'underline': this.editor.plugins.formatting.underline(); break;
        case 'strike': this.editor.plugins.formatting.strike(); break;
        case 'h2': this.editor.plugins.formatting.formatBlock('h2'); break;
        case 'h3': this.editor.plugins.formatting.formatBlock('h3'); break;
        case 'quote': this.editor.plugins.code.insertBlockquote(); break;
        case 'code': this.editor.plugins.formatting.inlineCode(); break;
        case 'link': this.editor.plugins.link.openModal(); break;
      }
      this.updatePosition();
    });

    this._onSelectionChange = () => {
      if (document.activeElement === this.editor.canvas) {
        this.updatePosition();
      }
    };
    document.addEventListener('selectionchange', this._onSelectionChange);

    this._onScroll = () => {
      if (!this.el.classList.contains('dlite-bubble-hidden')) {
        this.updatePosition();
      }
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });

    this.editor.canvas.addEventListener('blur', () => {
      // Delay so clicks on bubble don't immediately hide it
      setTimeout(() => {
        if (!this.el.contains(document.activeElement)) {
          this.hide();
        }
      }, 200);
    });
  }

  updatePosition() {
    if (!this.editor.selection.hasSelection()) {
      this.hide();
      return;
    }

    const range = this.editor.selection.getRange();
    if (!range) {
      this.hide();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      this.hide();
      return;
    }

    this.show();
    const bubbleRect = this.el.getBoundingClientRect();

    let top = rect.top - bubbleRect.height - 8;
    let left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);

    if (top < 10) top = rect.bottom + 8;
    if (left < 10) left = 10;
    if (left + bubbleRect.width > window.innerWidth) {
      left = window.innerWidth - bubbleRect.width - 10;
    }

    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }

  show() {
    this.el.classList.remove('dlite-bubble-hidden');
  }

  hide() {
    this.el.classList.add('dlite-bubble-hidden');
  }

  destroy() {
    document.removeEventListener('selectionchange', this._onSelectionChange);
    window.removeEventListener('scroll', this._onScroll);
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
