/**
 * Selection & Range Helper for D-Lite Editor
 * Manages caret position, saving/restoring selection, and block/inline node insertion
 */
export class SelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.savedRange = null;
  }

  /**
   * Get the current DOM Selection
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Get the current Range inside the editor
   */
  getRange() {
    const sel = this.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    // Ensure the range is inside the editor canvas
    if (this.editor.canvas && (this.editor.canvas.contains(range.commonAncestorContainer) || this.editor.canvas === range.commonAncestorContainer)) {
      return range;
    }
    return null;
  }

  /**
   * Save the current selection range so it can be restored after modal or toolbar click
   */
  save() {
    const range = this.getRange();
    if (range) {
      this.savedRange = range.cloneRange();
    }
    return this.savedRange;
  }

  /**
   * Restore the previously saved selection range
   */
  restore() {
    if (!this.savedRange) return;
    const sel = this.getSelection();
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
  }

  /**
   * Check if there is currently text selected
   */
  hasSelection() {
    const range = this.getRange();
    return range && !range.collapsed && range.toString().trim().length > 0;
  }

  /**
   * Insert plain text at current caret safely without HTML entity corruption
   * @param {string} text
   */
  insertText(text) {
    const textNode = document.createTextNode(text);
    this.insertNode(textNode);
  }

  /**
   * Insert a standard inline DOM node at current caret
   * @param {Node} node 
   */
  insertNode(node) {
    if (this.savedRange) {
      this.restore();
    }
    let range = this.getRange();
    if (!range) {
      this.editor.canvas.focus();
      range = this.getRange();
    }
    if (!range) {
      this.editor.canvas.appendChild(node);
      return;
    }

    range.deleteContents();
    range.insertNode(node);

    // Move cursor right after the inserted node
    const newRange = document.createRange();
    newRange.setStartAfter(node);
    newRange.collapse(true);
    const sel = this.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
    this.save();
  }

  /**
   * Insert a block-level DOM node (e.g., Table, Tasklist, HR, Figure)
   * Prevents invalid HTML nesting inside <p> and prevents jumping to the top of canvas!
   * @param {Node} node 
   */
  insertBlockNode(node) {
    if (this.savedRange) {
      this.restore();
    }
    let range = this.getRange();
    if (!range) {
      this.editor.canvas.focus();
      range = this.getRange();
    }
    if (!range) {
      this.editor.canvas.appendChild(node);
      return;
    }

    // Find the enclosing block element
    let currentBlock = this.getClosest('p, h1, h2, h3, h4, h5, h6, blockquote, .dlite-task-item, .dlite-table-responsive');

    if (currentBlock && currentBlock !== this.editor.canvas) {
      const text = currentBlock.textContent.trim();
      const isEmpty = !text || currentBlock.innerHTML === '<br>';

      if (isEmpty) {
        // If the current block is empty, replace it directly!
        currentBlock.replaceWith(node);
      } else {
        // If cursor is at the very beginning of the block
        if (range.startOffset === 0 && range.collapsed) {
          currentBlock.parentNode.insertBefore(node, currentBlock);
        } else {
          // Insert right after current block
          currentBlock.parentNode.insertBefore(node, currentBlock.nextSibling);
        }
      }
    } else {
      // Append right at current range or canvas end
      range.deleteContents();
      range.insertNode(node);
    }

    this.save();
  }

  /**
   * Insert HTML string at the current cursor
   * @param {string} html 
   */
  insertHTML(html) {
    const fragment = document.createRange().createContextualFragment(html);
    const lastNode = fragment.lastChild;
    this.insertNode(fragment);
    return lastNode;
  }

  /**
   * Find closest element matching selector from current selection
   * @param {string} selector 
   * @returns {HTMLElement|null}
   */
  getClosest(selector) {
    const range = this.getRange() || this.savedRange;
    if (!range) return null;
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (node && node.closest) {
      const match = node.closest(selector);
      if (match && this.editor.canvas.contains(match)) {
        return match;
      }
    }
    return null;
  }

  /**
   * Check if formatting tag/style is currently active at cursor
   * @param {string} command 
   * @returns {boolean}
   */
  isFormatActive(command) {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }
}
