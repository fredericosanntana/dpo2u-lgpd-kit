
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LanguageModelClient } from './llm.js';

export interface GeminiConfig {
    apiKey: string;
    model: string;
}

export class GeminiClient implements LanguageModelClient {
    private config: GeminiConfig;
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(config: GeminiConfig) {
        this.config = config;
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.model });
    }

    getProviderName(): string {
        return 'gemini';
    }

    getModelName(): string {
        return this.config.model;
    }

    async generateText(prompt: string, system?: string, retries: number = 2): Promise<string> {
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                console.log(`🤖 (Gemini) Gerando resposta (tentativa ${attempt}/${retries + 1})...`);

                let finalPrompt = prompt;
                if (system) {
                    finalPrompt = `${system}\n\n${prompt}`;
                }

                const result = await this.model.generateContent(finalPrompt);
                const response = await result.response;
                const text = response.text();

                if (text && text.length > 0) {
                    console.log(`✅ Resposta gerada com sucesso (${text.length} caracteres)`);
                    return text;
                }

                throw new Error('Resposta vazia do Gemini');
            } catch (error: any) {
                const isLastAttempt = attempt === retries + 1;
                const message = error.message || String(error);

                if (message.includes('API key') || message.includes('403')) {
                    throw new Error('Chave de API do Gemini inválida ou permissão negada');
                }

                if (isLastAttempt) {
                    console.error('❌ Erro final ao comunicar com Gemini:', message);
                    throw new Error(`Falha na comunicação com Gemini após ${retries + 1} tentativas: ${message}`);
                }

                console.log(`⚠️  Erro na tentativa ${attempt}, tentando novamente: ${message}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        throw new Error('Número máximo de tentativas excedido');
    }

    async checkHealth(): Promise<boolean> {
        try {
            // Teste simples para verificar conectividade e chave
            // Usamos 'gemini-1.5-flash' apenas para teste rápido se o modelo configurado falhar de cara, 
            // mas é melhor testar o modelo configurado ou um leve.
            // Vamos tentar gerar algo bem curto com o modelo configurado.
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 1 }
            });
            await result.response;
            return true;
        } catch (error) {
            // Se falhar, pode ser timeout ou chave.
            return false;
        }
    }

    async listModels(): Promise<string[]> {
        // @google/generative-ai não expõe listagem facilmente no client padrão web/node unificado dessa forma simples sem managers
        // Retornamos os mais comuns conhecidos
        return ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
    }

    async ensureModelReady(): Promise<void> {
        const healthy = await this.checkHealth();
        if (!healthy) {
            throw new Error(`Modelo ${this.config.model} não disponível ou chave inválida`);
        }
    }
}
