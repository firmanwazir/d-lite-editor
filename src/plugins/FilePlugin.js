import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { Icons } from '../ui/Icons.js';
import { Sanitizer } from '../core/Sanitizer.js';

/**
 * File Plugin for D-Lite Editor
 * Uploads & renders interactive download cards for documents and files
 */
export class FilePlugin {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Open the File Attachment Modal
   */
  openModal() {
    this.editor.selection.save();

    const content = document.createElement('div');
    content.className = 'dlite-file-modal-content';
    content.innerHTML = `
      <div class="dlite-drop-area" id="dlite-file-drop">
        <div class="dlite-drop-icon">${Icons.file}</div>
        <p class="dlite-drop-text">Pilih atau seret berkas dokumen ke sini</p>
        <small class="dlite-drop-sub">PDF, DOCX, XLSX, PPTX, ZIP, TXT (Maks. 25MB)</small>
        <input type="file" id="dlite-doc-input" class="dlite-hidden-input" />
        <button class="dlite-btn dlite-btn-primary dlite-btn-sm" type="button" id="dlite-browse-doc-btn">Pilih Berkas</button>
      </div>
    `;

    const fileInput = content.querySelector('#dlite-doc-input');
    const browseBtn = content.querySelector('#dlite-browse-doc-btn');
    const dropArea = content.querySelector('#dlite-file-drop');

    browseBtn.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('click', (e) => {
      if (e.target !== browseBtn) fileInput.click();
    });

    const modalInstance = modal.open({
      title: 'Sisipkan Lampiran Berkas',
      content,
      width: '460px',
      buttons: [
        {
          text: 'Batal',
          type: 'secondary'
        }
      ]
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        modalInstance.close();
        this.editor.plugins.uploader.upload(fileInput.files[0]);
      }
    });
  }

  /**
   * Helper to format file sizes
   */
  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Create a smart file attachment card widget
   */
  createFileCard({ url, name, size }) {
    const container = document.createElement('div');
    container.className = 'dlite-file-container dlite-align-left';
    container.contentEditable = 'false';

    const card = document.createElement('div');
    card.className = 'dlite-file-card';
    card.setAttribute('data-file-url', url);
    card.setAttribute('data-file-name', name);
    card.setAttribute('data-file-size', size);

    const ext = name.split('.').pop().toUpperCase();
    const formattedSize = typeof size === 'number' ? this.formatSize(size) : size;

    const safeName = Sanitizer.escapeHtml(name);
    const safeExt = Sanitizer.escapeHtml(ext);
    const safeSize = Sanitizer.escapeHtml(formattedSize);
    const safeUrl = Sanitizer.escapeHtml(url);

    card.innerHTML = `
      <div class="dlite-file-card-icon">
        <span class="dlite-file-badge">${safeExt}</span>
      </div>
      <div class="dlite-file-card-details">
        <div class="dlite-file-card-name" title="${safeName}">${safeName}</div>
        <div class="dlite-file-card-meta">${safeSize} • Dokumen</div>
      </div>
      <div class="dlite-file-card-actions">
        <button type="button" class="dlite-file-card-btn dlite-align-file-btn" data-align="left" title="Rata Kiri">${Icons.alignLeft}</button>
        <button type="button" class="dlite-file-card-btn dlite-align-file-btn" data-align="center" title="Rata Tengah">${Icons.alignCenter}</button>
        <button type="button" class="dlite-file-card-btn dlite-align-file-btn" data-align="right" title="Rata Kanan">${Icons.alignRight}</button>
        <a href="${safeUrl}" target="_blank" download="${safeName}" class="dlite-file-card-btn" title="Unduh Berkas">${Icons.download}</a>
        <button type="button" class="dlite-file-card-btn dlite-btn-danger-hover dlite-del-file-btn" title="Hapus Berkas">${Icons.trash}</button>
      </div>
    `;

    // Alignment buttons
    card.querySelectorAll('.dlite-align-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const align = btn.dataset.align;
        container.classList.remove('dlite-align-left', 'dlite-align-center', 'dlite-align-right');
        container.classList.add(`dlite-align-${align}`);
        this.editor._onContentChanged();
        this.editor.history.record(true);
      });
    });

    // Handle delete button
    card.querySelector('.dlite-del-file-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await modal.confirm({
        title: 'Hapus Berkas',
        message: `Apakah Anda yakin ingin menghapus lampiran "${name}"?`,
        confirmText: 'Hapus',
        isDestructive: true
      });
      if (confirmed) {
        container.remove();
        this.editor._onContentChanged();
        this.editor.history.record(true);
        toast.info('Lampiran berkas telah dihapus.');
      }
    });

    container.appendChild(card);
    return container;
  }
}
