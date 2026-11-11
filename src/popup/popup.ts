import { ProblemData, ResponseType, UserSettings } from '../utils/types';
import { ResponseView } from './components/response-view';
import { PROVIDER_MODELS } from '../config/constants';

class PopupController {
  private currentProblem: ProblemData | null = null;
  private currentStep: ResponseType = 'understanding';
  private responseView: ResponseView;
  private userSettings: UserSettings | null = null;

  // DOM Elements
  private platformBadge!: HTMLElement;
  private problemCard!: HTMLElement;
  private problemTitle!: HTMLElement;
  private problemDifficulty!: HTMLElement;
  private problemPlatform!: HTMLElement;
  private noProblemView!: HTMLElement;
  private stepNav!: HTMLElement;
  private responseViewport!: HTMLElement;
  private responseContent!: HTMLElement;
  private btnSettings!: HTMLElement;
  private btnCloseSettings!: HTMLElement;
  private settingsModal!: HTMLElement;
  private providerSelect!: HTMLSelectElement;
  private modelSelect!: HTMLSelectElement;
  private languageSelect!: HTMLSelectElement;
  private apiKeyInput!: HTMLInputElement;
  private btnAddKey!: HTMLElement;
  private keyList!: HTMLElement;
  private currentProviderName!: HTMLElement;
  private btnClearCache!: HTMLElement;
  private btnManualExtract!: HTMLElement;
  private btnReExtract!: HTMLElement;
  private prefetchToggle!: HTMLInputElement;

  constructor() {
    this.initDOMElements();
    this.responseView = new ResponseView(this.responseContent);
    this.bindEvents();
    this.bootstrap();
  }

  private initDOMElements() {
    this.platformBadge = document.getElementById('platform-badge')!;
    this.problemCard = document.getElementById('problem-card')!;
    this.problemTitle = document.getElementById('problem-title')!;
    this.problemDifficulty = document.getElementById('problem-difficulty')!;
    this.problemPlatform = document.getElementById('problem-platform')!;
    this.noProblemView = document.getElementById('no-problem-view')!;
    this.stepNav = document.getElementById('step-nav')!;
    this.responseViewport = document.getElementById('response-viewport')!;
    this.responseContent = document.getElementById('response-content')!;
    this.btnSettings = document.getElementById('btn-settings')!;
    this.btnCloseSettings = document.getElementById('btn-close-settings')!;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    this.modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    this.languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    this.apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    this.btnAddKey = document.getElementById('btn-add-key')!;
    this.keyList = document.getElementById('key-list')!;
    this.currentProviderName = document.getElementById('current-provider-name')!;
    this.btnClearCache = document.getElementById('btn-clear-cache')!;
    this.btnManualExtract = document.getElementById('btn-manual-extract')!;
    this.btnReExtract = document.getElementById('btn-re-extract')!;
    this.prefetchToggle = document.getElementById('prefetch-toggle') as HTMLInputElement;
  }

