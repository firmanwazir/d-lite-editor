import { DLiteEditor } from './src/core/Editor.js';
import { toast, DLiteToast } from './src/ui/Toast.js';
import { modal, DLiteModal } from './src/ui/Modal.js';
import { Sanitizer } from './src/core/Sanitizer.js';
import { Icons } from './src/ui/Icons.js';

// Attach to window object for direct <script> browser usage
if (typeof window !== 'undefined') {
  window.DLiteEditor = DLiteEditor;
  window.DLiteToast = DLiteToast;
  window.DLiteModal = DLiteModal;
  window.dliteToast = toast;
  window.dliteModal = modal;
}

export { DLiteEditor, toast, modal, Sanitizer, Icons };
export default DLiteEditor;
