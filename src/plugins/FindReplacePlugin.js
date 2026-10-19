import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';

/**
 * FindReplacePlugin for D-Lite Editor
 * Find & Replace with case-sensitivity and replace-all capabilities
 */
export class FindReplacePlugin {
  constructor(editor) {
    this.editor = editor;
  }

  openModal() {
    const content = document.createElement('div');
    content.className = 'dlite-find-replace-modal';
    content.innerHTML = `
      <div class="dlite-form-group">
        <label class="dlite-label">Cari Teks</label>
        <input type="text" id="dlite-find-input" class="dlite-input" placeholder="Masukkan kata yang ingin dicari..." />
      </div>
      <div class="dlite-form-group">
        <label class="dlite-label">Ganti Dengan</label>
        <input type="text" id="dlite-replace-input" class="dlite-input" placeholder="Teks pengganti..." />
      </div>
      <div class="dlite-form-checkbox">
        <label class="dlite-checkbox-label">
          <input type="checkbox" id="dlite-match-case" />
          Cocokkan huruf besar/kecil (Match case)
        </label>
      </div>
    `;

    modal.open({
      title: 'Cari dan Ganti Teks',
      content,
      width: '460px',
      buttons: [
        { text: 'Tutup', type: 'secondary' },
        {
          text: 'Ganti Semua',
          type: 'primary',
          onClick: () => {
            const findTerm = content.querySelector('#dlite-find-input').value;
            const replaceTerm = content.querySelector('#dlite-replace-input').value;
            const matchCase = content.querySelector('#dlite-match-case').checked;

            if (!findTerm) {
              toast.warning('Silakan masukkan kata yang ingin dicari.');
              return false;
            }

            const count = this.replaceAll(findTerm, replaceTerm, matchCase);
            if (count > 0) {
              toast.success(`${count} kata "${findTerm}" berhasil diganti.`);
              return true;
            } else {
              toast.info(`Kata "${findTerm}" tidak ditemukan.`);
              return false;
            }
          }
        }
      ]
    });
  }

  replaceAll(findText, replaceText, matchCase = false) {
    const canvas = this.editor.canvas;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(this._escapeRegExp(findText), flags);

    let matchCount = 0;

    // Helper to replace only text inside text nodes (not inside tags or attributes)
    const walkTextNodes = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue;
        if (!val) return;
        const matches = val.match(regex);
        if (matches) {
          matchCount += matches.length;
          node.nodeValue = val.replace(regex, replaceText);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
        node.childNodes.forEach(child => walkTextNodes(child));
      }
    };

    walkTextNodes(canvas);

    if (matchCount > 0) {
      this.editor._onContentChanged();
      this.editor.history.record(true);
    }

    return matchCount;
  }

  _escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
