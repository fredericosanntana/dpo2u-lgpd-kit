/**
 * Gerador de Checklists de Auditoria LGPD
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AuditInput, AuditResult, LEANNResult } from './types.js';
import { getAuditContext } from './leann-client.js';
import { generateContent, SYSTEM_PROMPTS } from './llm-client.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gera checklist de auditoria completo
 */
export async function generateAudit(input: AuditInput): Promise<AuditResult> {
  const startTime = Date.now();
  logger.info(`Generating audit for ${input.company}: scope=${input.auditScope}, framework=${input.framework}`);

  // Validação
  if (!input.company) {
    throw new Error('Company is required');
  }

  // Framework padrão
  const framework = input.framework || 'lgpd';

  // Busca contexto no LEANN
  logger.info('Fetching audit context from LEANN...');
  const context = await getAuditContext(framework, input.auditScope);
  logger.info(`Retrieved ${context.length} relevant documents from LEANN`);

  // Constrói prompt
  const prompt = buildAuditPrompt(input, context);

  // Gera conteúdo via LLM
  logger.info('Generating audit checklist via LLM...');
  const llmResponse = await generateContent(
    SYSTEM_PROMPTS.AUDIT,
    prompt,
    3
  );

  // Parse JSON do LLM
  let auditData: Record<string, any>;
  try {
    const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : llmResponse;
    auditData = JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Failed to parse LLM response as JSON:', error);
    throw new Error('Failed to generate audit: invalid response from LLM');
  }

  // Carrega template Handlebars
  const templatePath = join(__dirname, 'templates', 'audit-lgpd.hbs');
  const templateContent = readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);

  // Prepara dados para o template
  const now = new Date();
  const nextAuditDate = new Date(now);
  nextAuditDate.setFullYear(nextAuditDate.getFullYear() + 1);

  const templateData = {
    company: input.company,
    cnpj: input.cnpj || '',
    auditDate: now.toLocaleDateString('pt-BR'),
    nextAuditDate: nextAuditDate.toLocaleDateString('pt-BR'),
    scope: input.auditScope,
    framework: framework.toUpperCase(),
    auditorName: 'DPO2U Compliance-as-a-Service',
    sources: context.slice(0, 5),
    ...auditData,
  };

  // Renderiza template
  const audit = template(templateData);

  const executionTime = Date.now() - startTime;
  logger.info(`Audit checklist generated successfully in ${executionTime}ms`);

  return {
    audit,
    metadata: {
      generatedAt: Date.now(),
      company: input.company,
      framework,
      scope: input.auditScope,
      sources: context,
      model: 'gemini-2.0-flash-exp',
    },
  };
}

/**
 * Constrói prompt para geração de auditoria
 */
function buildAuditPrompt(input: AuditInput, context: LEANNResult[]): string {
  const framework = input.framework || 'lgpd';

  // Concatena contexto do LEANN
  const contextText = context
    .map((r, i) => `## Fonte ${i + 1}\n${r.content}`)
    .join('\n\n');

  return `# Solicitação de Auditoria de Compliance

## Dados da Empresa
- Empresa: ${input.company}
${input.cnpj ? `- CNPJ: ${input.cnpj}` : ''}

## Escopo da Auditoria
- **Escopo:** ${input.auditScope}
- **Framework:** ${framework.toUpperCase()}
${input.areas ? `- **Áreas Focais:** ${input.areas.join(', ')}` : ''}

## Contexto Jurídico e Técnico

${contextText.substring(0, 12000)}

# Tarefa

Gerar os seguintes dados para preencher o checklist de auditoria:

1. **totalControls**: Número total de controles no checklist (sugestão: 35-50)
2. **conformCount**: Número de controles "Conforme" (simule uma amostra realista)
3. **partialCount**: Número de controles "Parcialmente Conforme"
4. **nonConformCount**: Número de controles "Não Conforme"
5. **naCount**: Número de controles "Não Aplicável"
6. **conformityPercent**: Percentual de conformidade (0-100)
7. **overallRiskLevel**: Nível de risco geral (Baixo/Médio/Alto)
8. **criticalFindings**: Array de não conformidades críticas (3-5 itens), cada uma com:
   - title: Título
   - severity: Severidade (Alta/Média/Baixa)
   - recommendation: Recomendação específica
9. **priorityActions**: Array de ações prioritárias (5-10 itens), cada uma com:
   - action: Descrição da ação
   - deadline: Prazo sugerido (ex: "30 dias", "60 dias")

# Formato da Resposta

Retorne um JSON válido:

\`\`\`json
{
  "totalControls": 40,
  "conformCount": 25,
  "partialCount": 10,
  "nonConformCount": 5,
  "naCount": 0,
  "conformityPercent": 62.5,
  "overallRiskLevel": "Médio",
  "criticalFindings": [
    {
      "title": "Ausência de DPIA para tratamento de dados sensíveis",
      "severity": "Alta",
      "recommendation": "Realizar DPIA para todas as atividades de alto risco conforme Art. 38 da LGPD"
    }
  ],
  "priorityActions": [
    {
      "action": "Nomear Encarregado (DPO) formalmente",
      "deadline": "15 dias"
    }
  ]
}
\`\`\`

Baseie-se no contexto fornecido para criar uma auditoria realista e específica para o tipo de empresa.`;
}
