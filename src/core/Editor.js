import { SelectionManager } from './Selection.js';
import { HistoryManager } from './History.js';
import { Sanitizer } from './Sanitizer.js';
import { Toolbar } from '../ui/Toolbar.js';
import { StatusBar } from '../ui/StatusBar.js';
import { BubbleMenu } from '../ui/BubbleMenu.js';
import { toast } from '../ui/Toast.js';
import { modal } from '../ui/Modal.js';
import { Icons } from '../ui/Icons.js';

import { Formatting } from '../plugins/Formatting.js';
import { Uploader } from '../plugins/Uploader.js';
import { ImagePlugin } from '../plugins/ImagePlugin.js';
import { FilePlugin } from '../plugins/FilePlugin.js';
import { LinkPlugin } from '../plugins/LinkPlugin.js';
import { TablePlugin } from '../plugins/TablePlugin.js';
import { CodePlugin } from '../plugins/CodePlugin.js';
import { MediaEmbedPlugin } from '../plugins/MediaEmbedPlugin.js';
import { SpecialCharPlugin } from '../plugins/SpecialCharPlugin.js';
import { FindReplacePlugin } from '../plugins/FindReplacePlugin.js';

/**
 * Main DLiteEditor Class
 */
export class DLiteEditor {
  constructor(options = {}) {
    this.options = Object.assign({
      selector: null,
      target: null,
      placeholder: 'Tuliskan cerita, laporan, atau artikel Anda di sini...',
      height: '480px',
      theme: 'light', // 'light' | 'dark'
      initialContent: '',
      upload: {},
      onChange: null,
      onInit: null
    }, options);

    this.container = null;
    this.canvas = null;
    this.plugins = {};
    this.events = {};

    this._initDOM();
    this._initCore();
    this._initPlugins();
    this._initUI();
    this._bindEvents();

    if (this.options.initialContent) {
      this.setContent(this.options.initialContent);
    } else {
      // Default initial paragraph
      this.canvas.innerHTML = '<p><br></p>';
    }

    if (typeof this.options.onInit === 'function') {
      this.options.onInit(this);
    }
  }

