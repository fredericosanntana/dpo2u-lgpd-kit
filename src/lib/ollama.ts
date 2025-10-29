import axios from 'axios';
import { LanguageModelClient } from './llm.js';

export interface OllamaConfig {
  url: string;
  model: string;
}

export class OllamaClient implements LanguageModelClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  getProviderName(): string {
    return 'ollama';
  }

  getModelName(): string {
    return this.config.model;
  }

  async generateText(prompt: string, system?: string, retries: number = 2): Promise<string> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🤖 Gerando resposta (tentativa ${attempt}/${retries + 1})...`);

        const response = await axios.post(`${this.config.url}/api/generate`, {
          model: this.config.model,
          prompt: prompt,
          system: system,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 1500
          }
        }, {
          timeout: 180000, // 3 minutos
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.response) {
          console.log(`✅ Resposta gerada com sucesso (${response.data.response.length} caracteres)`);
          return response.data.response;
        } else {
          throw new Error('Resposta vazia do Ollama');
        }

      } catch (error: any) {
        const isLastAttempt = attempt === retries + 1;

        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama não está rodando. Execute: ollama serve');
        }

        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
          console.log(`⏱️  Timeout na tentativa ${attempt}. ${isLastAttempt ? 'Falhando...' : 'Tentando novamente...'}`);
          if (!isLastAttempt) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s antes de tentar novamente
            continue;
          }
        }

        if (isLastAttempt) {
          console.error('❌ Erro final ao comunicar com Ollama:', error.message);
          throw new Error(`Falha na comunicação com Ollama após ${retries + 1} tentativas: ${error.message}`);
        }

        console.log(`⚠️  Erro na tentativa ${attempt}, tentando novamente: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Número máximo de tentativas excedido');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.url}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.url}/api/tags`);
      return response.data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  async ensureModelReady(): Promise<void> {
    await this.ensureModelLoaded();
  }

  async ensureModelLoaded(): Promise<void> {
    try {
      console.log(`🔄 Verificando se modelo ${this.config.model} está disponível...`);

      // Tentar uma requisição pequena para carregar o modelo
      await axios.post(`${this.config.url}/api/generate`, {
        model: this.config.model,
        prompt: 'teste',
        stream: false,
        options: {
          num_predict: 1
        }
      }, {
        timeout: 30000
      });

      console.log(`✅ Modelo ${this.config.model} carregado e pronto`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Modelo ${this.config.model} não encontrado. Execute: ollama pull ${this.config.model}`);
      }
      console.log(`⚠️  Modelo pode estar carregando... Continuando...`);
    }
  }
}