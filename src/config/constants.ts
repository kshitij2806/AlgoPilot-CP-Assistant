import { UserSettings } from '../utils/types';

export const DEFAULT_SETTINGS: UserSettings = {
  activeProvider: 'gemini',
  selectedModel: 'gemini-2.5-flash',
  autoExtract: true,
  preferredLanguage: 'Python3'
};

export const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
};

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const SUPPORTED_DOMAINS = [
  'leetcode.com',
  'leetcode.cn',
  'codeforces.com',
  'hackerrank.com',
  'codechef.com',
  'geeksforgeeks.org'
];
