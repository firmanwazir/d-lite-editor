/**
 * HTML Sanitizer & Security Defense for D-Lite Editor
 * Provides robust XSS protection, semantic formatting, and clean markup output
 */
export class Sanitizer {
  /**
   * Dangerous HTML tags that must never be permitted in editor content
   */
  static FORBIDDEN_TAGS = [
    'script', 'object', 'embed', 'form', 'base', 'meta', 'link', 'style',
    'applet', 'frame', 'frameset', 'template', 'textarea', 'select', 'option', 'optgroup', 'dialog',
    'foreignobject', 'animate', 'set', 'handler', 'listener', 'portal',
    'input:not([type="checkbox"])', 'button:not(.dlite-task-checkbox)'
  ];

  /**
   * Allowed trusted domains for embedded media iframes
   */
  static ALLOWED_IFRAME_SOURCES = [
    /^https:\/\/(www\.)?youtube\.com\/embed\//i,
    /^https:\/\/(www\.)?youtube-nocookie\.com\/embed\//i,
    /^https:\/\/player\.vimeo\.com\/video\//i
  ];

  /**
   * Escape HTML entities to prevent attribute injection
   * @param {string} str 
   * @returns {string}
   */
  static escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  /**
   * Cleans and sanitizes HTML content to prevent XSS and remove editor artifacts
   * @param {string} html 
   * @returns {string}
   */
  static clean(html) {
    if (!html || typeof html !== 'string') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Remove dangerous forbidden tags
    this.FORBIDDEN_TAGS.forEach(selector => {
      doc.body.querySelectorAll(selector).forEach(el => el.remove());
    });

    // 2. Validate and filter iframes
    doc.body.querySelectorAll('iframe').forEach(iframe => {
      const src = (iframe.getAttribute('src') || '').trim();
      const isTrusted = this.ALLOWED_IFRAME_SOURCES.some(pattern => pattern.test(src));
      if (!isTrusted) {
        iframe.remove();
      } else {
        // Enforce secure attributes
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        iframe.setAttribute('loading', 'lazy');
      }
    });

    // 3. Inspect all elements and attributes for XSS vectors
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove all inline event handlers (on*) and dangerous URIs
      const attrs = Array.from(el.attributes);
      attrs.forEach(attr => {
        const name = attr.name.toLowerCase();
        const rawVal = attr.value;
        const normalizedVal = rawVal.replace(/[\x00-\x20\s]+/g, '').toLowerCase();

        // Strip any on* event handler attribute
        if (name.startsWith('on') || name.startsWith('data-on')) {
          el.removeAttribute(attr.name);
          return;
        }

        // Clean CSS injection and script vectors in inline style
        if (name === 'style') {
          if (/expression\s*\(|javascript:|vbscript:|-moz-binding|behavior:/i.test(rawVal)) {
            el.removeAttribute('style');
            return;
          }
        }

        // Check for URI-based script injection (javascript:, vbscript:, data:text/html)
        if (['href', 'src', 'xlink:href', 'formaction', 'action', 'data'].includes(name)) {
          if (normalizedVal.includes('javascript:') || normalizedVal.includes('vbscript:') || normalizedVal.includes('data:text/html')) {
            el.removeAttribute(attr.name);
            return;
          }

          // For href attributes, only allow safe web schemes: http, https, mailto, tel, or relative/anchor
          if (name === 'href') {
            const isSafeScheme = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(rawVal.trim());
            if (!isSafeScheme) {
              el.removeAttribute(attr.name);
              return;
            }
          }

          // For img src, disallow dangerous non-image data schemes
          if (name === 'src' && normalizedVal.startsWith('data:')) {
            if (!/^data:image\/(jpeg|png|gif|webp);base64,/i.test(rawVal.trim())) {
              el.removeAttribute(attr.name);
              return;
            }
          }
        }
      });

      // Synchronize input checkboxes checked state with attribute
      if (el.tagName === 'INPUT' && el.getAttribute('type') === 'checkbox') {
        if (el.checked) {
          el.setAttribute('checked', '');
        } else {
          el.removeAttribute('checked');
        }
      }

      // Enforce safe external link attributes
      if (el.tagName === 'A') {
        const href = (el.getAttribute('href') || '').trim();
        if (!href) {
          // Unwrap empty link
          while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
          el.remove();
          return;
        }
        if (el.getAttribute('target') === '_blank') {
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }

      // Remove internal temporary editor UI classes
      el.classList.remove('dlite-dropzone-active', 'dlite-selected-img', 'dlite-bubble-hidden');
    });

    return doc.body.innerHTML.trim();
  }

  /**
   * Format HTML with indentation for source code viewer
   * Safely preserves code block whitespace and indentation
   * @param {string} html 
   * @returns {string}
   */
  static formatHTML(html) {
    if (!html) return '';

    // Preserve preformatted code blocks to avoid corrupting user's code indentation
    const preBlocks = [];
    html = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
      preBlocks.push(match);
      return `___DLITE_PRE_BLOCK_${preBlocks.length - 1}___`;
    });

    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    html = html.replace(reg, '$1\r\n$2$3');
    let pad = 0;

    html.split('\r\n').forEach(node => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      let padding = '';
      for (let i = 0; i < pad; i++) {
        padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
    });

    // Restore preserved pre blocks
    preBlocks.forEach((block, idx) => {
      formatted = formatted.replace(`___DLITE_PRE_BLOCK_${idx}___`, block);
    });

    return formatted.trim();
  }
}
