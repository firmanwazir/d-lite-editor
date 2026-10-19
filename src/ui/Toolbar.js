import { Icons } from './Icons.js';

/**
 * Toolbar Component for D-Lite Editor
 * Enterprise-grade multi-tier toolbar with Menubar and comprehensive editing controls
 */
export class Toolbar {
  constructor(editor) {
    this.editor = editor;
    this.el = null;
    this.activeDropdown = null;
    this.init();
  }

  init() {
    this.el = document.createElement('div');
    this.el.className = 'dlite-toolbar-wrapper';
    this.render();
    this.editor.container.insertBefore(this.el, this.editor.container.firstChild);

    // Crucial: prevent toolbar interactions from stealing focus from canvas!
    this.el.addEventListener('mousedown', (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
      if (!isInput) {
        e.preventDefault();
        this.editor.selection.save();
      }
    });

    // Global click to close dropdowns
    this._onDocClick = (e) => {
      if (!this.el.contains(e.target)) {
        this.closeAllDropdowns();
      }
    };
    document.addEventListener('click', this._onDocClick);

    // Update active states on selection changes
    this._onSelectionChange = () => {
      if (document.activeElement === this.editor.canvas) {
        this.updateActiveStates();
      }
    };
    document.addEventListener('selectionchange', this._onSelectionChange);
  }

