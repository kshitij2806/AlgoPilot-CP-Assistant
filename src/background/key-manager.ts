import { StorageManager } from '../utils/storage';

export class KeyManager {
  private storage: StorageManager;
  private keys: Record<string, string[]>;
  private keyIndexes: Record<string, number>;
  private readyPromise: Promise<void>;
  
  constructor() {
    this.storage = new StorageManager('sync');
    this.keys = {
      openai: [],
      gemini: [],
      groq: []
    };
    this.keyIndexes = {
      openai: 0,
      gemini: 0,
      groq: 0
    };
    this.readyPromise = this.loadKeys();
  }
  
  async ensureReady(): Promise<void> {
    await this.readyPromise;
  }
  
  private async loadKeys(): Promise<void> {
    try {
      const stored = await this.storage.get('apiKeys');
      if (stored && typeof stored === 'object') {
        this.keys = {
          openai: stored.openai || [],
          gemini: stored.gemini || [],
          groq: stored.groq || []
        };
      }
    } catch (e) {
      console.warn('Failed to load apiKeys from storage', e);
    }
    
    Object.keys(this.keys).forEach(provider => {
      this.keyIndexes[provider] = 0;
    });
  }
  
  async getKeys(provider: string): Promise<string[]> {
    await this.ensureReady();
    return this.keys[provider] || [];
  }
  
  async getNextKey(provider: string): Promise<string | null> {
    await this.ensureReady();
    const providerKeys = this.keys[provider] || [];
    if (providerKeys.length === 0) return null;
    
    const index = this.keyIndexes[provider] || 0;
    const key = providerKeys[index];
    
    // Rotate to next key
    this.keyIndexes[provider] = (index + 1) % providerKeys.length;
    
    return key;
  }
  
  async addKey(provider: string, key: string): Promise<void> {
    await this.ensureReady();
    const cleanKey = key.trim();
    if (!cleanKey) return;

    if (!this.keys[provider]) {
      this.keys[provider] = [];
    }
    
    if (!this.keys[provider].includes(cleanKey)) {
      this.keys[provider].push(cleanKey);
      await this.saveKeys();
    }
  }
  
  async removeKey(provider: string, keyIndex: number): Promise<void> {
    await this.ensureReady();
    if (this.keys[provider] && this.keys[provider][keyIndex] !== undefined) {
      this.keys[provider].splice(keyIndex, 1);
      await this.saveKeys();
    }
  }
  
  private async saveKeys(): Promise<void> {
    await this.storage.set('apiKeys', this.keys);
  }
  
  async getKeyCounts(): Promise<Record<string, number>> {
    await this.ensureReady();
    const counts: Record<string, number> = {};
    Object.keys(this.keys).forEach(provider => {
      counts[provider] = this.keys[provider].length;
    });
    return counts;
  }
}