  private bindEvents() {
    // Step navigation tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement);
        const step = target.dataset.step as ResponseType;
        if (step && step !== this.currentStep) {
          tabs.forEach(t => t.classList.remove('active'));
          target.classList.add('active');
          this.currentStep = step;
          this.fetchAnalysisForCurrentStep();
        }
      });
    });

    // Extraction buttons
    this.btnManualExtract?.addEventListener('click', () => this.extractFromCurrentTab());
    this.btnReExtract?.addEventListener('click', () => this.extractFromCurrentTab());

    // Settings Modal
    this.btnSettings.addEventListener('click', () => this.openSettings());
    this.btnCloseSettings.addEventListener('click', () => this.closeSettings());

    // Provider select change in settings
    this.providerSelect.addEventListener('change', () => {
      const selected = this.providerSelect.value as any;
      this.updateModelOptions(selected);
      this.currentProviderName.textContent = selected.toUpperCase();
      this.loadKeysForProvider(selected);
      this.saveSettings({ activeProvider: selected, selectedModel: this.modelSelect.value });
    });

    // Model select change
    this.modelSelect.addEventListener('change', () => {
      this.saveSettings({ selectedModel: this.modelSelect.value });
    });

    // Language select change
    this.languageSelect.addEventListener('change', () => {
      this.saveSettings({ preferredLanguage: this.languageSelect.value });
    });

    // Add API key
    this.btnAddKey.addEventListener('click', () => this.addApiKey());
    this.apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addApiKey();
    });

    // Clear cache
    this.btnClearCache.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      alert('Cache cleared successfully!');
    });

    // Prefetch toggle change
    this.prefetchToggle?.addEventListener('change', () => {
      this.saveSettings({ speculativePrefetch: this.prefetchToggle.checked });
    });
  }

  private async bootstrap() {
    await this.loadSettings();
    await this.extractFromCurrentTab();
  }

  private async loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (res && res.success) {
        this.userSettings = res.settings;
        this.providerSelect.value = this.userSettings!.activeProvider;
        this.languageSelect.value = this.userSettings!.preferredLanguage;
        if (this.prefetchToggle) {
          this.prefetchToggle.checked = this.userSettings!.speculativePrefetch !== false;
        }
        this.updateModelOptions(this.userSettings!.activeProvider, this.userSettings!.selectedModel);
        this.currentProviderName.textContent = this.userSettings!.activeProvider.toUpperCase();
        await this.loadKeysForProvider(this.userSettings!.activeProvider);
      }
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
  }

  private updateModelOptions(provider: string, selectedModel?: string) {
    const models = PROVIDER_MODELS[provider] || [];
    this.modelSelect.innerHTML = '';
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      if (selectedModel && selectedModel === model) {
        opt.selected = true;
      }
      this.modelSelect.appendChild(opt);
    });
  }

  private async saveSettings(partial: Partial<UserSettings>) {
    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: partial });
    if (this.userSettings) {
      this.userSettings = { ...this.userSettings, ...partial };
    }
  }

  private async loadKeysForProvider(provider: string) {
    this.keyList.innerHTML = '';
    const res = await chrome.runtime.sendMessage({ type: 'GET_KEYS', provider });
    if (res && res.success && res.keys) {
      if (res.keys.length === 0) {
        this.keyList.innerHTML = '<li class="text-muted" style="font-size:12px;">No keys added yet.</li>';
        return;
      }
      res.keys.forEach((key: string, idx: number) => {
        const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '••••••••';
        const li = document.createElement('li');
        li.className = 'key-item';
        li.innerHTML = `
          <span>${masked}</span>
          <button class="key-remove-btn" title="Remove Key">✕</button>
        `;
        li.querySelector('.key-remove-btn')?.addEventListener('click', async () => {
          await chrome.runtime.sendMessage({ type: 'REMOVE_KEY', provider, index: idx });
          this.loadKeysForProvider(provider);
        });
        this.keyList.appendChild(li);
      });
    }
  }

  private async addApiKey() {
    const key = this.apiKeyInput.value.trim();
    if (!key) return;
    const provider = this.providerSelect.value;
    await chrome.runtime.sendMessage({ type: 'ADD_KEY', provider, key });
    this.apiKeyInput.value = '';
    await this.loadKeysForProvider(provider);
  }

  private openSettings() {
    this.settingsModal.classList.remove('hidden');
  }

  private closeSettings() {
    this.settingsModal.classList.add('hidden');
  }

  private async extractFromCurrentTab() {
    this.platformBadge.textContent = 'Extracting...';
    this.platformBadge.className = 'badge badge-neutral';

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id || !activeTab.url) {
      this.showNoProblemDetected();
      return;
    }

    try {
      // Send extraction message to content script
      let response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_PROBLEM' }).catch(() => null);

      // If content script was not ready, inject dynamically and try once more
      if (!response) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          });
          response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_PROBLEM' });
        } catch {
          // Injection may not be permitted on internal chrome:// pages
        }
      }

      if (response && response.success && response.data && response.data.title) {
        this.currentProblem = response.data;
        this.renderProblemInfo(this.currentProblem!);
        this.fetchAnalysisForCurrentStep();
      } else {
        this.showNoProblemDetected();
      }
    } catch (err: any) {
      console.warn('Extraction failed:', err);
      this.showNoProblemDetected();
    }
  }

  private renderProblemInfo(problem: ProblemData) {
    this.noProblemView.classList.add('hidden');
    this.problemCard.classList.remove('hidden');
    this.stepNav.classList.remove('hidden');
    this.responseViewport.classList.remove('hidden');

    this.problemTitle.textContent = problem.title;
    this.problemTitle.title = problem.title;
    this.problemPlatform.textContent = problem.platform.toUpperCase();

    // Badge styling
    this.platformBadge.textContent = `${problem.platform.toUpperCase()} Active`;
    this.platformBadge.className = 'badge badge-success';

    const diff = (problem.difficulty || 'Medium').toLowerCase();
    this.problemDifficulty.textContent = problem.difficulty || 'Problem';
    this.problemDifficulty.className = 'badge badge-difficulty';
    if (diff.includes('easy')) this.problemDifficulty.classList.add('badge-easy');
    else if (diff.includes('hard')) this.problemDifficulty.classList.add('badge-hard');
    else this.problemDifficulty.classList.add('badge-medium');
  }

  private showNoProblemDetected() {
    this.platformBadge.textContent = 'No Problem Found';
    this.platformBadge.className = 'badge badge-neutral';
    this.noProblemView.classList.remove('hidden');
    this.problemCard.classList.add('hidden');
    this.stepNav.classList.add('hidden');
    this.responseViewport.classList.add('hidden');
  }

  private currentStreamPort: chrome.runtime.Port | null = null;

  private async fetchAnalysisForCurrentStep() {
    if (!this.currentProblem) return;

    if (this.currentStreamPort) {
      try {
        this.currentStreamPort.disconnect();
      } catch {
        // Safe to ignore
      }
      this.currentStreamPort = null;
    }

    const provider = this.userSettings?.activeProvider || 'gemini';
    const stepNames: Record<ResponseType, string> = {
      understanding: 'Problem Understanding',
      intuition: 'Intuition & Patterns',
      hints: 'Progressive Hints',
      bruteforce: 'Brute Force Solution',
      optimized: 'Optimized Solution'
    };

    this.responseView.startStreaming(stepNames[this.currentStep], provider);

    const port = chrome.runtime.connect({ name: 'stream-channel' });
    this.currentStreamPort = port;

    let accumulated = '';

    port.onMessage.addListener((msg: any) => {
      if (msg.type === 'CHUNK') {
        accumulated += msg.chunk;
        this.responseView.updateStreamingContent(accumulated);
      } else if (msg.type === 'DONE') {
        this.responseView.finalizeStreaming(msg.fullText || accumulated, msg.cached, msg.latency);
        this.currentStreamPort = null;
      } else if (msg.type === 'ERROR') {
        const errorMsg = msg.error || 'Failed to generate response.';
        this.responseView.showError(errorMsg, () => this.fetchAnalysisForCurrentStep());
        if (errorMsg.includes('API key')) {
          this.openSettings();
        }
        this.currentStreamPort = null;
      }
    });

    port.onDisconnect.addListener(() => {
      this.currentStreamPort = null;
    });

    port.postMessage({
      type: 'START_STREAM',
      responseType: this.currentStep,
      problemData: this.currentProblem
    });
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