  render() {
    this.el.innerHTML = `
      <!-- Menubar -->
      <div class="dlite-menubar">
        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Berkas</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="clearCanvas">Dokumen Baru / Kosongkan</button>
            <button type="button" class="dlite-menu-action" data-action="preview">Pratinjau Dokumen (Preview)</button>
            <div class="dlite-menu-divider"></div>
            <button type="button" class="dlite-menu-action" data-action="print">Cetak (Ctrl+P)</button>
          </div>
        </div>

        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Edit</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="undo">Urungkan (Ctrl+Z)</button>
            <button type="button" class="dlite-menu-action" data-action="redo">Ulangi (Ctrl+Y)</button>
            <div class="dlite-menu-divider"></div>
            <button type="button" class="dlite-menu-action" data-action="selectAll">Pilih Semua (Ctrl+A)</button>
            <button type="button" class="dlite-menu-action" data-action="findReplace">Cari dan Ganti... (Ctrl+F)</button>
          </div>
        </div>

        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Lihat</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="preview">Pratinjau Dokumen</button>
            <button type="button" class="dlite-menu-action" data-action="sourceCode">Kode Sumber (HTML)</button>
            <button type="button" class="dlite-menu-action" data-action="fullscreen">Layar Penuh (Zen Mode)</button>
          </div>
        </div>

        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Sisipkan</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="image">Gambar (Upload / URL)</button>
            <button type="button" class="dlite-menu-action" data-action="file">Lampiran Berkas (PDF, Dokumen)</button>
            <button type="button" class="dlite-menu-action" data-action="video">Video & Media Embed</button>
            <button type="button" class="dlite-menu-action" data-action="link">Tautan (Link, Ctrl+K)</button>
            <button type="button" class="dlite-menu-action" data-action="unlink">Hapus / Lepas Tautan</button>
            <button type="button" class="dlite-menu-action" data-action="specialChar">Karakter Khusus & Emoji</button>
            <button type="button" class="dlite-menu-action" data-action="dateTime">Tanggal & Waktu Saat Ini</button>
            <div class="dlite-menu-divider"></div>
            <button type="button" class="dlite-menu-action" data-action="blockquote">Kutipan (Blockquote)</button>
            <button type="button" class="dlite-menu-action" data-action="codeBlock">Blok Kode</button>
            <button type="button" class="dlite-menu-action" data-action="hr">Garis Pemisah Horizontal</button>
            <button type="button" class="dlite-menu-action" data-action="pageBreak">Pemisah Halaman (Page Break)</button>
          </div>
        </div>

        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Format</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="bold">Tebal (Ctrl+B)</button>
            <button type="button" class="dlite-menu-action" data-action="italic">Miring (Ctrl+I)</button>
            <button type="button" class="dlite-menu-action" data-action="underline">Garis Bawah (Ctrl+U)</button>
            <button type="button" class="dlite-menu-action" data-action="strike">Coret (Strikethrough)</button>
            <button type="button" class="dlite-menu-action" data-action="subscript">Subskrip (X₂)</button>
            <button type="button" class="dlite-menu-action" data-action="superscript">Superskrip (X²)</button>
            <div class="dlite-menu-divider"></div>
            <button type="button" class="dlite-menu-action" data-action="blockquote">Blok Kutipan (Blockquote)</button>
            <button type="button" class="dlite-menu-action" data-action="clearFormat">Hapus Semua Format</button>
          </div>
        </div>

        <div class="dlite-menu-item">
          <button type="button" class="dlite-menu-trigger">Bantuan</button>
          <div class="dlite-menu-dropdown">
            <button type="button" class="dlite-menu-action" data-action="help">Pintasan Keyboard & Panduan (Ctrl+/)</button>
          </div>
        </div>
      </div>

      <!-- Main Toolbar Row 1: Typography & Formatting -->
      <div class="dlite-toolbar-row">
        <!-- History & Utilities -->
        <div class="dlite-toolbar-group">
          <button type="button" class="dlite-tb-btn" data-action="undo" title="Urungkan (Ctrl+Z)">${Icons.undo}</button>
          <button type="button" class="dlite-tb-btn" data-action="redo" title="Ulangi (Ctrl+Y)">${Icons.redo}</button>
          <button type="button" class="dlite-tb-btn" data-action="clearCanvas" title="Dokumen Baru / Kosongkan Kanvas">${Icons.trash}</button>
          <button type="button" class="dlite-tb-btn" data-action="print" title="Cetak Dokumen (Ctrl+P)">${Icons.print}</button>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Headings / Blocks -->
        <div class="dlite-toolbar-group">
          <div class="dlite-dropdown" id="dd-block">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Struktur Paragraf / Heading">
              <span class="dlite-dd-label">Paragraf</span>
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu">
              <button type="button" class="dlite-dd-item" data-block="p">Paragraf Normal</button>
              <button type="button" class="dlite-dd-item dlite-h1-item" data-block="h1">Heading 1</button>
              <button type="button" class="dlite-dd-item dlite-h2-item" data-block="h2">Heading 2</button>
              <button type="button" class="dlite-dd-item dlite-h3-item" data-block="h3">Heading 3</button>
              <button type="button" class="dlite-dd-item dlite-h4-item" data-block="h4">Heading 4</button>
              <button type="button" class="dlite-dd-item" data-block="blockquote">Blok Kutipan</button>
            </div>
          </div>
        </div>

        <!-- Font Family Dropdown -->
        <div class="dlite-toolbar-group">
          <div class="dlite-dropdown" id="dd-fontfamily">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Jenis Font">
              <span class="dlite-dd-font-label">Inter</span>
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-font-menu">
              <button type="button" class="dlite-dd-item" data-font="Inter" style="font-family: 'Inter', sans-serif">Inter (Default)</button>
              <button type="button" class="dlite-dd-item" data-font="Arial" style="font-family: Arial, sans-serif">Arial</button>
              <button type="button" class="dlite-dd-item" data-font="Roboto" style="font-family: 'Roboto', sans-serif">Roboto</button>
              <button type="button" class="dlite-dd-item" data-font="Georgia" style="font-family: Georgia, serif">Georgia</button>
              <button type="button" class="dlite-dd-item" data-font="'Times New Roman'" style="font-family: 'Times New Roman', serif">Times New Roman</button>
              <button type="button" class="dlite-dd-item" data-font="'Courier New'" style="font-family: 'Courier New', monospace">Courier New</button>
              <button type="button" class="dlite-dd-item" data-font="Verdana" style="font-family: Verdana, sans-serif">Verdana</button>
              <button type="button" class="dlite-dd-item" data-font="'JetBrains Mono'" style="font-family: 'JetBrains Mono', monospace">JetBrains Mono</button>
            </div>
          </div>
        </div>

        <!-- Font Size Dropdown -->
        <div class="dlite-toolbar-group">
          <div class="dlite-dropdown" id="dd-fontsize">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Ukuran Font">
              <span class="dlite-dd-size-label">16px</span>
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-size-menu">
              <button type="button" class="dlite-dd-item" data-size="11px">11px</button>
              <button type="button" class="dlite-dd-item" data-size="12px">12px</button>
              <button type="button" class="dlite-dd-item" data-size="14px">14px</button>
              <button type="button" class="dlite-dd-item" data-size="16px">16px (Normal)</button>
              <button type="button" class="dlite-dd-item" data-size="18px">18px</button>
              <button type="button" class="dlite-dd-item" data-size="20px">20px</button>
              <button type="button" class="dlite-dd-item" data-size="24px">24px</button>
              <button type="button" class="dlite-dd-item" data-size="28px">28px</button>
              <button type="button" class="dlite-dd-item" data-size="32px">32px</button>
              <button type="button" class="dlite-dd-item" data-size="36px">36px</button>
            </div>
          </div>
        </div>

        <!-- Line Height Dropdown -->
        <div class="dlite-toolbar-group">
          <div class="dlite-dropdown" id="dd-lineheight">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Jarak Spasi Baris (Line Height)">
              ${Icons.lineHeight}
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-size-menu">
              <button type="button" class="dlite-dd-item" data-lineheight="1.0">1.0 (Rapat)</button>
              <button type="button" class="dlite-dd-item" data-lineheight="1.25">1.25</button>
              <button type="button" class="dlite-dd-item" data-lineheight="1.5">1.5</button>
              <button type="button" class="dlite-dd-item" data-lineheight="1.75">1.75 (Standar)</button>
              <button type="button" class="dlite-dd-item" data-lineheight="2.0">2.0 (Ganda)</button>
              <button type="button" class="dlite-dd-item" data-lineheight="2.5">2.5 (Lebar)</button>
            </div>
          </div>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Basic Styling -->
        <div class="dlite-toolbar-group">
          <button type="button" class="dlite-tb-btn" data-action="bold" title="Tebal (Ctrl+B)">${Icons.bold}</button>
          <button type="button" class="dlite-tb-btn" data-action="italic" title="Miring (Ctrl+I)">${Icons.italic}</button>
          <button type="button" class="dlite-tb-btn" data-action="underline" title="Garis Bawah (Ctrl+U)">${Icons.underline}</button>
          <button type="button" class="dlite-tb-btn" data-action="strike" title="Coret (Strikethrough)">${Icons.strikethrough}</button>
          <button type="button" class="dlite-tb-btn" data-action="subscript" title="Subskrip (X₂)">${Icons.subscript}</button>
          <button type="button" class="dlite-tb-btn" data-action="superscript" title="Superskrip (X²)">${Icons.superscript}</button>
          <button type="button" class="dlite-tb-btn" data-action="inlineCode" title="Inline Code">${Icons.code}</button>
          <button type="button" class="dlite-tb-btn" data-action="clearFormat" title="Hapus Format">${Icons.clearFormat}</button>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Colors -->
        <div class="dlite-toolbar-group">
          <div class="dlite-dropdown" id="dd-textcolor">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Warna Teks">
              ${Icons.textColor}
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-color-palette" data-color-type="text"></div>
          </div>

          <div class="dlite-dropdown" id="dd-bgcolor">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Warna Sorotan (Highlight)">
              ${Icons.bgColor}
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-color-palette" data-color-type="bg"></div>
          </div>
        </div>
      </div>

      <!-- Main Toolbar Row 2: Alignment, Lists, Inserts & Tools -->
      <div class="dlite-toolbar-row dlite-toolbar-row-sub">
        <!-- Alignment & Indent -->
        <div class="dlite-toolbar-group">
          <button type="button" class="dlite-tb-btn" data-align="left" title="Rata Kiri">${Icons.alignLeft}</button>
          <button type="button" class="dlite-tb-btn" data-align="center" title="Rata Tengah">${Icons.alignCenter}</button>
          <button type="button" class="dlite-tb-btn" data-align="right" title="Rata Kanan">${Icons.alignRight}</button>
          <button type="button" class="dlite-tb-btn" data-align="justify" title="Rata Kanan Kiri">${Icons.alignJustify}</button>
          <button type="button" class="dlite-tb-btn" data-action="outdent" title="Geser Keluar (Outdent / Shift+Tab)">${Icons.outdent}</button>
          <button type="button" class="dlite-tb-btn" data-action="indent" title="Geser Masuk (Indent / Tab)">${Icons.indent}</button>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Lists & Quotes -->
        <div class="dlite-toolbar-group">
          <button type="button" class="dlite-tb-btn" data-action="bulletList" title="Daftar Poin">${Icons.bulletList}</button>
          <button type="button" class="dlite-tb-btn" data-action="numberedList" title="Daftar Nomor">${Icons.numberedList}</button>
          <button type="button" class="dlite-tb-btn" data-action="taskList" title="Daftar Tugas / Checklist">${Icons.taskList}</button>
          <button type="button" class="dlite-tb-btn" data-action="blockquote" title="Kutipan (Blockquote)">${Icons.quote}</button>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Media & Elements -->
        <div class="dlite-toolbar-group">
          <button type="button" class="dlite-tb-btn" data-action="link" title="Sisipkan Tautan (Ctrl+K)">${Icons.link}</button>
          <button type="button" class="dlite-tb-btn" data-action="unlink" title="Hapus / Lepas Tautan">${Icons.unlink}</button>
          <button type="button" class="dlite-tb-btn" data-action="image" title="Sisipkan Gambar (Upload / URL)">${Icons.image}</button>
          <button type="button" class="dlite-tb-btn" data-action="file" title="Sisipkan Berkas Dokumen">${Icons.file}</button>
          <button type="button" class="dlite-tb-btn" data-action="video" title="Sisipkan Video (YouTube, Vimeo, Embed)">${Icons.video}</button>
          
          <div class="dlite-dropdown" id="dd-table">
            <button type="button" class="dlite-dropdown-btn" data-toggle="dropdown" title="Sisipkan Tabel">
              ${Icons.table}
              ${Icons.chevronDown}
            </button>
            <div class="dlite-dropdown-menu dlite-table-menu" id="dlite-table-menu-container"></div>
          </div>

          <button type="button" class="dlite-tb-btn" data-action="codeBlock" title="Blok Kode">${Icons.codeBlock}</button>
          <button type="button" class="dlite-tb-btn" data-action="hr" title="Garis Pemisah">${Icons.hr}</button>
          <button type="button" class="dlite-tb-btn" data-action="pageBreak" title="Pemisah Halaman Cetak (Page Break)">${Icons.pageBreak}</button>
          <button type="button" class="dlite-tb-btn" data-action="dateTime" title="Sisipkan Tanggal & Waktu">${Icons.dateTime}</button>
          <button type="button" class="dlite-tb-btn" data-action="specialChar" title="Karakter Khusus & Emoji">${Icons.specialChar}</button>
        </div>
        <div class="dlite-tb-sep"></div>

        <!-- Utilities & View Mode -->
        <div class="dlite-toolbar-group dlite-tb-end">
          <button type="button" class="dlite-tb-btn" data-action="findReplace" title="Cari & Ganti Teks (Ctrl+F)">${Icons.search}</button>
          <button type="button" class="dlite-tb-btn" data-action="selectAll" title="Pilih Semua (Ctrl+A)">${Icons.selectAll}</button>
          <button type="button" class="dlite-tb-btn" data-action="preview" title="Pratinjau Dokumen">${Icons.preview}</button>
          <button type="button" class="dlite-tb-btn" data-action="help" title="Bantuan & Pintasan Keyboard (Ctrl+/)">${Icons.help}</button>
          <button type="button" class="dlite-tb-btn" data-action="sourceCode" title="Kode Sumber HTML">${Icons.sourceCode}</button>
          <button type="button" class="dlite-tb-btn" data-action="fullscreen" title="Layar Penuh (Zen Mode)">${Icons.fullscreen}</button>
        </div>
      </div>
    `;

    this._setupColorPalettes();
    this._setupTablePicker();
    this._bindEvents();
  }

