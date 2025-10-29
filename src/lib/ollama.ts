import axios from 'axios';

export interface OllamaConfig {
  url: string;
  model: string;
}

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  async generateText(prompt: string, system?: string): Promise<string> {
    try {
      const response = await axios.post(`${this.config.url}/api/generate`, {
        model: this.config.model,
        prompt: prompt,
        system: system,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 2000
        }
      }, {
        timeout: 60000
      });

      return response.data.response;
    } catch (error) {
      console.error('Erro ao conectar com Ollama:', error);
      throw new Error(`Falha na comunicação com Ollama: ${error}`);
    }
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
}