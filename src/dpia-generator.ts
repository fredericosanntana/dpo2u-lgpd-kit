/**
 * Gerador de DPIAs - Pipeline LEANN → LLM → Template
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  DPIAInput,
  DPIAResult,
  LEANNResult,
  RiskLevel,
  LegalBasisLGPD,
} from './types.js';
import { searchLEANN, getDPIAContext } from './leann-client.js';
import { generateContent, SYSTEM_PROMPTS } from './llm-client.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Determina nível de risco baseado em características
 */
function assessRiskLevel(input: DPIAInput): RiskLevel {
  let score = 0;

  // Dados sensíveis aumentam risco
  const sensitiveData = ['saúde', 'biometria', 'origem racial', 'opinião política',
                          'filosofia', 'religião', 'vida sexual'];
  if (input.dataTypes.some(d => sensitiveData.some(s => d.toLowerCase().includes(s)))) {
    score += 30;
  }

  // Dados de crianças aumentam risco
  if (input.dataSubjects.includes('crianças') || input.dataSubjects.includes('menores')) {
    score += 20;
  }

  // Transferência internacional aumenta risco
  if (input.internationalTransfer) {
    score += 15;
  }

  // Decisão automatizada aumenta risco
  if (input.automatedDecision) {
    score += 15;
  }

  // Base legal legítimo interesse aumenta risco
  if (input.legalBasis?.includes('Legítimo interesse')) {
    score += 10;
  }

  // Risco fornecido manualmente tem peso maior
  if (input.riskLevel === 'high') {
    score = Math.max(score, 70);
  } else if (input.riskLevel === 'medium') {
    score = Math.max(score, 40);
  }

  // Classificação final
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 30) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/**
 * Determina base legal sugerida
 */
function suggestLegalBasis(input: DPIAInput): string {
  if (input.legalBasis) {
    return input.legalBasis;
  }

  // Sugestão baseada na atividade
  const purpose = input.processingActivity.toLowerCase();

  if (purpose.includes('marketing') || purpose.includes('publicidade')) {
    return LegalBasisLGPD.CONSENT;
  }
  if (purpose.includes('contrato') || purpose.includes('venda') || purpose.includes('pagamento')) {
    return LegalBasisLGPD.CONTRACT;
  }
  if (purpose.includes('legal') || purpose.includes('judicial') || purpose.includes('fiscal')) {
    return LegalBasisLGPD.LEGAL_PROCESS;
  }
  if (purpose.includes('saúde') || purpose.includes('médico')) {
    return LegalBasisLGPD.HEALTH_PROTECTION;
  }

  return LegalBasisLGPD.LEGITIMATE_INTEREST;
}

/**
 * Estrutura prompt para geração de DPIA
 */
function buildDPIAPrompt(input: DPIAInput, context: LEANNResult[]): string {
  const riskLevel = assessRiskLevel(input);
  const legalBasis = suggestLegalBasis(input);

  // Concatena contexto do LEANN
  const contextText = context
    .map((r, i) => `## Fonte ${i + 1} (relevância: ${(r.score * 100).toFixed(0)}%)\n${r.content}`)
    .join('\n\n');

  return `# Solicitação de DPIA

## Dados da Empresa
- Empresa: ${input.company}
${input.cnpj ? `- CNPJ: ${input.cnpj}` : ''}

## Atividade de Tratamento
- Atividade: ${input.processingActivity}
- Finalidade: ${input.purpose}
- Base Legal: ${legalBasis}

## Dados Pessoais
Categorias de dados:
${input.dataTypes.map(d => `- ${d}`).join('\n')}

Titulares:
${input.dataSubjects.map(s => `- ${s}`).join('\n')}

## Características Especiais
${input.internationalTransfer ? '- ⚠️ Transferência internacional de dados: SIM' : '- Transferência internacional: NÃO'}
${input.automatedDecision ? '- ⚠️ Decisão automatizada: SIM' : '- Decisão automatizada: NÃO'}

## Avaliação Preliminar de Risco
**Nível de Risco:** ${riskLevel}

## Contexto Jurídico e Técnico (do Zettelkasten DPO2U)

${contextText.substring(0, 15000)}

# Tarefa

Gerar um DPIA completo seguindo o template fornecido. O DPIA deve:

1. **Identificação:** Preencher todos os campos de identificação com os dados fornecidos
2. **Base Legal:** Usar "${legalBasis}" e explicar por que é aplicável
3. **Análise de Necessidade:** Justificar por que o tratamento é necessário e proporcional
4. **Avaliação de Riscos:** Listar 5-7 riscos específicos para esta atividade, com:
   - Título claro
   - Descrição detalhada
   - Probabilidade e impacto
   - Medidas de mitigação concretas (3-5 por risco)
   - Risco residual
5. **Medidas de Segurança:** Listar pelo menos 5 medidas técnicas, 5 administrativas e 3 organizacionais
6. **Transferência Internacional:** ${input.internationalTransfer ? 'Descrever países, base legal e medidas adicionais' : 'Indicar que não se aplica'}
7. **Decisão Automatizada:** ${input.automatedDecision ? 'Descrever o processo e direitos do titular' : 'Indicar que não se aplica'}
8. **Plano de Ação:** Listar 5-10 ações específicas com prazos
9. **Registro de Decisão:** Justificar se a atividade pode ou não ser executada

# Formato da Resposta

Retorne um JSON válido com a seguinte estrutura:

\`\`\`json
{
  "necessityAnalysis": "string",
  "proportionalityAnalysis": "string",
  "minimizationMeasures": "string",
  "risks": [
    {
      "title": "string",
      "description": "string",
      "likelihood": "Baixa|Média|Alta",
      "impact": "Baixo|Médio|Alto",
      "riskLevel": "Baixo|Médio|Alto",
      "mitigation": ["string", "string"],
      "residualRisk": "string"
    }
  ],
  "technicalMeasures": [{"title": "string", "description": "string"}],
  "administrativeMeasures": [{"title": "string", "description": "string"}],
  "organizationalMeasures": [{"title": "string", "description": "string"}],
  "internationalTransferCountries": "string",
  "internationalTransferBasis": "string",
  "internationalTransferMeasures": "string",
  "automatedDecisionDescription": "string",
  "automatedDecisionRights": "string",
  "immediateActions": ["string"],
  "mediumTermActions": ["string"],
  "monitoringPlan": "string",
  "overallRiskJustification": "string",
  "decisionJustification": "string",
  "approverName": "string",
  "approverRole": "string"
}
\`\`\`

Use APENAS o contexto fornecido acima. Não invente informações. Se alguma informação não estiver disponível no contexto, use "Deve ser definido pela organização" ou sugira algo genérico mas aplicável.`;
}

