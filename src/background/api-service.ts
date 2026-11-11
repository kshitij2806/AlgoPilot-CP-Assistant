import { StorageManager } from '../utils/storage';
import { KeyManager } from './key-manager';
import { CacheManager } from './cache-manager';
import { PromptTemplates } from './prompt-templates';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { GroqProvider } from './providers/groq-provider';
import { AIProvider } from './providers/base-provider';
import { APIResponse, ExtensionMessage, UserSettings, ProblemData, ResponseType } from '../utils/types';
import { DEFAULT_SETTINGS, CACHE_TTL_MS } from '../config/constants';
import { Logger } from '../utils/logger';

class BackgroundService {
  private storage: StorageManager;
  private keyManager: KeyManager;
  private cacheManager: CacheManager;
  private providers: Record<string, AIProvider>;

  constructor() {
    this.storage = new StorageManager('sync');
    this.keyManager = new KeyManager();
    this.cacheManager = new CacheManager();
    this.providers = {
      openai: new OpenAIProvider(),
      gemini: new GeminiProvider(),
      groq: new GroqProvider()
    };

    this.init();
  }

  private init() {
    Logger.info('Background Service Worker initialized with streaming & speculative pre-fetch support.');

    // Configure Chrome Side Panel to open on action click if available
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
        Logger.warn('Failed to set side panel behavior:', err);
      });
    }

    // Standard message router (for non-streaming queries and settings)
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      this.handleMessage(message)
        .then(response => sendResponse(response))
        .catch(error => {
          Logger.error('Error handling message:', error);
          sendResponse({ success: false, error: error.message || 'Unknown background error' });
        });
      return true; // Keep channel open for async response
    });

    // Real-time Streaming Port Router
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'stream-channel') {
        const abortController = new AbortController();

        port.onDisconnect.addListener(() => {
          abortController.abort();
        });

        port.onMessage.addListener(async (msg: any) => {
          if (msg.type === 'START_STREAM') {
            await this.handleStream(port, msg.responseType, msg.problemData, abortController.signal);
          }
        });
      }
    });
  }

  private async getSettings(): Promise<UserSettings> {
    const settings = await this.storage.get('userSettings');
    const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    if (merged.selectedModel === 'gemini-1.5-flash' || merged.selectedModel === 'gemini-1.5-pro' || merged.selectedModel === 'gemini-pro') {
      merged.selectedModel = 'gemini-2.5-flash';
      await this.storage.set('userSettings', merged);
    }
    return merged;
  }

  private async handleMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'GET_SETTINGS': {
        const settings = await this.getSettings();
        return { success: true, settings };
      }

      case 'SAVE_SETTINGS': {
        const current = await this.getSettings();
        const updated = { ...current, ...message.settings };
        await this.storage.set('userSettings', updated);
        return { success: true, settings: updated };
      }

      case 'GET_KEYS': {
        const keys = await this.keyManager.getKeys(message.provider);
        return { success: true, keys };
      }

      case 'ADD_KEY': {
        await this.keyManager.addKey(message.provider, message.key);
        const keys = await this.keyManager.getKeys(message.provider);
        return { success: true, keys };
      }

      case 'REMOVE_KEY': {
        await this.keyManager.removeKey(message.provider, message.index);
        const keys = await this.keyManager.getKeys(message.provider);
        return { success: true, keys };
      }

      case 'CLEAR_CACHE': {
        await this.cacheManager.clear();
        return { success: true };
      }

      case 'PREFETCH_PROBLEM': {
        this.prefetchProblem(message.data);
        return { success: true };
      }

      case 'ANALYZE_REQUEST': {
        return await this.analyzeProblem(message.responseType, message.problemData);
      }

      default:
        return { success: false, error: `Unhandled message type: ${message.type}` };
    }
  }

  // Speculative Pre-fetching in the background
  private async prefetchProblem(problemData: ProblemData): Promise<void> {
    if (!problemData || !problemData.title) return;

    try {
      const cacheKey = this.cacheManager.createKey('understanding', problemData);
      const existing = await this.cacheManager.get(cacheKey);
      if (existing) {
        Logger.debug(`Prefetch skipped: already cached for ${problemData.title}`);
        return;
      }

      const settings = await this.getSettings();
      if (settings.speculativePrefetch === false) return;

      const providerName = settings.activeProvider || 'gemini';
      const provider = this.providers[providerName];
      const apiKey = await this.keyManager.getNextKey(providerName);
      if (!apiKey || !provider) return;

      Logger.info(`Speculatively caching "understanding" for: ${problemData.title}`);
      const prompt = PromptTemplates.buildPrompt('understanding', problemData, settings.preferredLanguage || 'Python3');
      const response = await provider.execute(prompt, apiKey, settings.selectedModel);
      if (response && response.trim().length > 0) {
        await this.cacheManager.set(cacheKey, response, CACHE_TTL_MS);
        Logger.info(`Speculative prefetch complete and cached for ${problemData.title}`);
      }
    } catch (e) {
      Logger.debug('Prefetch error:', e);
    }
  }

  // Streaming Request Handler
  private async handleStream(
    port: chrome.runtime.Port,
    responseType: ResponseType,
    problemData: ProblemData,
    signal: AbortSignal
  ): Promise<void> {
    if (!problemData || !problemData.title) {
      port.postMessage({ type: 'ERROR', error: 'Problem data is missing or empty' });
      return;
    }

    // 1. Check Cache first
    const cacheKey = this.cacheManager.createKey(responseType, problemData);
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      Logger.info(`Stream cache hit for [${problemData.title}] [${responseType}]`);
      port.postMessage({ type: 'CHUNK', chunk: cachedResponse });
      port.postMessage({ type: 'DONE', fullText: cachedResponse, cached: true, latency: 0 });
      return;
    }

    // 2. Load Settings & Provider
    const settings = await this.getSettings();
    const providerName = settings.activeProvider || 'gemini';
    const provider = this.providers[providerName];

    if (!provider) {
      port.postMessage({ type: 'ERROR', error: `Provider "${providerName}" is not supported.` });
      return;
    }

    // 3. Get API Key
    const apiKey = await this.keyManager.getNextKey(providerName);
    if (!apiKey) {
      port.postMessage({
        type: 'ERROR',
        error: `No API key configured for ${providerName.toUpperCase()}. Please add your API key in settings (gear icon).`
      });
      return;
    }

    // 4. Construct Prompt
    const prompt = PromptTemplates.buildPrompt(
      responseType,
      problemData,
      settings.preferredLanguage || 'Python3'
    );

    // 5. Execute Stream
    const startTime = Date.now();
    try {
      const fullText = await provider.streamExecute(
        prompt,
        apiKey,
        (chunk: string) => {
          if (!signal.aborted) {
            port.postMessage({ type: 'CHUNK', chunk });
          }
        },
        settings.selectedModel,
        signal
      );

      const latency = Date.now() - startTime;

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('Received empty response from AI model.');
      }

      // Save to cache
      await this.cacheManager.set(cacheKey, fullText, CACHE_TTL_MS);

      if (!signal.aborted) {
        port.postMessage({ type: 'DONE', fullText, latency, cached: false });
      }
    } catch (err: any) {
      if (signal.aborted) {
        Logger.debug('Stream aborted by client disconnection.');
        return;
      }
      Logger.error(`Streaming failed for ${providerName}:`, err);
      port.postMessage({ type: 'ERROR', error: err.message || `Failed to communicate with ${providerName}` });
    }
  }

  // Non-streaming fallback
  private async analyzeProblem(responseType: any, problemData: any): Promise<APIResponse> {
    if (!problemData || !problemData.title) {
      return { success: false, error: 'Problem data is missing or empty' };
    }

    const cacheKey = this.cacheManager.createKey(responseType, problemData);
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return { success: true, response: cachedResponse, cached: true };
    }

    const settings = await this.getSettings();
    const providerName = settings.activeProvider || 'gemini';
    const provider = this.providers[providerName];
    if (!provider) return { success: false, error: `Provider "${providerName}" not supported.` };

    const apiKey = await this.keyManager.getNextKey(providerName);
    if (!apiKey) {
      return {
        success: false,
        error: `No API key configured for ${providerName.toUpperCase()}. Add your key in settings.`
      };
    }

    const prompt = PromptTemplates.buildPrompt(responseType, problemData, settings.preferredLanguage || 'Python3');
    const startTime = Date.now();

    try {
      const response = await provider.execute(prompt, apiKey, settings.selectedModel);
      const latency = Date.now() - startTime;
      await this.cacheManager.set(cacheKey, response, CACHE_TTL_MS);
      return { success: true, response, provider: providerName, latency, cached: false };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

// Start background service
new BackgroundService();
