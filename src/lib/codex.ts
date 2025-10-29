import axios from 'axios';
import { LanguageModelClient } from './llm.js';

export interface CodexConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
  maxTokens?: number;
}

export class CodexClient implements LanguageModelClient {
  private config: Required<Omit<CodexConfig, 'apiUrl' | 'maxTokens'>> & { apiUrl: string; maxTokens: number };

  constructor(config: CodexConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model,
      apiUrl: config.apiUrl ?? 'https://api.openai.com',
      maxTokens: config.maxTokens ?? 1500
    };
  }

  getProviderName(): string {
    return 'codex';
  }

  getModelName(): string {
    return this.config.model;
  }

  async generateText(prompt: string, system?: string, retries: number = 2): Promise<string> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🤖 (Codex) Gerando resposta (tentativa ${attempt}/${retries + 1})...`);
        const messages = [] as Array<{ role: 'system' | 'user'; content: string }>;
        if (system) {
          messages.push({ role: 'system', content: system });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await axios.post(
          `${this.config.apiUrl}/v1/chat/completions`,
          {
            model: this.config.model,
            temperature: 0.3,
            max_tokens: this.config.maxTokens,
            messages
          },
          {
            timeout: 180000,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.apiKey}`
            }
          }
        );

        const text = response.data?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.length > 0) {
          console.log(`✅ Resposta gerada com sucesso (${text.length} caracteres)`);
          return text;
        }

        throw new Error('Resposta vazia do Codex');
      } catch (error: any) {
        const isLastAttempt = attempt === retries + 1;
        const message = error?.response?.data?.error?.message ?? error.message ?? String(error);

        if (error?.response?.status === 401) {
          throw new Error('Credenciais do Codex inválidas ou ausentes');
        }

        if (isLastAttempt) {
          console.error('❌ Erro final ao comunicar com Codex:', message);
          throw new Error(`Falha na comunicação com Codex após ${retries + 1} tentativas: ${message}`);
        }

        console.log(`⚠️  Erro na tentativa ${attempt}, tentando novamente: ${message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Número máximo de tentativas excedido');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/v1/models`, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        }
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        }
      });

      return response.data?.data?.map((m: any) => m.id).filter((id: string) => typeof id === 'string') ?? [];
    } catch {
      return [];
    }
  }

  async ensureModelReady(): Promise<void> {
    const models = await this.listModels();
    if (models.length > 0 && !models.includes(this.config.model)) {
      throw new Error(`Modelo ${this.config.model} não disponível nesta conta do Codex`);
    }
  }
}
