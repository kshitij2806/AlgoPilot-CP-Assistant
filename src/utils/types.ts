export interface ProblemData {
  title: string;
  slug?: string;
  description: string;
  examples: Example[];
  constraints: string[];
  difficulty: string;
  url: string;
  platform: 'leetcode' | 'codeforces' | 'hackerrank' | 'codechef' | 'geeksforgeeks' | 'generic';
  timestamp: number;
}

export interface Example {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

export type ResponseType = 
  | 'understanding' 
  | 'intuition' 
  | 'hints' 
  | 'bruteforce' 
  | 'optimized';

export interface APIResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider?: string;
  latency?: number;
  cached?: boolean;
}

export interface ProviderConfig {
  name: 'gemini' | 'groq' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface UserSettings {
  activeProvider: 'gemini' | 'groq' | 'openai';
  selectedModel: string;
  autoExtract: boolean;
  preferredLanguage: string;
  speculativePrefetch?: boolean;
}

export type StreamChunkCallback = (chunk: string) => void;

export type ExtensionMessage =
  | { type: 'EXTRACT_PROBLEM' }
  | { type: 'PROBLEM_EXTRACTED'; data: ProblemData }
  | { type: 'PREFETCH_PROBLEM'; data: ProblemData }
  | { type: 'ANALYZE_REQUEST'; responseType: ResponseType; problemData: ProblemData }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Partial<UserSettings> }
  | { type: 'GET_KEYS'; provider: string }
  | { type: 'ADD_KEY'; provider: string; key: string }
  | { type: 'REMOVE_KEY'; provider: string; index: number }
  | { type: 'CLEAR_CACHE' };

export type StreamMessage =
  | { type: 'START_STREAM'; responseType: ResponseType; problemData: ProblemData }
  | { type: 'CHUNK'; chunk: string }
  | { type: 'DONE'; fullText: string; latency?: number; cached?: boolean }
  | { type: 'ERROR'; error: string };