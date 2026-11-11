import { ExtractorRegistry } from './extractor';
import { Logger } from '../utils/logger';

Logger.info('Content script initialized on', window.location.href);

// Auto speculative extraction on page load
let autoPrefetchTimer: any = null;

function triggerSpeculativePrefetch() {
  if (autoPrefetchTimer) clearTimeout(autoPrefetchTimer);

  // Give dynamic SPAs (LeetCode, React apps) 1.5s to mount description elements
  autoPrefetchTimer = setTimeout(async () => {
    try {
      const extractor = ExtractorRegistry.getExtractor(window.location.href);
      if (extractor.platformName !== 'generic') {
        const problemData = await extractor.extract();
        if (problemData && problemData.title && problemData.description) {
          Logger.info(`Speculatively pre-fetching for: ${problemData.title} (${problemData.slug || 'no-slug'})`);
          chrome.runtime.sendMessage({ type: 'PREFETCH_PROBLEM', data: problemData }).catch(() => {
            // Background worker might be idle or asleep, safe to ignore
          });
        }
      }
    } catch (e) {
      Logger.debug('Speculative prefetch skipped:', e);
    }
  }, 1500);
}

// Trigger prefetch on initial load
if (document.readyState === 'complete') {
  triggerSpeculativePrefetch();
} else {
  window.addEventListener('load', triggerSpeculativePrefetch);
}

// Listen for messages from popup or background service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PROBLEM') {
    (async () => {
      try {
        const extractor = ExtractorRegistry.getExtractor(window.location.href);
        const problemData = await extractor.extract();
        sendResponse({ success: true, data: problemData });
      } catch (err: any) {
        Logger.error('Extraction failed:', err);
        sendResponse({ success: false, error: err.message || 'Failed to extract problem data' });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.type === 'PING') {
    sendResponse({ success: true, ready: true, platform: ExtractorRegistry.getExtractor().platformName });
    return true;
  }
});
