import { Icons } from './Icons.js';

/**
 * DLiteModal - Modern Modal & Custom Dialog Manager
 * Completely replaces window.alert(), window.confirm(), and window.prompt()
 */
export class DLiteModal {
  constructor() {
    this.activeModals = [];
    this._handleKeyDown = this._handleKeyDown.bind(this);
    document.addEventListener('keydown', this._handleKeyDown);
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape' && this.activeModals.length > 0) {
      const topModal = this.activeModals[this.activeModals.length - 1];
      if (topModal && topModal.options.closeOnEscape !== false) {
        this.close(topModal);
      }
    }
  }

  /**
   * Open a custom modal
   * @param {Object} options
   * @param {string} options.title - Modal title
   * @param {string|HTMLElement} options.content - Modal body content
   * @param {Array<Object>} [options.buttons] - Action buttons in footer
   * @param {string} [options.width='480px'] - Custom width
   * @param {boolean} [options.closeOnBackdrop=true] - Close when clicking outside
   * @param {boolean} [options.closeOnEscape=true] - Close on ESC key
   * @returns {Object} Modal instance controller
   */
  open(options = {}) {
    const {
      title = '',
      content = '',
      buttons = [],
      width = '520px',
      closeOnBackdrop = true,
      customClass = ''
    } = options;

    const overlay = document.createElement('div');
    overlay.className = `dlite-modal-overlay ${customClass}`;

    const dialog = document.createElement('div');
    dialog.className = 'dlite-modal-dialog';
    dialog.style.maxWidth = width;

    // Header
    const header = document.createElement('div');
    header.className = 'dlite-modal-header';
    header.innerHTML = `
      <h3 class="dlite-modal-title"></h3>
      <button class="dlite-modal-close" type="button" aria-label="Tutup">${Icons.close}</button>
    `;
    header.querySelector('.dlite-modal-title').textContent = title;

    // Body
    const body = document.createElement('div');
    body.className = 'dlite-modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'dlite-modal-footer';

    const modalObj = { overlay, dialog, options, close: () => this.close(modalObj) };

    if (buttons.length > 0) {
      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dlite-btn dlite-btn-${btn.type || 'secondary'} ${btn.class || ''}`;
        button.textContent = btn.text || 'OK';
        button.addEventListener('click', () => {
          if (btn.onClick) {
            const shouldClose = btn.onClick(modalObj, body);
            if (shouldClose !== false) this.close(modalObj);
          } else {
            this.close(modalObj);
          }
        });
        footer.appendChild(button);
      });
    }

    dialog.appendChild(header);
    dialog.appendChild(body);
    if (buttons.length > 0) {
      dialog.appendChild(footer);
    }
    overlay.appendChild(dialog);

    // Event listeners
    header.querySelector('.dlite-modal-close').addEventListener('click', () => {
      if (options.onClose) options.onClose();
      this.close(modalObj);
    });

    if (closeOnBackdrop) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          if (options.onClose) options.onClose();
          this.close(modalObj);
        }
      });
    }

    document.body.appendChild(overlay);
    this.activeModals.push(modalObj);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('dlite-modal-visible');
      // Focus first input if any
      const input = body.querySelector('input, textarea, select');
      if (input) input.focus();
    });

    return modalObj;
  }

  close(modalObj) {
    if (!modalObj || !modalObj.overlay) return;
    const { overlay } = modalObj;
    overlay.classList.remove('dlite-modal-visible');
    overlay.classList.add('dlite-modal-leaving');

    this.activeModals = this.activeModals.filter(m => m !== modalObj);

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 220);
  }

  /**
   * Modern replacement for window.confirm()
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  confirm({
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    isDestructive = false
  } = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'dlite-confirm-content';
      content.innerHTML = `
        <div class="dlite-confirm-icon ${isDestructive ? 'dlite-confirm-danger' : ''}">
          ${Icons.alertTriangle}
        </div>
        <div class="dlite-confirm-text">
          <p class="dlite-confirm-message"></p>
        </div>
      `;
      content.querySelector('.dlite-confirm-message').textContent = message;

      this.open({
        title,
        content,
        width: '420px',
        closeOnBackdrop: false,
        onClose: () => resolve(false),
        buttons: [
          {
            text: cancelText,
            type: 'secondary',
            onClick: () => {
              resolve(false);
              return true;
            }
          },
          {
            text: confirmText,
            type: isDestructive ? 'danger' : 'primary',
            onClick: () => {
              resolve(true);
              return true;
            }
          }
        ]
      });
    });
  }

  /**
   * Modern replacement for window.prompt()
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  prompt({
    title = 'Input Data',
    message = '',
    defaultValue = '',
    placeholder = 'Masukkan nilai...',
    confirmText = 'Simpan',
    cancelText = 'Batal'
  } = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'dlite-prompt-content';
      content.innerHTML = `
        <p class="dlite-prompt-message"></p>
        <input type="text" class="dlite-input dlite-prompt-input" />
      `;

      const msgEl = content.querySelector('.dlite-prompt-message');
      if (message) {
        msgEl.textContent = message;
      } else {
        msgEl.remove();
      }

      const input = content.querySelector('.dlite-prompt-input');
      input.value = defaultValue;
      input.placeholder = placeholder;

      const modal = this.open({
        title,
        content,
        width: '440px',
        closeOnBackdrop: false,
        onClose: () => resolve(null),
        buttons: [
          {
            text: cancelText,
            type: 'secondary',
            onClick: () => {
              resolve(null);
              return true;
            }
          },
          {
            text: confirmText,
            type: 'primary',
            onClick: () => {
              resolve(input.value);
              return true;
            }
          }
        ]
      });

      // Submit on Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          resolve(input.value);
          this.close(modal);
        }
      });
    });
  }
}

export const modal = new DLiteModal();
