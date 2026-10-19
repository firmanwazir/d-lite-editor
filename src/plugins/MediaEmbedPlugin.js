import { modal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';

/**
 * MediaEmbedPlugin for D-Lite Editor
 * Embeds responsive YouTube, Vimeo, and validated media iframes
 */
export class MediaEmbedPlugin {
  constructor(editor) {
    this.editor = editor;
  }

  openModal() {
    this.editor.selection.save();

    const content = document.createElement('div');
    content.className = 'dlite-media-embed-content';
    content.innerHTML = `
      <div class="dlite-form-group">
        <label class="dlite-label">Tautan Video (YouTube / Vimeo)</label>
        <input type="text" id="dlite-video-url" class="dlite-input" placeholder="https://www.youtube.com/watch?v=... atau https://vimeo.com/..." />
        <small class="dlite-drop-sub">Mendukung tautan video YouTube atau Vimeo yang aman</small>
      </div>
      <div class="dlite-form-group">
        <label class="dlite-label">Rasio Aspek</label>
        <select id="dlite-video-ratio" class="dlite-input">
          <option value="16-9" selected>16:9 (Layar Lebar Standar)</option>
          <option value="4-3">4:3 (Klasik)</option>
          <option value="1-1">1:1 (Persegi)</option>
        </select>
      </div>
    `;

    modal.open({
      title: 'Sisipkan Video / Media Embed',
      content,
      width: '460px',
      buttons: [
        { text: 'Batal', type: 'secondary' },
        {
          text: 'Sisipkan Video',
          type: 'primary',
          onClick: () => {
            const input = content.querySelector('#dlite-video-url').value.trim();
            const ratio = content.querySelector('#dlite-video-ratio').value;
            if (!input) {
              toast.warning('Silakan masukkan URL video.');
              return false;
            }

            return this.insertVideo(input, ratio);
          }
        }
      ]
    });
  }

  insertVideo(input, ratio = '16-9') {
    // Security check: reject javascript:, data:, vbscript:, file:
    const dangerous = /^(javascript|vbscript|data|file):/i;
    if (dangerous.test(input.replace(/\s+/g, ''))) {
      toast.error('URL mengandung protokol yang berbahaya dan ditolak.');
      return false;
    }

    let embedUrl = '';
    // Check if user pasted full <iframe>
    if (input.includes('<iframe') && input.includes('src=')) {
      const match = input.match(/src=["']([^"']+)["']/i);
      if (match) input = match[1];
    }

    // YouTube check
    const ytMatch = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    } else {
      // Vimeo check
      const vimeoMatch = input.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
      if (vimeoMatch && vimeoMatch[3]) {
        embedUrl = `https://player.vimeo.com/video/${vimeoMatch[3]}`;
      }
    }

    if (!embedUrl) {
      toast.warning('Format tautan tidak didukung. Harap masukkan tautan video YouTube atau Vimeo yang valid.');
      return false;
    }

    const container = document.createElement('div');
    container.className = `dlite-video-responsive ratio-${ratio}`;
    container.contentEditable = 'false';

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.setAttribute('loading', 'lazy');

    container.appendChild(iframe);

    const p = document.createElement('p');
    p.innerHTML = '<br>';

    this.editor.selection.insertBlockNode(container);
    container.after(p);

    this.editor._onContentChanged();
    this.editor.history.record(true);
    toast.success('Video berhasil disisipkan.');
    return true;
  }
}
