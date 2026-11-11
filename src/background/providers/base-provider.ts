import { StreamChunkCallback } from '../../utils/types';

export interface AIProvider {
  name: string;
  endpoint?: string;
  keys: string[];
  model: string;
  maxTokens: number;
  temperature: number;
  execute: (prompt: string, apiKey: string, modelOverride?: string) => Promise<string>;
  streamExecute: (prompt: string, apiKey: string, onChunk: StreamChunkCallback, modelOverride?: string, signal?: AbortSignal) => Promise<string>;
  buildRequest: (prompt: string, apiKey: string, modelOverride?: string) => Promise<any>;
  parseResponse: (response: any) => string;
  isAvailable: () => boolean;
  getLatency: () => number;
}

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  keys: string[] = [];
  abstract model: string;
  maxTokens: number = 2048;
  temperature: number = 0.7;
  private lastLatency: number = 0;
  
  abstract buildRequest(prompt: string, apiKey: string, modelOverride?: string): Promise<any>;
  abstract parseResponse(response: any): string;
  abstract execute(prompt: string, apiKey: string, modelOverride?: string): Promise<string>;
  abstract streamExecute(prompt: string, apiKey: string, onChunk: StreamChunkCallback, modelOverride?: string, signal?: AbortSignal): Promise<string>;
  
  isAvailable(): boolean {
    return this.keys.length > 0;
  }
  
  getLatency(): number {
    return this.lastLatency;
  }
  
  protected setLatency(latency: number) {
    this.lastLatency = latency;
  }
  
  protected async makeRequest(
    endpoint: string, 
    headers: Record<string, string>, 
    body: any
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      this.setLatency(Date.now() - startTime);
      return data;
    } catch (error) {
      console.error(`Provider ${this.name} request failed:`, error);
      throw error;
    }
  }

  protected async readSSEStream(
    response: Response,
    onChunk: StreamChunkCallback,
    parseDelta: (json: any) => string | undefined
  ): Promise<string> {
    if (!response.body) {
      throw new Error('ReadableStream not supported on this response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing fragment in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Ignore SSE comments/pings
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(dataStr);
              const chunk = parseDelta(parsed);
              if (chunk) {
                accumulatedText += chunk;
                onChunk(chunk);
              }
            } catch {
              // Fragment or non-JSON SSE payload; ignore
            }
          }
        }
      }

      // Flush remaining buffer if present
      if (buffer.trim().startsWith('data:')) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(5).trim());
          const chunk = parseDelta(parsed);
          if (chunk) {
            accumulatedText += chunk;
            onChunk(chunk);
          }
        } catch {
          // Ignore
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulatedText;
  }
}