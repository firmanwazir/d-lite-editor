import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { Icons } from '../ui/Icons.js';
import { Sanitizer } from '../core/Sanitizer.js';

/**
 * Link Plugin for D-Lite Editor
 * Custom modal insertion and floating link preview/edit bubble
 */
export class LinkPlugin {
  constructor(editor) {
    this.editor = editor;
    this.activeLink = null;
    this.popover = null;
    this.init();
  }

  init() {
    this._createPopover();
    this._initClickWatcher();
  }

  /**
   * Open Custom Modal to insert or edit a link
   */
  openModal(linkElement = null) {
    this.editor.selection.save();

    const range = this.editor.selection.getRange();
    const selectedText = range ? range.toString().trim() : '';

    const currentUrl = linkElement ? linkElement.getAttribute('href') : '';
    const currentText = linkElement ? linkElement.textContent : selectedText;
    const currentTargetBlank = linkElement ? linkElement.getAttribute('target') === '_blank' : true;

    const safeText = Sanitizer.escapeHtml(currentText);
    const safeUrl = Sanitizer.escapeHtml(currentUrl);

    const content = document.createElement('div');
    content.className = 'dlite-link-modal-content';
    content.innerHTML = `
      <div class="dlite-form-group">
        <label class="dlite-label">Teks Tampilan</label>
        <input type="text" id="dlite-link-text" class="dlite-input" value="${safeText}" placeholder="Contoh: Kunjungi Web Kami" />
      </div>
      <div class="dlite-form-group">
        <label class="dlite-label">Alamat URL Tautan</label>
        <input type="url" id="dlite-link-url" class="dlite-input" value="${safeUrl}" placeholder="https://example.com" />
      </div>
      <div class="dlite-form-checkbox">
        <label class="dlite-checkbox-label">
          <input type="checkbox" id="dlite-link-target" ${currentTargetBlank ? 'checked' : ''} />
          Buka di tab baru (target="_blank")
        </label>
      </div>
    `;

    modal.open({
      title: linkElement ? 'Ubah Tautan' : 'Sisipkan Tautan',
      content,
      width: '450px',
      buttons: [
        {
          text: 'Batal',
          type: 'secondary'
        },
        {
          text: linkElement ? 'Simpan Perubahan' : 'Sisipkan Tautan',
          type: 'primary',
          onClick: () => {
            const urlInput = content.querySelector('#dlite-link-url').value.trim();
            const textInput = content.querySelector('#dlite-link-text').value.trim();
            const targetBlank = content.querySelector('#dlite-link-target').checked;

            if (!urlInput) {
              toast.warning('Silakan masukkan alamat URL.');
              return false;
            }

            const dangerousProtocols = /^(javascript|vbscript|data|file):/i;
            if (dangerousProtocols.test(urlInput.replace(/\s+/g, ''))) {
              toast.error('Protokol URL tidak diizinkan demi keamanan.');
              return false;
            }

            let validUrl = urlInput;
            if (!validUrl.match(/^https?:\/\//i) && !validUrl.startsWith('/') && !validUrl.startsWith('#') && !validUrl.startsWith('mailto:')) {
              validUrl = 'https://' + validUrl;
            }

            if (linkElement) {
              linkElement.setAttribute('href', validUrl);
              linkElement.textContent = textInput || validUrl;
              if (targetBlank) {
                linkElement.setAttribute('target', '_blank');
                linkElement.setAttribute('rel', 'noopener noreferrer');
              } else {
                linkElement.removeAttribute('target');
                linkElement.removeAttribute('rel');
              }
              toast.success('Tautan berhasil diperbarui.');
            } else {
              this.editor.selection.restore();
              const a = document.createElement('a');
              a.href = validUrl;
              a.textContent = textInput || validUrl;
              if (targetBlank) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
              }
              this.editor.selection.insertNode(a);
              toast.success('Tautan berhasil disisipkan.');
            }

            this.editor._onContentChanged();
            this.editor.history.record(true);
            return true;
          }
        }
      ]
    });
  }

