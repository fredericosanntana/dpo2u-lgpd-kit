/**
 * Cliente LLM - Integração com Gemini via proxy
 */

import { logger } from './logger.js';
import { LLMResponse } from './types.js';

const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL || 'http://127.0.0.1:8045';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_MAX_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10);
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || '0.3');

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Chama a API Gemini via proxy local
 */
export async function callGemini(request: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();

  logger.info(`Calling Gemini: model=${GEMINI_MODEL}, messages=${request.messages.length}`);

  try {
    const response = await fetch(`${GEMINI_PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || GEMINI_MODEL,
        messages: request.messages,
        temperature: request.temperature ?? GEMINI_TEMPERATURE,
        max_tokens: request.maxTokens ?? GEMINI_MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      model?: string;
      usage?: { total_tokens?: number };
    };
    const executionTime = Date.now() - startTime;

    const result: LLMResponse = {
      content: data.choices[0]?.message?.content || '',
      model: data.model || GEMINI_MODEL,
      tokensUsed: data.usage?.total_tokens,
      finishReason: data.choices[0]?.finish_reason,
    };

    logger.info(`Gemini response received: tokens=${result.tokensUsed}, time=${executionTime}ms`);

    return result;
  } catch (error) {
    logger.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * Gera conteúdo usando Gemini com retry
 */
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  retries = 3
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await callGemini({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      return response.content;
    } catch (error) {
      logger.error(`Generation attempt ${i + 1} failed:`, error);

      if (i === retries - 1) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw new Error('Generation failed after retries');
}

/**
 * System prompts específicos para cada tipo de documento
 */
export const SYSTEM_PROMPTS = {
  DPIA: `Você é um especialista em LGPD/GDPR e Data Protection Officer (DPO) certificado.

Sua tarefa é gerar Relatórios de Impacto à Proteção de Dados (DPIA/RIA) completos, estruturados e tecnicamente precisos.

REGRAS:
1. Seguir formato ABNT NBR 15287:2011 (Informação e documentação - Relatório técnico e/ou científico)
2. Citar artigos LGPD/GDPR específicos relevantes
3. Identificar e classificar riscos de privacidade (Baixo/Médio/Alto)
4. Propor medidas de mitigação concretas e acionáveis
5. Usar linguagem formal técnica, mas acessível
6. Incluir seções: identificação do tratamento, bases legais, análise de necessidades, avaliação de riscos, medidas de mitigação

NÃO invente informações. Use apenas o contexto fornecido e conhecimento jurídico estabelecido.`,

  AUDIT: `Você é um auditor de segurança e privacidade certificado (ISO 27001 Lead Auditor, CIPP/E, CISSP).

Sua tarefa é gerar checklists de auditoria de compliance LGPD/GDPR detalhados e acionáveis.

REGRAS:
1. Seguir estrutura padrão de auditoria (domínio, controle, evidência, status)
2. Cobrir todos os artigos relevantes do framework escolhido
3. Incluir referências às normas (LGPD Art. XX, GDPR Art. YY, ISO 27001 § ZZ)
4. Priorizar controles baseados em risco
5. Propor evidências objetivas que possam ser verificadas
6. Usar linguagem de auditoria profissional (deveria, deve, deve ser)

NÃO invente controles. Use apenas práticas reconhecidas internacionalmente.`,

  POLICY: `Você é um advogado especialista em direito digital e proteção de dados.

Sua tarefa é gerar políticas de privacidade e termos de uso conformes com LGPD/GDPR.

REGRAS:
1. Linguagem jurídica clara e objetiva
2. Citar artigos específicos quando relevante
3. Equilibrar proteção de dados com usabilidade
4. Incluir todos os direitos dos titulares
5. Descrever canais de atendimento (DPO, ANPD, etc.)
6. Personalizar para o tipo de negócio

NÃO copie políticas genéricas. Gere documento específico para o contexto.`,
};
