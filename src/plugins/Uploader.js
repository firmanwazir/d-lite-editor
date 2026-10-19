import { toast } from '../ui/Toast.js';
import { Icons } from '../ui/Icons.js';
import { Sanitizer } from '../core/Sanitizer.js';

/**
 * Uploader Plugin for D-Lite Editor
 * Handles Drag & Drop, Clipboard Paste, and File/Image Upload with Live Progress Bars
 */
export class Uploader {
  constructor(editor, options = {}) {
    this.editor = editor;
    this.options = Object.assign({
      endpoint: '/api/upload',
      fieldName: 'file',
      headers: {},
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      allowedFileTypes: ['application/pdf', 'application/zip', '.docx', '.xlsx', '.txt'],
      customUploader: null
    }, options);

    this.init();
  }

  init() {
    this._initDropzone();
    this._initPasteHandler();
  }

  /**
   * Initialize Drag and Drop into editor canvas
   */
  _initDropzone() {
    const canvas = this.editor.canvas;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      canvas.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    canvas.addEventListener('dragover', () => {
      canvas.classList.add('dlite-dropzone-active');
    });

    ['dragleave', 'drop'].forEach(eventName => {
      canvas.addEventListener(eventName, () => {
        canvas.classList.remove('dlite-dropzone-active');
      });
    });

    canvas.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        // Place cursor at drop point
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            this.editor.selection.save();
          }
        }
        Array.from(files).forEach(file => this.upload(file));
      }
    });
  }

  /**
   * Handle pasting images from clipboard
   */
  _initPasteHandler() {
    this.editor.canvas.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;

      // 1. Check if image file exists in clipboard
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              this.upload(file);
              return;
            }
          }
        }
      }

      // 2. If rich HTML is being pasted from web or external documents, sanitize it!
      const html = clipboardData.getData('text/html');
      if (html) {
        e.preventDefault();
        const clean = Sanitizer.clean(html);
        this.editor.selection.insertHTML(clean);
        this.editor._onContentChanged();
        this.editor.history.record(true);
      }
    });
  }

  /**
   * Validate file size and type
   */
  validate(file) {
    if (file.size > this.options.maxFileSize) {
      const maxMb = (this.options.maxFileSize / (1024 * 1024)).toFixed(0);
      toast.error(`Ukuran berkas "${file.name}" melebihi batas maksimum ${maxMb}MB.`);
      return false;
    }

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      if (this.options.allowedImageTypes.length > 0 && !this.options.allowedImageTypes.includes(file.type)) {
        toast.error(`Format gambar "${file.name}" tidak didukung.`);
        return false;
      }
    }
    return true;
  }

  /**
   * Upload a file or image
   * @param {File} file 
   */
  async upload(file) {
    if (!this.validate(file)) return;

    const isImage = file.type.startsWith('image/');
    const placeholderId = 'dlite-upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    // Create live progress placeholder in canvas
    this._insertPlaceholder(placeholderId, file, isImage);

    try {
      let result;
      if (typeof this.options.customUploader === 'function') {
        result = await this.options.customUploader(file, (percent) => {
          this._updateProgress(placeholderId, percent);
        });
      } else {
        result = await this._defaultHttpUpload(file, (percent) => {
          this._updateProgress(placeholderId, percent);
        });
      }

      this._handleSuccess(placeholderId, result, file, isImage);
    } catch (err) {
      this._handleError(placeholderId, err, file);
    }
  }

  /**
   * Insert placeholder element with progress bar into canvas
   */
  _insertPlaceholder(id, file, isImage) {
    const placeholder = document.createElement('div');
    placeholder.id = id;
    placeholder.className = `dlite-upload-placeholder ${isImage ? 'is-image' : 'is-file'}`;
    placeholder.contentEditable = 'false';

    const safeFileName = Sanitizer.escapeHtml(file.name);
    const fileSizeFormatted = (file.size / 1024).toFixed(1) + ' KB';

    placeholder.innerHTML = `
      <div class="dlite-upload-inner">
        <div class="dlite-upload-spinner"></div>
        <div class="dlite-upload-info">
          <span class="dlite-upload-name">${safeFileName}</span>
          <span class="dlite-upload-size">(${fileSizeFormatted})</span>
          <span class="dlite-upload-percent">0%</span>
        </div>
        <div class="dlite-upload-bar-track">
          <div class="dlite-upload-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    `;

    this.editor.selection.insertBlockNode(placeholder);
    this.editor._onContentChanged();
  }

  _updateProgress(id, percent) {
    const el = document.getElementById(id);
    if (!el) return;
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    const percentText = el.querySelector('.dlite-upload-percent');
    const barFill = el.querySelector('.dlite-upload-bar-fill');
    if (percentText) percentText.textContent = `${clamped}%`;
    if (barFill) barFill.style.width = `${clamped}%`;
  }

  _handleSuccess(id, result, file, isImage) {
    const placeholder = document.getElementById(id);
    if (!placeholder) return;

    let url = result?.url || result?.data?.url || (file ? URL.createObjectURL(file) : '');
    if (!/^(https?:\/\/|\/|blob:)/i.test(url.trim())) {
      url = '#';
    }

    if (isImage) {
      const figure = document.createElement('figure');
      figure.className = 'dlite-media-figure dlite-align-center';
      
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name || 'Gambar';
      img.className = 'dlite-media-image';
      
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'dlite-media-caption';
      figcaption.textContent = '';
      figcaption.setAttribute('data-placeholder', 'Tuliskan keterangan gambar di sini (opsional)...');

      figure.appendChild(img);
      figure.appendChild(figcaption);

      placeholder.replaceWith(figure);
      toast.success(`Gambar "${file.name}" berhasil diunggah.`);
    } else {
      // Create file attachment card
      const card = this.editor.plugins.file?.createFileCard({
        url,
        name: file.name,
        size: file.size
      });

      if (card) {
        placeholder.replaceWith(card);
      } else {
        placeholder.remove();
      }
      toast.success(`Berkas "${file.name}" berhasil diunggah.`);
    }

    this.editor._onContentChanged();
    this.editor.history.record(true);
  }

  _handleError(id, err, file) {
    const placeholder = document.getElementById(id);
    const errorMsg = err?.message || 'Gagal mengunggah berkas.';
    const safeFileName = Sanitizer.escapeHtml(file.name);
    const safeErrorMsg = Sanitizer.escapeHtml(errorMsg);
    toast.error(errorMsg, `Upload Gagal: ${file.name}`);

    if (placeholder) {
      placeholder.innerHTML = `
        <div class="dlite-upload-inner dlite-upload-failed">
          <span class="dlite-upload-fail-icon">${Icons.alertTriangle}</span>
          <div class="dlite-upload-fail-text">
            <strong>Gagal: ${safeFileName}</strong>
            <small>${safeErrorMsg}</small>
          </div>
          <button class="dlite-btn dlite-btn-sm dlite-btn-secondary" type="button">Hapus</button>
        </div>
      `;
      placeholder.querySelector('button').addEventListener('click', () => {
        placeholder.remove();
        this.editor._onContentChanged();
      });
    }
  }

  /**
   * Default XMLHttpRequest upload with progress event
   */
  _defaultHttpUpload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.options.endpoint, true);

      // Add headers
      if (this.options.headers) {
        Object.entries(this.options.headers).forEach(([key, val]) => {
          xhr.setRequestHeader(key, val);
        });
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.success !== false) {
              resolve(json);
            } else {
              reject(new Error(json.message || 'Server menolak berkas'));
            }
          } catch {
            resolve({ url: URL.createObjectURL(file) });
          }
        } else {
          reject(new Error(`Server merespons kode HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Koneksi jaringan terputus saat upload'));

      const formData = new FormData();
      formData.append(this.options.fieldName, file);
      xhr.send(formData);
    });
  }
}
