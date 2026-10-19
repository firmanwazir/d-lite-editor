import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';
import { Icons } from '../ui/Icons.js';

/**
 * Table Plugin for D-Lite Editor
 * Interactive grid picker, row/col operations, and table bubble toolbar
 */
export class TablePlugin {
  constructor(editor) {
    this.editor = editor;
    this.activeCell = null;
    this.activeTable = null;
    this.bubble = null;
    this.init();
  }

  init() {
    this._createTableBubble();
    this._initClickWatcher();
  }

  /**
   * Create interactive grid picker dropdown content
   */
  createGridPicker(onSelect) {
    const container = document.createElement('div');
    container.className = 'dlite-table-grid-picker';

    const info = document.createElement('div');
    info.className = 'dlite-table-grid-info';
    info.textContent = '1 x 1';

    const grid = document.createElement('div');
    grid.className = 'dlite-table-grid-cells';

    const maxRows = 6;
    const maxCols = 8;
    const cells = [];

    for (let r = 1; r <= maxRows; r++) {
      for (let c = 1; c <= maxCols; c++) {
        const cell = document.createElement('div');
        cell.className = 'dlite-grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        cell.addEventListener('mouseenter', () => {
          info.textContent = `${c} x ${r} Tabel`;
          cells.forEach(item => {
            const ir = parseInt(item.dataset.row, 10);
            const ic = parseInt(item.dataset.col, 10);
            if (ir <= r && ic <= c) {
              item.classList.add('highlight');
            } else {
              item.classList.remove('highlight');
            }
          });
        });

        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(r, c);
        });

        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    container.appendChild(grid);
    container.appendChild(info);
    return container;
  }

  /**
   * Insert a new table with given rows and columns
   */
  insertTable(rows, cols) {
    const table = document.createElement('table');
    table.className = 'dlite-table';

    // Thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const th = document.createElement('th');
      th.innerHTML = `Header ${c + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '<br>';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Wrap with responsive container
    const wrapper = document.createElement('div');
    wrapper.className = 'dlite-table-responsive';
    wrapper.appendChild(table);

    // Add trailing paragraph so user can continue writing below table
    const p = document.createElement('p');
    p.innerHTML = '<br>';

    this.editor.selection.insertBlockNode(wrapper);
    wrapper.after(p);

    // Focus cursor in first header cell
    const firstTh = table.querySelector('th');
    if (firstTh) {
      const range = document.createRange();
      range.selectNodeContents(firstTh);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      this.editor.selection.save();
    }

    this.editor._onContentChanged();
    this.editor.history.record(true);
    toast.success(`Tabel (${cols}x${rows}) berhasil disisipkan.`);
  }

  _createTableBubble() {
    this.bubble = document.createElement('div');
    this.bubble.className = 'dlite-table-bubble dlite-bubble-hidden';
    this.bubble.innerHTML = `
      <button type="button" class="dlite-bubble-btn" data-action="row-above" title="Tambah Baris di Atas">+ Baris Atas</button>
      <button type="button" class="dlite-bubble-btn" data-action="row-below" title="Tambah Baris di Bawah">+ Baris Bawah</button>
      <button type="button" class="dlite-bubble-btn dlite-bubble-danger" data-action="del-row" title="Hapus Baris Ini">Hapus Baris</button>
      <div class="dlite-bubble-sep"></div>
      <button type="button" class="dlite-bubble-btn" data-action="col-left" title="Tambah Kolom di Kiri">+ Kolom Kiri</button>
      <button type="button" class="dlite-bubble-btn" data-action="col-right" title="Tambah Kolom di Kanan">+ Kolom Kanan</button>
      <button type="button" class="dlite-bubble-btn dlite-bubble-danger" data-action="del-col" title="Hapus Kolom Ini">Hapus Kolom</button>
      <div class="dlite-bubble-sep"></div>
      <button type="button" class="dlite-bubble-btn dlite-bubble-danger" data-action="del-table" title="Hapus Seluruh Tabel">${Icons.trash}</button>
    `;

    document.body.appendChild(this.bubble);

    this.bubble.addEventListener('click', async (e) => {
      const btn = e.target.closest('.dlite-bubble-btn');
      if (!btn || !this.activeCell || !this.activeTable) return;

      const action = btn.dataset.action;
      const row = this.activeCell.closest('tr');
      const cellIndex = this.activeCell.cellIndex;

      switch (action) {
        case 'row-above': {
          const isHeader = row.parentNode.tagName === 'THEAD';
          const newRow = this._cloneRow(row, isHeader);
          row.parentNode.insertBefore(newRow, row);
          break;
        }
        case 'row-below': {
          if (row.parentNode.tagName === 'THEAD') {
            let tbody = this.activeTable.querySelector('tbody');
            if (!tbody) {
              tbody = document.createElement('tbody');
              this.activeTable.appendChild(tbody);
            }
            const newRow = this._cloneRow(row, false);
            tbody.insertBefore(newRow, tbody.firstChild);
          } else {
            const newRow = this._cloneRow(row, false);
            row.parentNode.insertBefore(newRow, row.nextSibling);
          }
          break;
        }
        case 'del-row': {
          if (this.activeTable.querySelectorAll('tr').length <= 1) {
            toast.warning('Tabel harus memiliki minimal 1 baris.');
            return;
          }
          row.remove();
          this.hideBubble();
          break;
        }
        case 'col-left': {
          Array.from(this.activeTable.querySelectorAll('tr')).forEach(tr => {
            const isHeader = tr.parentNode.tagName === 'THEAD';
            const cell = isHeader ? document.createElement('th') : document.createElement('td');
            cell.innerHTML = '<br>';
            tr.insertBefore(cell, tr.children[cellIndex]);
          });
          break;
        }
        case 'col-right': {
          Array.from(this.activeTable.querySelectorAll('tr')).forEach(tr => {
            const isHeader = tr.parentNode.tagName === 'THEAD';
            const cell = isHeader ? document.createElement('th') : document.createElement('td');
            cell.innerHTML = '<br>';
            tr.insertBefore(cell, tr.children[cellIndex]?.nextSibling);
          });
          break;
        }
        case 'del-col': {
          if (row.children.length <= 1) {
            toast.warning('Tabel harus memiliki minimal 1 kolom.');
            return;
          }
          Array.from(this.activeTable.querySelectorAll('tr')).forEach(tr => {
            if (tr.children[cellIndex]) tr.children[cellIndex].remove();
          });
          this.hideBubble();
          break;
        }
        case 'del-table': {
          const confirmed = await modal.confirm({
            title: 'Hapus Tabel',
            message: 'Apakah Anda yakin ingin menghapus seluruh tabel ini beserta isinya?',
            confirmText: 'Hapus Tabel',
            isDestructive: true
          });
          if (confirmed) {
            const wrapper = this.activeTable.closest('.dlite-table-responsive') || this.activeTable;
            wrapper.remove();
            this.hideBubble();
            toast.info('Tabel telah dihapus.');
          }
          break;
        }
      }

      this.editor._onContentChanged();
      this.editor.history.record(true);
      if (this.activeCell) this.positionBubble();
    });
  }

  _cloneRow(row, isHeader = false) {
    const newRow = document.createElement('tr');
    Array.from(row.children).forEach(() => {
      const cell = isHeader ? document.createElement('th') : document.createElement('td');
      cell.innerHTML = '<br>';
      newRow.appendChild(cell);
    });
    return newRow;
  }

  _initClickWatcher() {
    this._onClick = (e) => {
      const cell = e.target.closest('td, th');
      if (cell && this.editor.canvas.contains(cell)) {
        this.activeCell = cell;
        this.activeTable = cell.closest('table');
        this.showBubble();
      } else {
        this.hideBubble();
      }
    };
    this.editor.canvas.addEventListener('click', this._onClick);

    this._onResize = () => {
      if (this.activeCell) this.positionBubble();
    };
    window.addEventListener('resize', this._onResize);

    this._onScroll = () => {
      if (this.activeCell) this.positionBubble();
    };
    document.addEventListener('scroll', this._onScroll, true);
  }

  showBubble() {
    this.bubble.classList.remove('dlite-bubble-hidden');
    this.positionBubble();
  }

  hideBubble() {
    this.activeCell = null;
    this.activeTable = null;
    this.bubble.classList.add('dlite-bubble-hidden');
  }

  positionBubble() {
    if (!this.activeCell || !this.activeTable) return;
    const tableRect = this.activeTable.getBoundingClientRect();
    const bubbleRect = this.bubble.getBoundingClientRect();

    let top = tableRect.top - bubbleRect.height - 8;
    let left = tableRect.left + (tableRect.width / 2) - (bubbleRect.width / 2);

    if (top < 10) top = tableRect.bottom + 8;
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
