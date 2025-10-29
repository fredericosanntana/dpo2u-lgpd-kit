export interface LanguageModelClient {
  generateText(prompt: string, system?: string, retries?: number): Promise<string>;
  checkHealth(): Promise<boolean>;
  listModels(): Promise<string[]>;
  ensureModelReady(): Promise<void>;
  getProviderName(): string;
  getModelName(): string;
}
