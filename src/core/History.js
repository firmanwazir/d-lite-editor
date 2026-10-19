/**
 * History (Undo / Redo) Manager for D-Lite Editor
 */
export class HistoryManager {
  constructor(editor, maxStack = 50) {
    this.editor = editor;
    this.maxStack = maxStack;
    this.undoStack = [];
    this.redoStack = [];
    this.debounceTimer = null;
    this.lastContent = '';
  }

  /**
   * Save snapshot of current editor state
   * @param {boolean} [immediate=false]
   */
  record(immediate = false) {
    if (immediate) {
      this._saveSnapshot();
    } else {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._saveSnapshot();
      }, 350);
    }
  }

  _saveSnapshot() {
    const content = this.editor.getHTML();
    if (content === this.lastContent) return;

    this.undoStack.push(content);
    if (this.undoStack.length > this.maxStack) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
    this.lastContent = content;
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const current = this.editor.getHTML();
    let prev = this.undoStack.pop();

    // If popped snapshot matches current content, take the previous one
    if (prev === current && this.undoStack.length > 0) {
      prev = this.undoStack.pop();
    }
    if (prev === current) return;

    this.redoStack.push(current);
    this.lastContent = prev;
    this.editor.canvas.innerHTML = prev;
    this.editor._onContentChanged();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const next = this.redoStack.pop();
    this.undoStack.push(this.editor.getHTML());
    this.lastContent = next;
    this.editor.canvas.innerHTML = next;
    this.editor._onContentChanged();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.lastContent = '';
  }
}
