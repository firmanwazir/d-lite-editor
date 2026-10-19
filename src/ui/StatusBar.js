import { Icons } from './Icons.js';

/**
 * StatusBar Component for D-Lite Editor
 * Displays word count, character count, reading time estimation, and theme toggling
 * Highly optimized with textContent and debouncing to eliminate reflow lag
 */
export class StatusBar {
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this.wordsEl = null;
    this.charsEl = null;
    this.readTimeEl = null;
    this._debounceTimer = null;
    this.init();
  }

  init() {
    this.el = document.createElement('div');
    this.el.className = 'dlite-statusbar';
    this.el.innerHTML = `
      <div class="dlite-statusbar-left">
        <span class="dlite-status-item dlite-status-words">0 kata</span>
        <span class="dlite-status-dot">•</span>
        <span class="dlite-status-item dlite-status-chars">0 karakter</span>
        <span class="dlite-status-dot">•</span>
        <span class="dlite-status-item dlite-status-readtime">&lt; 1 mnt baca</span>
      </div>
      <div class="dlite-statusbar-right">
        <button type="button" class="dlite-theme-toggle" title="Ganti Tema Gelap / Terang">
          ${Icons.themeMoon}
        </button>
        <span class="dlite-brand-label">D-Lite Editor</span>
      </div>
    `;

    this.wordsEl = this.el.querySelector('.dlite-status-words');
    this.charsEl = this.el.querySelector('.dlite-status-chars');
    this.readTimeEl = this.el.querySelector('.dlite-status-readtime');

    // Theme toggle button
    const themeBtn = this.el.querySelector('.dlite-theme-toggle');
    themeBtn.addEventListener('click', () => {
      this.editor.toggleTheme();
      const isDark = this.editor.container.classList.contains('dlite-theme-dark');
      themeBtn.innerHTML = isDark ? Icons.themeSun : Icons.themeMoon;
    });

    this.editor.container.appendChild(this.el);
    this.update(true);
  }

  update(immediate = false) {
    if (immediate) {
      this._calculate();
    } else {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._calculate(), 150);
    }
  }

  _calculate() {
    // textContent is 10-50x faster than innerText as it avoids browser reflow
    const text = this.editor.canvas ? this.editor.canvas.textContent || '' : '';
    const cleanText = text.trim();

    // Characters
    const chars = cleanText.length;
    if (this.charsEl) this.charsEl.textContent = `${chars.toLocaleString()} karakter`;

    // Words
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    if (this.wordsEl) this.wordsEl.textContent = `${words.toLocaleString()} kata`;

    // Reading time (average 200 words per minute)
    const minutes = Math.ceil(words / 200);
    if (this.readTimeEl) this.readTimeEl.textContent = words < 10 ? '< 1 mnt baca' : `${minutes} mnt baca`;
  }

  destroy() {
    clearTimeout(this._debounceTimer);
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
