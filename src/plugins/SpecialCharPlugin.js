import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';

/**
 * SpecialCharPlugin for D-Lite Editor
 * Emojis, math symbols, currency, and typography character picker
 */
export class SpecialCharPlugin {
  constructor(editor) {
    this.editor = editor;
  }

  openModal() {
    this.editor.selection.save();

    const emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😜','😎','🤩','🥳','😏','🤔','🤫','🤭','🤗','🤝','👍','👎','👏','🙌','🙏','💪','🔥','✨','🎉','🚀','💡','⭐','❤️','💯','✅','❌','⚠️','☕','🏆','💻','📱'];
    const symbols = ['©','®','™','€','$','£','¥','₽','₩','¢','§','¶','±','×','÷','≠','≈','≤','≥','∞','√','π','µ','Ω','∆','∑','∫','‰','°','℃','℉'];
    const arrows = ['←','→','↑','↓','↔','↕','↵','⇒','⇐','⇑','⇓','⇔','➔','«','»','—','–','•','…','‹','›','“','”','‘','’'];

    const content = document.createElement('div');
    content.className = 'dlite-special-char-modal';
    content.innerHTML = `
      <div class="dlite-tabs">
        <button class="dlite-tab-btn active" data-tab="emoji" type="button">Emoji</button>
        <button class="dlite-tab-btn" data-tab="symbols" type="button">Simbol & Mata Uang</button>
        <button class="dlite-tab-btn" data-tab="arrows" type="button">Panah & Tipografi</button>
      </div>

      <div class="dlite-tab-pane active" id="tab-emoji">
        <div class="dlite-char-grid" id="grid-emoji"></div>
      </div>
      <div class="dlite-tab-pane" id="tab-symbols">
        <div class="dlite-char-grid" id="grid-symbols"></div>
      </div>
      <div class="dlite-tab-pane" id="tab-arrows">
        <div class="dlite-char-grid" id="grid-arrows"></div>
      </div>
    `;

    // Tab switching
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

    const modalInstance = modal.open({
      title: 'Karakter Khusus & Emoji',
      content,
      width: '500px',
      buttons: [
        { text: 'Selesai', type: 'primary' }
      ]
    });

    const renderGrid = (containerId, list) => {
      const container = content.querySelector(containerId);
      list.forEach(char => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dlite-char-btn';
        btn.textContent = char;
        btn.title = char;
        btn.addEventListener('click', () => {
          this.editor.selection.restore();
          this.editor.selection.insertText(char);
          this.editor._onContentChanged();
          this.editor.history.record();
          toast.success(`Karakter "${char}" disisipkan.`);
          modalInstance.close();
        });
        container.appendChild(btn);
      });
    };

    renderGrid('#grid-emoji', emojis);
    renderGrid('#grid-symbols', symbols);
    renderGrid('#grid-arrows', arrows);
  }
}
