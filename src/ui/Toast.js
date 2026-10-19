import { Icons } from './Icons.js';

/**
 * DLiteToast - Modern Toast Notification Manager
 * Completely replaces browser native alert()
 */
export class DLiteToast {
  constructor() {
    this.container = null;
    this.toasts = [];
    this._ensureContainer();
  }

  _ensureContainer() {
    let container = document.getElementById('dlite-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dlite-toast-container';
      container.className = 'dlite-toast-container';
      document.body.appendChild(container);
    }
    this.container = container;
  }

  /**
   * Show a toast notification
   * @param {Object} options 
   * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message body
   * @param {number} [options.duration=4000] - Duration in ms (0 for persistent)
   * @param {string} [options.actionLabel] - Optional action button
   * @param {Function} [options.onAction] - Action callback
   */
  show({ type = 'info', title = '', message = '', duration = 4000, actionLabel, onAction }) {
    this._ensureContainer();

    const toast = document.createElement('div');
    toast.className = `dlite-toast dlite-toast-${type}`;

    let iconSvg = Icons.info;
    if (type === 'success') iconSvg = Icons.check;
    else if (type === 'error' || type === 'warning') iconSvg = Icons.alertTriangle;

    const actionHtml = actionLabel 
      ? `<button class="dlite-toast-action" type="button">${actionLabel}</button>` 
      : '';

    toast.innerHTML = `
      <div class="dlite-toast-icon">${iconSvg}</div>
      <div class="dlite-toast-content">
        ${title ? `<div class="dlite-toast-title">${title}</div>` : ''}
        <div class="dlite-toast-message">${message}</div>
      </div>
      ${actionHtml}
      <button class="dlite-toast-close" type="button" aria-label="Tutup notifikasi">${Icons.close}</button>
      ${duration > 0 ? `<div class="dlite-toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
    `;

    // Handle close button
    const closeBtn = toast.querySelector('.dlite-toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    // Handle action button
    if (actionLabel && onAction) {
      const actionBtn = toast.querySelector('.dlite-toast-action');
      actionBtn.addEventListener('click', () => {
        onAction();
        this.dismiss(toast);
      });
    }

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('dlite-toast-visible');
    });

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        this.dismiss(toast);
      }, duration);
      toast._timeoutId = timeoutId;

      // Pause on hover
      toast.addEventListener('mouseenter', () => {
        clearTimeout(toast._timeoutId);
        const progress = toast.querySelector('.dlite-toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
      });

      toast.addEventListener('mouseleave', () => {
        const progress = toast.querySelector('.dlite-toast-progress');
        if (progress) progress.style.animationPlayState = 'running';
        toast._timeoutId = setTimeout(() => this.dismiss(toast), 1500);
      });
    }

    return toast;
  }

  success(message, title = 'Berhasil') {
    return this.show({ type: 'success', title, message });
  }

  error(message, title = 'Terjadi Kesalahan') {
    return this.show({ type: 'error', title, message, duration: 6000 });
  }

  warning(message, title = 'Peringatan') {
    return this.show({ type: 'warning', title, message, duration: 5000 });
  }

  info(message, title = 'Informasi') {
    return this.show({ type: 'info', title, message });
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('dlite-toast-visible');
    toast.classList.add('dlite-toast-leaving');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }
}

export const toast = new DLiteToast();