  _initDOM() {
    let target = this.options.target;
    if (!target && this.options.selector) {
      target = document.querySelector(this.options.selector);
    }

    if (!target) {
      throw new Error(`[D-Lite Editor] Target element tidak ditemukan untuk selector "${this.options.selector}"`);
    }

    this.targetElement = target;

    // Create main container
    this.container = document.createElement('div');
    this.container.className = `dlite-editor-container dlite-theme-${this.options.theme}`;
    if (this.options.height) {
      this.container.style.minHeight = this.options.height;
    }

    // Body wrapper
    const bodyWrapper = document.createElement('div');
    bodyWrapper.className = 'dlite-body-wrapper';

    // Canvas editable
    this.canvas = document.createElement('div');
    this.canvas.className = 'dlite-canvas';
    this.canvas.contentEditable = 'true';
    this.canvas.spellcheck = true;
    this.canvas.setAttribute('data-placeholder', this.options.placeholder);

    bodyWrapper.appendChild(this.canvas);
    this.container.appendChild(bodyWrapper);

    // If target is textarea or input, hide it and place editor after it
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      target.style.display = 'none';
      if (!this.options.initialContent && target.value) {
        this.options.initialContent = target.value;
      }
      target.parentNode.insertBefore(this.container, target.nextSibling);
    } else {
      if (!this.options.initialContent && target.innerHTML.trim()) {
        this.options.initialContent = target.innerHTML;
      }
      target.innerHTML = '';
      target.appendChild(this.container);
    }
  }

  _initCore() {
    this.selection = new SelectionManager(this);
    this.history = new HistoryManager(this);
  }

  _initPlugins() {
    this.plugins.formatting = new Formatting(this);
    this.plugins.uploader = new Uploader(this, this.options.upload);
    this.plugins.image = new ImagePlugin(this);
    this.plugins.file = new FilePlugin(this);
    this.plugins.link = new LinkPlugin(this);
    this.plugins.table = new TablePlugin(this);
    this.plugins.code = new CodePlugin(this);
    this.plugins.mediaEmbed = new MediaEmbedPlugin(this);
    this.plugins.specialChar = new SpecialCharPlugin(this);
    this.plugins.findReplace = new FindReplacePlugin(this);
  }

  _initUI() {
    this.toolbar = new Toolbar(this);
    this.statusbar = new StatusBar(this);
    this.bubbleMenu = new BubbleMenu(this);
  }

  _bindEvents() {
    // Continuously save selection caret position on canvas interactions
    ['keyup', 'mouseup', 'touchend', 'click'].forEach(evt => {
      this.canvas.addEventListener(evt, () => {
        this.selection.save();
      });
    });

    // Content change observation
    this.canvas.addEventListener('input', () => {
      this._onContentChanged();
      this.history.record();
      this.selection.save();
    });

    // Keyboard shortcuts & Enter key management
    this.canvas.addEventListener('keydown', (e) => {
      // 1. Enter key handling for Tasklist & Highlight cleanup
      if (e.key === 'Enter') {
        const taskItem = this.selection.getClosest('.dlite-task-item');
        if (taskItem) {
          e.preventDefault();
          const textEl = taskItem.querySelector('.dlite-task-text');
          const isBlank = !textEl || !textEl.textContent.trim();
          if (isBlank) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            taskItem.replaceWith(p);
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            const newItem = document.createElement('div');
            newItem.className = 'dlite-task-item';
            newItem.innerHTML = `
              <input type="checkbox" class="dlite-task-checkbox" contenteditable="false" />
              <span class="dlite-task-text" contenteditable="true"><br></span>
            `;
            taskItem.after(newItem);
            const newText = newItem.querySelector('.dlite-task-text');
            const range = document.createRange();
            range.setStart(newText, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
          this.selection.save();
          this._onContentChanged();
          this.history.record(true);
          return;
        }

        // Prevent background-color highlight bleeding into new lines
        setTimeout(() => {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            let node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
            const span = node.closest ? node.closest('span[style*="background"]') : null;
            if (span && (!span.textContent.trim() || span.innerHTML === '<br>')) {
              span.style.backgroundColor = '';
              if (!span.getAttribute('style')) {
                while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
                span.remove();
              }
            }
          }
          this.selection.save();
        }, 10);
      }

      // 2. Tab key handling for Indent / Outdent
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          this.plugins.formatting.outdent();
        } else {
          this.plugins.formatting.indent();
        }
      }

      // 3. Standard Command/Ctrl Shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.plugins.formatting.bold();
            break;
          case 'i':
            e.preventDefault();
            this.plugins.formatting.italic();
            break;
          case 'u':
            e.preventDefault();
            this.plugins.formatting.underline();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this.history.redo();
            } else {
              this.history.undo();
            }
            break;
          case 'y':
            e.preventDefault();
            this.history.redo();
            break;
          case 'k':
            e.preventDefault();
            this.plugins.link.openModal();
            break;
          case 'f':
            e.preventDefault();
            this.plugins.findReplace?.openModal();
            break;
          case 'p':
            e.preventDefault();
            this.plugins.formatting?.print();
            break;
          case '/':
          case '?':
            e.preventDefault();
            this.openHelpModal();
            break;
        }
      }
    });

    // Checkbox state synchronization for tasklist
    this.canvas.addEventListener('change', (e) => {
      if (e.target.classList.contains('dlite-task-checkbox')) {
        if (e.target.checked) {
          e.target.setAttribute('checked', '');
        } else {
          e.target.removeAttribute('checked');
        }
        this._onContentChanged();
        this.history.record(true);
      }
    });

    this._initFormSync();
  }

  _initFormSync() {
    if (this.targetElement && this.targetElement.form) {
      this._formSubmitHandler = () => {
        this.targetElement.value = this.getContent();
      };
      this.targetElement.form.addEventListener('submit', this._formSubmitHandler);
    }
  }

  _onContentChanged(immediate = false) {
    // 1. Immediately update status bar (word count, reading time) - ultra-fast textContent
    if (this.statusbar) {
      this.statusbar.update(immediate);
    }

    // 2. Fast raw HTML sync with target textarea so form data is always populated without DOMParser lag
    if (this.targetElement && (this.targetElement.tagName === 'TEXTAREA' || this.targetElement.tagName === 'INPUT')) {
      this.targetElement.value = this.getRawHTML();
    }

    // 3. Debounce expensive Sanitizer.clean() and change callbacks during rapid typing to eliminate input lag
    if (immediate) {
      clearTimeout(this._changeDebounceTimer);
      this._emitSanitizedChange();
    } else {
      clearTimeout(this._changeDebounceTimer);
      this._changeDebounceTimer = setTimeout(() => {
        this._emitSanitizedChange();
      }, 250);
    }
  }

  _emitSanitizedChange() {
    const html = this.getContent();
    if (this.targetElement && (this.targetElement.tagName === 'TEXTAREA' || this.targetElement.tagName === 'INPUT')) {
      this.targetElement.value = html;
    }
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(html);
    }
    this.emit('change', html);
  }

  /**
   * Fast raw HTML retrieval without parsing overhead
   * @returns {string}
   */
  getRawHTML() {
    if (this.plugins.code && this.plugins.code.isSourceMode) {
      return this.plugins.code.sourceTextarea.value;
    }
    return this.canvas.innerHTML;
  }

  /**
   * Returns clean sanitized HTML content
   * @returns {string}
   */
  getContent() {
    if (this.plugins.code && this.plugins.code.isSourceMode) {
      return Sanitizer.clean(this.plugins.code.sourceTextarea.value);
    }
    return Sanitizer.clean(this.canvas.innerHTML);
  }

  /**
   * Sets editor HTML content
   * @param {string} html 
   */
  setContent(html) {
    const clean = Sanitizer.clean(html);
    this.canvas.innerHTML = clean || '<p><br></p>';
    this.history.clear();
    this.history.record(true);
    this._onContentChanged(true);
  }

  getHTML() {
    return this.canvas.innerHTML;
  }

  getText() {
    return this.canvas.innerText || '';
  }

  /**
   * Clear content with custom confirmation modal (NO window.confirm!)
   */
  async clear() {
    const confirmed = await modal.confirm({
      title: 'Kosongkan Kanvas',
      message: 'Apakah Anda yakin ingin menghapus semua isi tulisan di editor?',
      confirmText: 'Kosongkan',
      isDestructive: true
    });

    if (confirmed) {
      this.setContent('<p><br></p>');
      toast.info('Kanvas telah dikosongkan.');
    }
  }

  /**
   * Toggle between Dark Mode and Light Mode
   */
  toggleTheme() {
    const isDark = this.container.classList.contains('dlite-theme-dark');
    this.container.classList.toggle('dlite-theme-dark', !isDark);
    this.container.classList.toggle('dlite-theme-light', isDark);
    toast.info(`Tema diubah ke ${!isDark ? 'Mode Gelap' : 'Mode Terang'}`);
  }

  /**
   * Zen / Fullscreen Toggle
   */
  toggleFullscreen() {
    const isFull = this.container.classList.toggle('dlite-fullscreen');
    if (isFull) {
      document.body.style.overflow = 'hidden';
      toast.info('Mode Layar Penuh aktif. Tekan kembali untuk keluar.');
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Preview document modal
   */
  preview() {
    const rawHtml = this.getHTML();
    const cleanHtml = Sanitizer.clean(rawHtml);

    const content = document.createElement('div');
    content.className = 'dlite-preview-modal-body';
    content.innerHTML = `
      <div class="dlite-preview-toolbar">
        <div class="dlite-preview-devices">
          <button type="button" class="dlite-preview-btn active" data-device="desktop">Desktop (100%)</button>
          <button type="button" class="dlite-preview-btn" data-device="tablet">Tablet (768px)</button>
          <button type="button" class="dlite-preview-btn" data-device="mobile">Ponsel (375px)</button>
        </div>
        <button type="button" class="dlite-preview-print-btn">${Icons.print} Cetak Dokumen</button>
      </div>
      <div class="dlite-preview-viewport-wrapper">
        <div class="dlite-preview-viewport" data-device="desktop">
          <div class="dlite-preview-rendered-content dlite-canvas">
            ${cleanHtml || '<p style="color:#94a3b8;font-style:italic">Dokumen masih kosong...</p>'}
          </div>
        </div>
      </div>
    `;

    // Device switcher
    const buttons = content.querySelectorAll('.dlite-preview-btn');
    const viewport = content.querySelector('.dlite-preview-viewport');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        viewport.setAttribute('data-device', btn.dataset.device);
      });
    });

    content.querySelector('.dlite-preview-print-btn').addEventListener('click', () => {
      this.plugins.formatting.print();
    });

    modal.open({
      title: 'Pratinjau Dokumen (Preview)',
      content,
      width: '880px',
      buttons: [
        { text: 'Tutup Pratinjau', type: 'primary' }
      ]
    });
  }

  /**
   * Help & Keyboard Shortcuts Modal
   */
  openHelpModal() {
    const content = document.createElement('div');
    content.className = 'dlite-help-modal-body';
    content.innerHTML = `
      <div class="dlite-help-section">
        <h4>Pintasan Keyboard (Shortcuts)</h4>
        <div class="dlite-shortcuts-grid">
          <div class="dlite-sc-row"><kbd>Ctrl + B</kbd><span>Teks Tebal (Bold)</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + I</kbd><span>Teks Miring (Italic)</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + U</kbd><span>Garis Bawah (Underline)</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + Z</kbd><span>Urungkan (Undo)</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + Y</kbd><span>Ulangi (Redo)</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + A</kbd><span>Pilih Semua Teks</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + F</kbd><span>Cari & Ganti Teks</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + K</kbd><span>Sisipkan Tautan</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + P</kbd><span>Cetak Dokumen</span></div>
          <div class="dlite-sc-row"><kbd>Ctrl + /</kbd><span>Buka Panduan Bantuan</span></div>
          <div class="dlite-sc-row"><kbd>Tab</kbd><span>Geser Masuk (Indent)</span></div>
          <div class="dlite-sc-row"><kbd>Shift + Tab</kbd><span>Geser Keluar (Outdent)</span></div>
          <div class="dlite-sc-row"><kbd>Shift + Enter</kbd><span>Baris Baru Tanpa Paragraf</span></div>
        </div>
      </div>
      <div class="dlite-help-section" style="margin-top: 16px;">
        <h4>Fitur Unggulan D-Lite Editor</h4>
        <ul class="dlite-help-features">
          <li><strong>Upload Langsung:</strong> Seret (drag & drop) gambar atau file dokumen langsung ke editor untuk upload instan dengan progress bar.</li>
          <li><strong>Checklist Interaktif:</strong> Tekan Enter untuk menambah tugas baru secara otomatis di posisi kursor.</li>
          <li><strong>Perataan Media:</strong> Gambar dan berkas lampiran mendukung perataan kiri, tengah, dan kanan.</li>
          <li><strong>Pembersih Format:</strong> Tombol Hapus Format membersihkan inline styles dan highlight background tanpa merusak struktur dokumen.</li>
        </ul>
      </div>
    `;

    modal.open({
      title: 'Bantuan & Pintasan Keyboard',
      content,
      width: '580px',
      buttons: [
        { text: 'Mengerti', type: 'primary' }
      ]
    });
  }

  /**
   * Event listener subscription
   */
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(fn => fn(data));
    }
  }

  destroy() {
    clearTimeout(this._changeDebounceTimer);

    if (this.targetElement?.form && this._formSubmitHandler) {
      this.targetElement.form.removeEventListener('submit', this._formSubmitHandler);
    }

    // 1. Clean up UI components and global document listeners
    if (this.toolbar) {
      this.toolbar.destroy();
    }
    if (this.statusbar) {
      this.statusbar.destroy();
    }
    if (this.bubbleMenu) {
      this.bubbleMenu.destroy();
    }

    // 2. Clean up plugins and unbind window/document listeners
    if (this.plugins?.image?.destroy) {
      this.plugins.image.destroy();
    }
    if (this.plugins?.link?.destroy) {
      this.plugins.link.destroy();
    }
    if (this.plugins?.table?.destroy) {
      this.plugins.table.destroy();
    }

    // 3. Remove main container and restore target element
    if (this.container && this.container.parentNode) {
      if (this.targetElement) {
        this.targetElement.style.display = '';
      }
      this.container.parentNode.removeChild(this.container);
    }

    // 4. Reset document overflow in case fullscreen was active
    document.body.style.overflow = '';
  }
}