  /**
   * Remove link from current selection or active link
   */
  unlink() {
    this.editor.selection.restore();
    const link = this.activeLink || this.editor.selection.getClosest('a');
    if (link) {
      const parent = link.parentNode;
      while (link.firstChild) {
        parent.insertBefore(link.firstChild, link);
      }
      parent.removeChild(link);
      this.hidePopover();
      this.editor._onContentChanged();
      this.editor.history.record(true);
      toast.info('Tautan dilepas.');
    } else {
      document.execCommand('unlink');
      this.editor._onContentChanged();
      this.editor.history.record(true);
      toast.info('Tautan dilepas.');
    }
  }

  _createPopover() {
    this.popover = document.createElement('div');
    this.popover.className = 'dlite-link-popover dlite-bubble-hidden';
    this.popover.innerHTML = `
      <a href="#" target="_blank" class="dlite-link-preview-url" rel="noopener noreferrer">
        <span class="dlite-link-preview-text"></span>
        ${Icons.externalLink}
      </a>
      <div class="dlite-bubble-sep"></div>
      <button type="button" class="dlite-bubble-btn" data-action="edit" title="Ubah Tautan">${Icons.edit}</button>
      <button type="button" class="dlite-bubble-btn dlite-bubble-danger" data-action="unlink" title="Hapus Tautan">${Icons.unlink}</button>
    `;

    document.body.appendChild(this.popover);

    this.popover.addEventListener('click', (e) => {
      const btn = e.target.closest('.dlite-bubble-btn');
      if (!btn || !this.activeLink) return;

      const action = btn.dataset.action;
      if (action === 'edit') {
        const link = this.activeLink;
        this.hidePopover();
        this.openModal(link);
      } else if (action === 'unlink') {
        const parent = this.activeLink.parentNode;
        while (this.activeLink.firstChild) {
          parent.insertBefore(this.activeLink.firstChild, this.activeLink);
        }
        parent.removeChild(this.activeLink);
        this.hidePopover();
        this.editor._onContentChanged();
        this.editor.history.record(true);
        toast.info('Tautan dilepas.');
      }
    });
  }

  _initClickWatcher() {
    this._onClick = (e) => {
      const link = e.target.closest('a');
      if (link && this.editor.canvas.contains(link)) {
        e.preventDefault();
        this.showPopover(link);
      } else {
        this.hidePopover();
      }
    };
    this.editor.canvas.addEventListener('click', this._onClick);

    this._onResize = () => {
      if (this.activeLink) this.positionPopover();
    };
    window.addEventListener('resize', this._onResize);

    this._onScroll = () => {
      if (this.activeLink) this.positionPopover();
    };
    document.addEventListener('scroll', this._onScroll, true);
  }

  showPopover(link) {
    this.activeLink = link;
    const url = (link.getAttribute('href') || '#').trim();
    const previewLink = this.popover.querySelector('.dlite-link-preview-url');
    const previewText = this.popover.querySelector('.dlite-link-preview-text');

    const isSafe = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url);
    if (isSafe) {
      previewLink.href = url;
      previewLink.target = '_blank';
      previewLink.rel = 'noopener noreferrer';
    } else {
      previewLink.href = 'javascript:void(0)';
      previewLink.removeAttribute('target');
      previewLink.removeAttribute('rel');
    }
    previewText.textContent = url;

    this.popover.classList.remove('dlite-bubble-hidden');
    this.positionPopover();
  }

  hidePopover() {
    this.activeLink = null;
    this.popover.classList.add('dlite-bubble-hidden');
  }

  positionPopover() {
    if (!this.activeLink) return;
    const rect = this.activeLink.getBoundingClientRect();
    const popRect = this.popover.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);

    if (left < 10) left = 10;
    if (left + popRect.width > window.innerWidth) {
      left = window.innerWidth - popRect.width - 10;
    }

    this.popover.style.top = `${top}px`;
    this.popover.style.left = `${left}px`;
  }

  destroy() {
    this.editor.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('scroll', this._onScroll, true);
    if (this.popover?.parentNode) {
      this.popover.parentNode.removeChild(this.popover);
    }
  }
}