/**
 * Gera DPIA completo
 */
export async function generateDPIA(input: DPIAInput): Promise<DPIAResult> {
  const startTime = Date.now();
  logger.info(`Generating DPIA for ${input.company}: ${input.processingActivity}`);

  // Validação
  if (!input.company || !input.processingActivity || !input.purpose) {
    throw new Error('Company, processingActivity, and purpose are required');
  }

  if (!input.dataTypes || input.dataTypes.length === 0) {
    throw new Error('At least one dataType is required');
  }

  if (!input.dataSubjects || input.dataSubjects.length === 0) {
    throw new Error('At least one dataSubject is required');
  }

  // Busca contexto no LEANN
  logger.info('Fetching DPIA context from LEANN...');
  const context = await getDPIAContext(input.processingActivity, input.dataTypes);
  logger.info(`Retrieved ${context.length} relevant documents from LEANN`);

  // Constrói prompt
  const prompt = buildDPIAPrompt(input, context);

  // Gera conteúdo via LLM
  logger.info('Generating DPIA content via LLM...');
  const llmResponse = await generateContent(
    SYSTEM_PROMPTS.DPIA,
    prompt,
    3 // retries
  );

  // Parse JSON do LLM
  let dpiaData: Record<string, any>;
  try {
    // Extrai JSON da resposta (pode ter markdown ao redor)
    const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : llmResponse;
    dpiaData = JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Failed to parse LLM response as JSON:', error);
    throw new Error('Failed to generate DPIA: invalid response from LLM');
  }

  // Carrega template Handlebars
  const templatePath = join(__dirname, 'templates', 'dpia-abnt.hbs');
  const templateContent = readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);

  // Prepara dados para o template
  const riskLevel = assessRiskLevel(input);
  const legalBasis = suggestLegalBasis(input);
  const now = new Date();

  const templateData = {
    company: input.company,
    cnpj: input.cnpj || '',
    processingActivity: input.processingActivity,
    purpose: input.purpose,
    dataTypes: input.dataTypes,
    dataSubjects: input.dataSubjects,
    legalBasis,
    legalBasisDescription: getLegalBasisDescription(legalBasis),
    generatedDate: now.toLocaleDateString('pt-BR'),
    nextReviewDate: new Date(now.setFullYear(now.getFullYear() + 1)).toLocaleDateString('pt-BR'),
    approvalDate: new Date().toLocaleDateString('pt-BR'),
    internationalTransfer: input.internationalTransfer || false,
    automatedDecision: input.automatedDecision || false,
    overallRiskLevel: riskLevel,
    sources: context.slice(0, 5),
    ...dpiaData,
  };

  // Renderiza template
  const dpia = template(templateData);

  const executionTime = Date.now() - startTime;
  logger.info(`DPIA generated successfully in ${executionTime}ms`);

  return {
    dpia,
    metadata: {
      generatedAt: Date.now(),
      company: input.company,
      processingActivity: input.processingActivity,
      riskLevel,
      legalBasis,
      sources: context,
      model: 'gemini-2.0-flash-exp',
    },
  };
}

/**
 * Retorna descrição detalhada da base legal
 */
function getLegalBasisDescription(basis: string): string {
  const descriptions: Record<string, string> = {
    'Art. 7º, I - Consentimento':
      'O titular manifesta vontade livre, informada e inequívoca para o tratamento de seus dados pessoais.',
    'Art. 7º, II - Cumprimento de obrigação legal':
      'Tratamento necessário para cumprimento de obrigação legal ou regulatória pelo controlador.',
    'Art. 7º, III - Execução de políticas públicas':
      'Tratamento necessário para execução de políticas públicas previstas em leis ou regulamentos.',
    'Art. 7º, V - Execução de contrato':
      'Tratamento necessário para execução de contrato ou procedimentos preliminares relacionados.',
    'Art. 7º, IX - Legítimo interesse':
      'Tratamento necessário para legítimo interesse do controlador, desde que não prevaleçam direitos e liberdades fundamentais do titular.',
  };

  return descriptions[basis] || 'Base legal conforme Art. 7º da LGPD.';
}
