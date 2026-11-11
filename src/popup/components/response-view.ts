import { marked } from 'marked';

export class ResponseView {
  private container: HTMLElement;
  private pendingText: string = '';
  private rafId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  showLoading(stepName: string, provider: string) {
    this.container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <div class="loading-title">Generating ${stepName}...</div>
        <div class="loading-subtitle">Querying ${provider.toUpperCase()} AI</div>
      </div>
    `;
  }

  showError(message: string, onRetry?: () => void) {
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Something went wrong</div>
        <div class="error-message">${this.escapeHtml(message)}</div>
        ${onRetry ? '<button class="btn btn-primary retry-btn">Retry</button>' : ''}
      </div>
    `;

    if (onRetry) {
      this.container.querySelector('.retry-btn')?.addEventListener('click', onRetry);
    }
  }

  startStreaming(stepName: string, provider: string) {
    this.pendingText = '';
    this.container.innerHTML = `
      <div class="stream-header">
        <span class="stream-indicator">⚡ Streaming from ${provider.toUpperCase()}...</span>
      </div>
      <div id="stream-body" class="markdown-body">
        <span class="stream-cursor">▌</span>
      </div>
    `;
  }

  updateStreamingContent(accumulatedMarkdown: string) {
    this.pendingText = accumulatedMarkdown;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        const streamBody = this.container.querySelector('#stream-body');
        if (streamBody) {
          try {
            const html = marked.parse(this.pendingText) as string;
            streamBody.innerHTML = `${html}<span class="stream-cursor">▌</span>`;
          } catch {
            streamBody.textContent = this.pendingText;
          }
        }
        this.rafId = null;
      });
    }
  }

  finalizeStreaming(fullText: string, isCached: boolean = false, latency?: number) {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    try {
      const html = marked.parse(fullText) as string;
      const latencyBadge = latency ? `<span class="latency-badge">⏱️ ${latency}ms</span>` : '';
      const cacheBadge = isCached ? '<span class="cache-badge">⚡ Instant Cache</span>' : '';

      this.container.innerHTML = `
        <div class="meta-row">
          ${cacheBadge}
          ${latencyBadge}
        </div>
        <div class="markdown-body">${html}</div>
      `;

      this.enhanceCodeBlocks();
    } catch {
      this.container.innerHTML = `
        <pre class="raw-content">${this.escapeHtml(fullText)}</pre>
      `;
    }
  }

  showContent(markdownText: string, isCached: boolean = false) {
    this.finalizeStreaming(markdownText, isCached);
  }

  private enhanceCodeBlocks() {
    const codeBlocks = this.container.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      const code = pre.querySelector('code')?.textContent || pre.textContent || '';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code-btn';
      copyBtn.innerHTML = '📋 Copy';
      copyBtn.title = 'Copy code to clipboard';

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code);
          copyBtn.innerHTML = '✅ Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copy';
          }, 2000);
        } catch {
          copyBtn.innerHTML = '❌ Failed';
        }
      });

      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
