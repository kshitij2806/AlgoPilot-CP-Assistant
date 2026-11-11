import { BaseProvider } from './base-provider';
import { StreamChunkCallback } from '../../utils/types';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  model = 'gpt-4o-mini';
  maxTokens = 2048;
  
  async buildRequest(prompt: string, apiKey: string, modelOverride?: string) {
    return {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: modelOverride || this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an elite competitive programming mentor. Your explanations are clear, educational, structured, and technically accurate.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      }
    };
  }
  
  async execute(prompt: string, apiKey: string, modelOverride?: string): Promise<string> {
    const request = await this.buildRequest(prompt, apiKey, modelOverride);
    const response = await this.makeRequest(
      request.endpoint,
      request.headers,
      request.body
    );
    
    return this.parseResponse(response);
  }

  async streamExecute(
    prompt: string,
    apiKey: string,
    onChunk: StreamChunkCallback,
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const request = await this.buildRequest(prompt, apiKey, modelOverride);
    const bodyWithStream = { ...request.body, stream: true };

    const startTime = Date.now();
    const response = await fetch(request.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...request.headers
      },
      body: JSON.stringify(bodyWithStream),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const fullText = await this.readSSEStream(response, onChunk, (json) => {
      return json.choices?.[0]?.delta?.content;
    });

    this.setLatency(Date.now() - startTime);
    return fullText;
  }
  
  parseResponse(response: any): string {
    return response.choices?.[0]?.message?.content || '';
  }
}