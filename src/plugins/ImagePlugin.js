import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { Icons } from '../ui/Icons.js';

/**
 * Image Plugin for D-Lite Editor
 * Image insertion modal, floating image bubble toolbar, resizing & alignment
 */
export class ImagePlugin {
  constructor(editor) {
    this.editor = editor;
    this.selectedImage = null;
    this.bubble = null;
    this.resizer = null;
    this.init();
  }

  init() {
    this._createImageBubble();
    this._initClickWatcher();
  }

  /**
   * Open the custom Image Insertion Modal (strictly NO native alerts/prompts)
   */
  openModal() {
    this.editor.selection.save();

    const content = document.createElement('div');
    content.className = 'dlite-media-modal-content';
    content.innerHTML = `
      <div class="dlite-tabs">
        <button class="dlite-tab-btn active" data-tab="upload" type="button">Upload dari Komputer</button>
        <button class="dlite-tab-btn" data-tab="url" type="button">URL Gambar Web</button>
      </div>
      
      <div class="dlite-tab-pane active" id="tab-upload">
        <div class="dlite-drop-area" id="dlite-image-file-drop">
          <div class="dlite-drop-icon">${Icons.upload}</div>
          <p class="dlite-drop-text">Pilih atau seret gambar ke sini</p>
          <small class="dlite-drop-sub">JPG, PNG, WebP, GIF, SVG (Maks. 10MB)</small>
          <input type="file" id="dlite-image-input" accept="image/*" class="dlite-hidden-input" />
          <button class="dlite-btn dlite-btn-primary dlite-btn-sm" type="button" id="dlite-browse-img-btn">Pilih Gambar</button>
        </div>
      </div>

      <div class="dlite-tab-pane" id="tab-url">
        <div class="dlite-form-group">
          <label class="dlite-label">Tautan / URL Gambar</label>
          <input type="url" id="dlite-image-url-input" class="dlite-input" placeholder="https://contoh.com/gambar.jpg" />
        </div>
        <div class="dlite-form-group">
          <label class="dlite-label">Teks Alternatif (Alt Text)</label>
          <input type="text" id="dlite-image-alt-input" class="dlite-input" placeholder="Deskripsi gambar untuk aksesibilitas" />
        </div>
      </div>
    `;

    // Tab switching logic
    const tabs = content.querySelectorAll('.dlite-tab-btn');
    const panes = content.querySelectorAll('.dlite-tab-pane');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        content.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    const fileInput = content.querySelector('#dlite-image-input');
    const browseBtn = content.querySelector('#dlite-browse-img-btn');
    const dropArea = content.querySelector('#dlite-image-file-drop');

    browseBtn.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('click', (e) => {
      if (e.target !== browseBtn) fileInput.click();
    });

    const modalInstance = modal.open({
      title: 'Sisipkan Gambar',
      content,
      width: '480px',
      buttons: [
        {
          text: 'Batal',
          type: 'secondary',
          onClick: () => true
        },
        {
          text: 'Sisipkan',
          type: 'primary',
          onClick: () => {
            const activeTab = content.querySelector('.dlite-tab-btn.active').dataset.tab;
            if (activeTab === 'url') {
              const url = content.querySelector('#dlite-image-url-input').value.trim();
              const alt = content.querySelector('#dlite-image-alt-input').value.trim();
              if (!url) {
                toast.warning('Silakan masukkan URL gambar.');
                return false;
              }
              this.insertImageUrl(url, alt);
              return true;
            } else {
              if (fileInput.files && fileInput.files[0]) {
                this.editor.plugins.uploader.upload(fileInput.files[0]);
                return true;
              }
              toast.warning('Silakan pilih berkas gambar yang ingin diunggah.');
              return false;
            }
          }
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

  insertImageUrl(url, alt = '') {
    const dangerous = /^(javascript|vbscript|data:(?!image\/)|file:)/i;
    if (dangerous.test(url.replace(/\s+/g, ''))) {
      toast.error('URL gambar tidak diizinkan demi keamanan.');
      return;
    }

    this.editor.selection.restore();
    const figure = document.createElement('figure');
    figure.className = 'dlite-media-figure dlite-align-center';

    const img = document.createElement('img');
    img.src = url;
    img.alt = alt || 'Gambar';
    img.className = 'dlite-media-image';

    const caption = document.createElement('figcaption');
    caption.className = 'dlite-media-caption';
    caption.textContent = '';
    caption.setAttribute('data-placeholder', 'Tuliskan keterangan gambar di sini (opsional)...');

    figure.appendChild(img);
    figure.appendChild(caption);

    this.editor.selection.insertBlockNode(figure);
    this.editor._onContentChanged();
    this.editor.history.record(true);
    toast.success('Gambar berhasil disisipkan.');
  }

  /**
   * Floating Image Bubble Toolbar
   */
  _createImageBubble() {
    this.bubble = document.createElement('div');
    this.bubble.className = 'dlite-image-bubble dlite-bubble-hidden';
    this.bubble.innerHTML = `
      <div class="dlite-bubble-group">
        <button type="button" class="dlite-bubble-btn" data-align="left" title="Rata Kiri">${Icons.alignLeft}</button>
        <button type="button" class="dlite-bubble-btn" data-align="center" title="Rata Tengah">${Icons.alignCenter}</button>
        <button type="button" class="dlite-bubble-btn" data-align="right" title="Rata Kanan">${Icons.alignRight}</button>
      </div>
      <div class="dlite-bubble-sep"></div>
      <div class="dlite-bubble-group">
        <button type="button" class="dlite-bubble-btn" data-size="25%" title="Ukuran 25%">25%</button>
        <button type="button" class="dlite-bubble-btn" data-size="50%" title="Ukuran 50%">50%</button>
        <button type="button" class="dlite-bubble-btn" data-size="75%" title="Ukuran 75%">75%</button>
        <button type="button" class="dlite-bubble-btn" data-size="100%" title="Ukuran Penuh (100%)">100%</button>
      </div>
      <div class="dlite-bubble-sep"></div>
      <div class="dlite-bubble-group">
        <button type="button" class="dlite-bubble-btn" data-action="alt" title="Edit Teks Alternatif">${Icons.edit}</button>
        <button type="button" class="dlite-bubble-btn dlite-bubble-danger" data-action="delete" title="Hapus Gambar">${Icons.trash}</button>
      </div>
    `;

    document.body.appendChild(this.bubble);

    // Bubble button events
    this.bubble.addEventListener('click', async (e) => {
      const btn = e.target.closest('.dlite-bubble-btn');
      if (!btn || !this.selectedImage) return;

      const align = btn.dataset.align;
      const size = btn.dataset.size;
      const action = btn.dataset.action;

      const figure = this.selectedImage.closest('figure') || this.selectedImage;

      if (align) {
        figure.classList.remove('dlite-align-left', 'dlite-align-center', 'dlite-align-right');
        figure.classList.add(`dlite-align-${align}`);
        this.positionBubble();
        this.editor._onContentChanged();
      } else if (size) {
        this.selectedImage.style.width = size;
        this.selectedImage.style.height = 'auto';
        this.positionBubble();
        this.editor._onContentChanged();
      } else if (action === 'alt') {
        const currentAlt = this.selectedImage.getAttribute('alt') || '';
        const newAlt = await modal.prompt({
          title: 'Ubah Teks Alternatif (Alt Text)',
          message: 'Teks ini membantu pembaca tuna netra dan SEO gambar:',
          defaultValue: currentAlt,
          placeholder: 'Deskripsi gambar...'
        });
        if (newAlt !== null) {
          this.selectedImage.setAttribute('alt', newAlt);
          toast.success('Alt text gambar berhasil diperbarui.');
          this.editor._onContentChanged();
        }
      } else if (action === 'delete') {
        const confirmed = await modal.confirm({
          title: 'Hapus Gambar',
          message: 'Apakah Anda yakin ingin menghapus gambar ini?',
          confirmText: 'Hapus',
          isDestructive: true
        });
        if (confirmed) {
          figure.remove();
          this.hideBubble();
          this.editor._onContentChanged();
          this.editor.history.record(true);
          toast.info('Gambar telah dihapus.');
        }
      }
    });
  }

  _initClickWatcher() {
    this._onClick = (e) => {
      if (e.target.tagName === 'IMG' && this.editor.canvas.contains(e.target)) {
        this.selectImage(e.target);
      } else {
        this.hideBubble();
      }
    };
    this.editor.canvas.addEventListener('click', this._onClick);

    this._onResize = () => {
      if (this.selectedImage) this.positionBubble();
    };
    window.addEventListener('resize', this._onResize);

    this._onScroll = () => {
      if (this.selectedImage) this.positionBubble();
    };
    document.addEventListener('scroll', this._onScroll, true);
  }

  selectImage(img) {
    if (this.selectedImage) {
      this.selectedImage.classList.remove('dlite-selected-img');
    }
    this.selectedImage = img;
    img.classList.add('dlite-selected-img');
    this.showBubble();
  }

  showBubble() {
    this.bubble.classList.remove('dlite-bubble-hidden');
    this.positionBubble();
  }

  hideBubble() {
    if (this.selectedImage) {
      this.selectedImage.classList.remove('dlite-selected-img');
      this.selectedImage = null;
    }
    this.bubble.classList.add('dlite-bubble-hidden');
  }

  positionBubble() {
    if (!this.selectedImage) return;
    const rect = this.selectedImage.getBoundingClientRect();
    const bubbleRect = this.bubble.getBoundingClientRect();

    let top = rect.top - bubbleRect.height - 10;
    let left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);

    if (top < 10) top = rect.bottom + 10;
    if (left < 10) left = 10;
    if (left + bubbleRect.width > window.innerWidth) {
      left = window.innerWidth - bubbleRect.width - 10;
    }

    this.bubble.style.top = `${top}px`;
    this.bubble.style.left = `${left}px`;
  }

  destroy() {
    this.editor.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('scroll', this._onScroll, true);
    if (this.bubble?.parentNode) {
      this.bubble.parentNode.removeChild(this.bubble);
    }
  }
}
