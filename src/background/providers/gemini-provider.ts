import { BaseProvider } from './base-provider';
import { StreamChunkCallback } from '../../utils/types';

const LEGACY_MAPPINGS: Record<string, string> = {
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-pro': 'gemini-2.5-flash',
  'gemini-1.0-pro': 'gemini-2.5-flash'
};

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  model = 'gemini-2.5-flash';
  maxTokens = 2048;
  temperature = 0.7;

  private resolveModel(modelName?: string): string {
    const raw = modelName || this.model;
    return LEGACY_MAPPINGS[raw] || raw;
  }
  
  async buildRequest(prompt: string, apiKey: string, modelOverride?: string) {
    const activeModel = this.resolveModel(modelOverride);
    return {
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`,
      headers: {},
      body: {
        contents: [
          {
            parts: [
              {
                text: `You are an elite competitive programming mentor. Your explanations are clear, educational, structured, and technically accurate.\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
          topP: 0.8
        }
      }
    };
  }
  
  async execute(prompt: string, apiKey: string, modelOverride?: string): Promise<string> {
    const resolvedModel = this.resolveModel(modelOverride);
    try {
      const request = await this.buildRequest(prompt, apiKey, resolvedModel);
      const response = await this.makeRequest(
        request.endpoint,
        request.headers,
        request.body
      );
      return this.parseResponse(response);
    } catch (err: any) {
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        const fallbackModel = resolvedModel !== 'gemini-2.5-flash' ? 'gemini-2.5-flash' : 'gemini-2.0-flash';
        console.warn(`Model ${resolvedModel} returned 404, retrying with fallback model ${fallbackModel}`);
        const fallbackRequest = await this.buildRequest(prompt, apiKey, fallbackModel);
        const fallbackResponse = await this.makeRequest(
          fallbackRequest.endpoint,
          fallbackRequest.headers,
          fallbackRequest.body
        );
        return this.parseResponse(fallbackResponse);
      }
      throw err;
    }
  }

  async streamExecute(
    prompt: string,
    apiKey: string,
    onChunk: StreamChunkCallback,
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const resolvedModel = this.resolveModel(modelOverride);
    const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const request = await this.buildRequest(prompt, apiKey, resolvedModel);

    const startTime = Date.now();
    try {
      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.body),
        signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const fullText = await this.readSSEStream(response, onChunk, (json) => {
        const parts = json.candidates?.[0]?.content?.parts || [];
        return parts.map((p: any) => p.text || '').join('');
      });

      this.setLatency(Date.now() - startTime);
      return fullText;
    } catch (err: any) {
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        const fallbackModel = resolvedModel !== 'gemini-2.5-flash' ? 'gemini-2.5-flash' : 'gemini-2.0-flash';
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const fallbackReq = await this.buildRequest(prompt, apiKey, fallbackModel);

        const response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackReq.body),
          signal
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const fullText = await this.readSSEStream(response, onChunk, (json) => {
          const parts = json.candidates?.[0]?.content?.parts || [];
          return parts.map((p: any) => p.text || '').join('');
        });

        this.setLatency(Date.now() - startTime);
        return fullText;
      }
      throw err;
    }
  }
  
  parseResponse(response: any): string {
    const candidates = response.candidates || [];
    if (candidates.length === 0) return '';
    
    const parts = candidates[0].content?.parts || [];
    return parts.map((part: any) => part.text || '').join('');
  }
}