  _setupColorPalettes() {
    const modernColors = [
      '#000000', '#374151', '#6b7280', '#9ca3af', '#ef4444', '#f97316',
      '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
      '#ec4899', '#fee2e2', '#fef3c7', '#d1fae5', '#e0f2fe', '#ede9fe'
    ];

    this.el.querySelectorAll('.dlite-color-palette').forEach(palette => {
      const isBg = palette.dataset.colorType === 'bg';
      palette.innerHTML = '';
      
      // Top Clear / Transparent action button
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'dlite-color-clear-btn';
      clearBtn.innerHTML = isBg ? '🚫 Tanpa Sorotan (Transparan)' : '⚡ Warna Otomatis / Bawaan';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isBg) {
          this.editor.plugins.formatting.removeBgColor();
        } else {
          this.editor.plugins.formatting.textColor('inherit');
        }
        this.closeAllDropdowns();
      });
      palette.appendChild(clearBtn);

      const grid = document.createElement('div');
      grid.className = 'dlite-palette-grid';

      modernColors.forEach(color => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'dlite-color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isBg) {
            this.editor.plugins.formatting.bgColor(color);
          } else {
            this.editor.plugins.formatting.textColor(color);
          }
          this.closeAllDropdowns();
        });
        grid.appendChild(swatch);
      });

      palette.appendChild(grid);
    });
  }

  _setupTablePicker() {
    const tableContainer = this.el.querySelector('#dlite-table-menu-container');
    if (tableContainer) {
      const picker = this.editor.plugins.table.createGridPicker((rows, cols) => {
        this.closeAllDropdowns();
        this.editor.plugins.table.insertTable(rows, cols);
      });
      tableContainer.appendChild(picker);
    }
  }

  _bindEvents() {
    // Menubar triggers
    this.el.querySelectorAll('.dlite-menu-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = trigger.closest('.dlite-menu-item');
        const isOpen = parent.classList.contains('dlite-open');
        this.closeAllDropdowns();
        if (!isOpen) {
          parent.classList.add('dlite-open');
        }
      });
    });

    // Menubar action clicks
    this.el.querySelectorAll('.dlite-menu-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        const action = btn.dataset.action;
        this._handleAction(action);
      });
    });

    // Dropdown toggles
    this.el.querySelectorAll('[data-toggle="dropdown"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = btn.closest('.dlite-dropdown');
        const isOpen = dd.classList.contains('dlite-open');
        this.closeAllDropdowns();
        if (!isOpen) {
          dd.classList.add('dlite-open');
          this.activeDropdown = dd;
        }
      });
    });

    // Block elements selection
    this.el.querySelectorAll('[data-block]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const block = item.dataset.block;
        this.editor.plugins.formatting.formatBlock(block);
        const label = this.el.querySelector('#dd-block .dlite-dd-label');
        if (label) label.textContent = item.textContent;
        this.closeAllDropdowns();
      });
    });

    // Font Family selection
    this.el.querySelectorAll('[data-font]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const font = item.dataset.font;
        this.editor.plugins.formatting.fontFamily(font);
        const label = this.el.querySelector('.dlite-dd-font-label');
        if (label) label.textContent = font.replace(/['"]/g, '');
        this.closeAllDropdowns();
      });
    });

    // Font Size selection
    this.el.querySelectorAll('[data-size]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const size = item.dataset.size;
        this.editor.plugins.formatting.fontSize(size);
        const label = this.el.querySelector('.dlite-dd-size-label');
        if (label) label.textContent = size;
        this.closeAllDropdowns();
      });
    });

    // Line Height selection
    this.el.querySelectorAll('[data-lineheight]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const lh = item.dataset.lineheight;
        this.editor.plugins.formatting.lineHeight(lh);
        this.closeAllDropdowns();
      });
    });

    // Alignment buttons
    this.el.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editor.plugins.formatting.align(btn.dataset.align);
      });
    });

    // Action buttons
    this.el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this._handleAction(action);
      });
    });
  }

  _handleAction(action) {
    if (this.editor.plugins.code?.isSourceMode && action !== 'sourceCode' && action !== 'fullscreen') {
      toast.warning('Nonaktifkan mode kode sumber (HTML) untuk menggunakan fitur ini.');
      return;
    }

    switch (action) {
      case 'undo': this.editor.history.undo(); break;
      case 'redo': this.editor.history.redo(); break;
      case 'clearCanvas': this.editor.clear(); break;
      case 'print': this.editor.plugins.formatting.print(); break;
      case 'preview': this.editor.preview(); break;
      case 'bold': this.editor.plugins.formatting.bold(); break;
      case 'italic': this.editor.plugins.formatting.italic(); break;
      case 'underline': this.editor.plugins.formatting.underline(); break;
      case 'strike': this.editor.plugins.formatting.strike(); break;
      case 'subscript': this.editor.plugins.formatting.subscript(); break;
      case 'superscript': this.editor.plugins.formatting.superscript(); break;
      case 'inlineCode': this.editor.plugins.formatting.inlineCode(); break;
      case 'clearFormat': this.editor.plugins.formatting.clearFormat(); break;
      case 'outdent': this.editor.plugins.formatting.outdent(); break;
      case 'indent': this.editor.plugins.formatting.indent(); break;
      case 'bulletList': this.editor.plugins.formatting.bulletList(); break;
      case 'numberedList': this.editor.plugins.formatting.numberedList(); break;
      case 'taskList': this.editor.plugins.formatting.taskList(); break;
      case 'blockquote': this.editor.plugins.formatting.blockquote(); break;
      case 'link': this.editor.plugins.link.openModal(); break;
      case 'unlink': this.editor.plugins.link.unlink(); break;
      case 'image': this.editor.plugins.image.openModal(); break;
      case 'file': this.editor.plugins.file.openModal(); break;
      case 'video': this.editor.plugins.mediaEmbed?.openModal(); break;
      case 'codeBlock': this.editor.plugins.code.insertCodeBlock(); break;
      case 'hr': this.editor.plugins.formatting.horizontalRule(); break;
      case 'pageBreak': this.editor.plugins.formatting.pageBreak(); break;
      case 'dateTime': this.editor.plugins.formatting.insertDateTime(); break;
      case 'specialChar': this.editor.plugins.specialChar?.openModal(); break;
      case 'findReplace': this.editor.plugins.findReplace?.openModal(); break;
      case 'selectAll': this.editor.plugins.formatting.selectAll(); break;
      case 'help': this.editor.openHelpModal(); break;
      case 'sourceCode': this.editor.plugins.code.toggleSourceMode(); break;
      case 'fullscreen': this.editor.toggleFullscreen(); break;
    }
  }

  updateActiveStates() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      this._doUpdateActiveStates();
    });
  }

  _doUpdateActiveStates() {
    const checkState = (action, state) => {
      const btn = this.el.querySelector(`[data-action="${action}"]`);
      if (btn) {
        btn.classList.toggle('dlite-active', !!state);
      }
    };

    // Standard inline & list commands
    checkState('bold', this.editor.selection.isFormatActive('bold'));
    checkState('italic', this.editor.selection.isFormatActive('italic'));
    checkState('underline', this.editor.selection.isFormatActive('underline'));
    checkState('strike', this.editor.selection.isFormatActive('strikeThrough'));
    checkState('subscript', document.queryCommandState('subscript'));
    checkState('superscript', document.queryCommandState('superscript'));
    checkState('bulletList', this.editor.selection.isFormatActive('insertUnorderedList'));
    checkState('numberedList', this.editor.selection.isFormatActive('insertOrderedList'));

    // Custom blocks & links
    checkState('blockquote', !!this.editor.selection.getClosest('blockquote'));
    checkState('inlineCode', !!this.editor.selection.getClosest('code.dlite-inline-code'));
    checkState('codeBlock', !!this.editor.selection.getClosest('pre.dlite-code-block'));
    checkState('link', !!this.editor.selection.getClosest('a'));
    checkState('unlink', !!this.editor.selection.getClosest('a'));

    // Alignments
    const alignMap = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull'
    };
    this.el.querySelectorAll('[data-align]').forEach(btn => {
      const cmd = alignMap[btn.dataset.align];
      if (cmd) {
        btn.classList.toggle('dlite-active', document.queryCommandState(cmd));
      }
    });

    // Paragraph / Heading dropdown label
    const blockLabel = this.el.querySelector('#dd-block .dlite-dd-label');
    if (blockLabel) {
      if (this.editor.selection.getClosest('h1')) blockLabel.textContent = 'Heading 1';
      else if (this.editor.selection.getClosest('h2')) blockLabel.textContent = 'Heading 2';
      else if (this.editor.selection.getClosest('h3')) blockLabel.textContent = 'Heading 3';
      else if (this.editor.selection.getClosest('h4')) blockLabel.textContent = 'Heading 4';
      else if (this.editor.selection.getClosest('blockquote')) blockLabel.textContent = 'Blok Kutipan';
      else blockLabel.textContent = 'Paragraf';
    }
  }

  updateSourceButton(isSource) {
    const btn = this.el.querySelector('[data-action="sourceCode"]');
    if (btn) btn.classList.toggle('dlite-active', isSource);
  }

  closeAllDropdowns() {
    this.el.querySelectorAll('.dlite-dropdown').forEach(dd => dd.classList.remove('dlite-open'));
    this.el.querySelectorAll('.dlite-menu-item').forEach(m => m.classList.remove('dlite-open'));
    this.activeDropdown = null;
  }

  destroy() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('selectionchange', this._onSelectionChange);
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
