import { StorageManager } from '../utils/storage';
import { ProblemData } from '../utils/types';

export class CacheManager {
  private storage: StorageManager;
  private memoryCache: Map<string, CachedResponse>;
  private maxMemoryCacheSize: number = 100;
  
  constructor() {
    this.storage = new StorageManager('local');
    this.memoryCache = new Map();
    this.loadFromStorage();
  }
  
  static getProblemSlug(problem: ProblemData): string {
    if (problem.slug) return problem.slug;
    const url = problem.url || '';
    
    // LeetCode: .../problems/two-sum/...
    const lcMatch = url.match(/problems\/([a-z0-9\-]+)/i);
    if (lcMatch && (url.includes('leetcode.com') || url.includes('leetcode.cn'))) {
      return `lc_${lcMatch[1].toLowerCase()}`;
    }

    // Codeforces: .../problem/158/A or .../problemset/problem/158/A
    const cfMatch = url.match(/problem(?:set\/problem|\/contest\/\d+\/problem)?\/(\d+)\/([a-z0-9]+)/i);
    if (cfMatch && url.includes('codeforces')) {
      return `cf_${cfMatch[1]}_${cfMatch[2].toLowerCase()}`;
    }

    // HackerRank: .../challenges/simple-array-sum/...
    const hrMatch = url.match(/challenges\/([a-z0-9\-]+)/i);
    if (hrMatch && url.includes('hackerrank')) {
      return `hr_${hrMatch[1].toLowerCase()}`;
    }

    // CodeChef: .../problems/FLOW001
    const ccMatch = url.match(/problems\/([a-z0-9\-]+)/i);
    if (ccMatch && url.includes('codechef')) {
      return `cc_${ccMatch[1].toLowerCase()}`;
    }

    // GeeksforGeeks: .../problems/two-sum/...
    const gfgMatch = url.match(/problems\/([a-z0-9\-]+)/i);
    if (gfgMatch && url.includes('geeksforgeeks')) {
      return `gfg_${gfgMatch[1].toLowerCase()}`;
    }

    // Deterministic fallback: sanitized title
    const cleanTitle = (problem.title || 'problem')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${problem.platform || 'generic'}_${cleanTitle}`;
  }

  createKey(type: string, problemData: ProblemData): string {
    const slug = CacheManager.getProblemSlug(problemData);
    return `${type}_${slug}`;
  }
  
  async get(key: string): Promise<string | null> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.response;
      } else {
        this.memoryCache.delete(key);
      }
    }
    
    // Check chrome storage
    const stored = await this.storage.get(`cache_${key}`);
    if (stored) {
      const cached = stored as CachedResponse;
      if (Date.now() - cached.timestamp < cached.ttl) {
        // Refresh memory cache
        this.memoryCache.set(key, cached);
        this.trimMemoryCache();
        return cached.response;
      }
    }
    
    return null;
  }
  
  async set(key: string, response: string, ttl: number): Promise<void> {
    const cached: CachedResponse = {
      response,
      timestamp: Date.now(),
      ttl
    };
    
    // Store in memory
    this.memoryCache.set(key, cached);
    this.trimMemoryCache();
    
    // Store in chrome storage (async, non-blocking)
    this.storage.set(`cache_${key}`, cached);
  }
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    // Clear all cache entries from storage
    const allData = await this.storage.getAll();
    const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      await this.storage.remove(key);
    }
  }
  
  private trimMemoryCache(): void {
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.maxMemoryCacheSize);
      toRemove.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
    }
  }
  
  private async loadFromStorage(): Promise<void> {
    const allData = await this.storage.getAll();
    const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      const cached = allData[key] as CachedResponse;
      if (Date.now() - cached.timestamp < cached.ttl) {
        const cleanKey = key.replace('cache_', '');
        this.memoryCache.set(cleanKey, cached);
      } else {
        // Remove expired cache
        await this.storage.remove(key);
      }
    }
  }
}

interface CachedResponse {
  response: string;
  timestamp: number;
  ttl: number;
}