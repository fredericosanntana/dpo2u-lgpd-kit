import axios from 'axios';
import { LanguageModelClient } from './llm.js';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
  maxTokens?: number;
}

export class AnthropicClient implements LanguageModelClient {
  private config: Required<Omit<AnthropicConfig, 'apiUrl' | 'maxTokens'>> & { apiUrl: string; maxTokens: number };

  constructor(config: AnthropicConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model,
      apiUrl: config.apiUrl ?? 'https://api.anthropic.com',
      maxTokens: config.maxTokens ?? 1500
    };
  }

  getProviderName(): string {
    return 'claude';
  }

  getModelName(): string {
    return this.config.model;
  }

  async generateText(prompt: string, system?: string, retries: number = 2): Promise<string> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🤖 (Claude) Gerando resposta (tentativa ${attempt}/${retries + 1})...`);
        const response = await axios.post(
          `${this.config.apiUrl}/v1/messages`,
          {
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: 0.3,
            system,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          {
            timeout: 180000,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.config.apiKey,
              'anthropic-version': '2023-06-01'
            }
          }
        );

        const text = response.data?.content?.[0]?.text;
        if (text) {
          console.log(`✅ Resposta gerada com sucesso (${text.length} caracteres)`);
          return text;
        }

        throw new Error('Resposta vazia do Claude');
      } catch (error: any) {
        const isLastAttempt = attempt === retries + 1;
        const message = error?.response?.data?.error?.message ?? error.message ?? String(error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          throw new Error('Credenciais do Claude inválidas ou ausentes');
        }

        if (isLastAttempt) {
          console.error('❌ Erro final ao comunicar com Claude:', message);
          throw new Error(`Falha na comunicação com Claude após ${retries + 1} tentativas: ${message}`);
        }

        console.log(`⚠️  Erro na tentativa ${attempt}, tentando novamente: ${message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Número máximo de tentativas excedido');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/v1/models`,
        {
          timeout: 10000,
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.status === 200;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/v1/models`,
        {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.data?.data?.map((m: any) => m.id).filter((id: string) => typeof id === 'string') ?? [];
    } catch {
      return [];
    }
  }

  async ensureModelReady(): Promise<void> {
    const models = await this.listModels();
    if (models.length > 0 && !models.includes(this.config.model)) {
      throw new Error(`Modelo ${this.config.model} não disponível para esta conta do Claude`);
    }
  }
}
