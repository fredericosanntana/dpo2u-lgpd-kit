/**
 * Data Flow Mapper - Mapeamento e Visualização de Fluxo de Dados
 *
 * Analisa processamento de dados e gera diagrama Mermaid para
 * visualização completa do fluxo de dados na organização.
 */

import { searchLEANN } from './leann-client.js';
import { LEANNResult } from './types.js';
import { logger } from './logger.js';

/**
 * Input para mapeamento de fluxo de dados
 */
export interface DataFlowInput {
  systemName: string;
  systemDescription?: string;
  dataSources?: DataSource[];
  processingActivities?: ProcessingActivity[];
  thirdParties?: ThirdParty[];
  retentionPeriod?: string;
  internationalTransfer?: boolean;
  countries?: string[];
}

export interface DataSource {
  name: string;
  dataTypes: string[];
  entryPoint: string; // ex: "Web Form", "API", "Mobile App"
  volume?: string; // ex: "1000 registros/dia"
  encryption?: boolean;
}

export interface ProcessingActivity {
  name: string;
  description: string;
  purpose: string;
  legalBasis?: string;
  automatedDecision?: boolean;
  dataTypes: string[];
}

export interface ThirdParty {
  name: string;
  type: 'Processor' | 'Controller' | 'Subprocessor';
  dataShared: string[];
  purpose: string;
  hasDPA?: boolean; // Data Processing Agreement
  country?: string;
}

/**
 * Resultado do mapeamento de fluxo de dados
 */
export interface DataFlowResult {
  systemName: string;
  systemDescription?: string;
  mermaidDiagram: string;
  dataFlows: DataFlow[];
  riskPoints: RiskPoint[];
  complianceGaps: ComplianceGap[];
  recommendations: string[];
  generatedAt: number;
}

export interface DataFlow {
  id: string;
  from: string;
  to: string;
  dataTypes: string[];
  purpose: string;
  encrypted: boolean;
  riskLevel: 'Baixo' | 'Médio' | 'Alto';
}

export interface RiskPoint {
  location: string;
  risk: string;
  level: 'Baixo' | 'Médio' | 'Alto';
  mitigation: string;
  priority: number;
}

export interface ComplianceGap {
  category: string;
  gap: string;
  severity: 'Baixa' | 'Média' | 'Alta';
  remediation: string;
}

/**
 * Gera diagrama Mermaid do fluxo de dados
 */
function generateMermaidDiagram(input: DataFlowInput): string {
  const lines: string[] = ['graph TD'];

  let nodeId = 0;

  // Adicionar fontes de dados
  const sourceIds: string[] = [];
  if (input.dataSources) {
    input.dataSources.forEach((source) => {
      const id = `S${nodeId++}`;
      sourceIds.push(id);
      const encryption = source.encryption ? ' 🔒' : '';
      lines.push(
        `  ${id}[${source.name}${encryption}]`
      );
    });
  }

  // Adicionar sistema principal
  const systemId = `SYS${nodeId++}`;
  lines.push(`  ${systemId}[${input.systemName}]`);

  // Conectar fontes ao sistema
  sourceIds.forEach((sourceId, idx) => {
    const source = input.dataSources?.[idx];
    if (source) {
      const dataTypes = source.dataTypes.slice(0, 3).join(', ');
      lines.push(
        `  ${sourceId} -->|"${dataTypes}"| ${systemId}`
      );
    }
  });

  // Adicionar atividades de processamento
  const processingIds: string[] = [];
  if (input.processingActivities) {
    input.processingActivities.forEach((activity) => {
      const id = `P${nodeId++}`;
      processingIds.push(id);
      const icon = activity.automatedDecision ? ' 🤖' : '';
      lines.push(
        `  ${id}[${activity.name}${icon}]`
      );
      lines.push(
        `  ${systemId} -->|"${activity.purpose}"| ${id}`
      );
    });
  }

  // Adicionar terceiros
  const thirdPartyIds: string[] = [];
  if (input.thirdParties && input.thirdParties.length > 0) {
    input.thirdParties.forEach((tp) => {
      const id = `T${nodeId++}`;
      thirdPartyIds.push(id);
      const dpa = tp.hasDPA ? ' ✅' : ' ⚠️';
      const country = tp.country ? ` (${tp.country})` : '';
      lines.push(
        `  ${id}[${tp.name}${country}${dpa}]`
      );
      lines.push(
        `  ${systemId} -->|"${tp.dataShared.slice(0, 2).join(', ')}"| ${id}`
      );
    });
  }

  // Adicionar armazenamento
  const storageId = `STO${nodeId++}`;
  lines.push(`  ${storageId}[Armazenamento${input.internationalTransfer ? ' ☁️' : ''}]`);
  processingIds.forEach((pid) => {
    lines.push(`  ${pid} -->|"Armazenar"| ${storageId}`);
  });

  // Adicionar legenda
  lines.push('');
  lines.push('  classDef encrypted fill:#90EE90,stroke:#333,stroke-width:2px');
  lines.push('  classDef automated fill:#FFD700,stroke:#333,stroke-width:2px');
  lines.push('  classDef international fill:#87CEEB,stroke:#333,stroke-width:2px');
  lines.push('  classDef noDPA fill:#FFB6C1,stroke:#333,stroke-width:2px');

  // Aplicar classes
  input.dataSources?.forEach((source, idx) => {
    if (source.encryption) {
      lines.push(`  class S${idx} encrypted`);
    }
  });

  input.processingActivities?.forEach((activity, idx) => {
    if (activity.automatedDecision) {
      lines.push(`  class P${idx} automated`);
    }
  });

  if (input.internationalTransfer) {
    lines.push(`  class ${storageId} international`);
  }

  input.thirdParties?.forEach((tp, idx) => {
    if (!tp.hasDPA) {
      lines.push(`  class T${idx} noDPA`);
    }
  });

  return lines.join('\n');
}

/**
 * Identifica pontos de risco no fluxo de dados
 */
function identifyRiskPoints(input: DataFlowInput): RiskPoint[] {
  const risks: RiskPoint[] = [];
  let priority = 1;

  // Verificar criptografia
  if (input.dataSources) {
    input.dataSources.forEach((source) => {
      if (!source.encryption) {
        risks.push({
          location: source.name,
          risk: 'Dados transmitidos sem criptografia',
          level: 'Alto',
          mitigation: 'Implementar criptografia TLS 1.3 em trânsito',
          priority: priority++,
        });
      }
    });
  }

  // Verificar transferência internacional
  if (input.internationalTransfer) {
    risks.push({
      location: 'Transferência Internacional',
      risk: 'Dados transferidos para outros países',
      level: 'Alto',
      mitigation: 'Estabelecer cláusulas contratuais padrão da UE/SCC',
      priority: priority++,
    });
  }

  // Verificar DPA com terceiros
  if (input.thirdParties) {
    input.thirdParties.forEach((tp) => {
      if (!tp.hasDPA) {
        risks.push({
          location: tp.name,
          risk: 'Terceiro sem acordo de processamento de dados',
          level: 'Alto',
          mitigation: 'Assinar DPA (Data Processing Agreement)',
          priority: priority++,
        });
      }
    });
  }

  // Verificar decisão automatizada
  if (input.processingActivities) {
    input.processingActivities.forEach((activity) => {
      if (activity.automatedDecision) {
        risks.push({
          location: activity.name,
          risk: 'Decisão automatizada sem revisão humana',
          level: 'Médio',
          mitigation: 'Implementar mecanismo de revisão e contestação',
          priority: priority++,
        });
      }
    });
  }

  // Verificar retenção
  if (!input.retentionPeriod) {
    risks.push({
      location: 'Armazenamento',
      risk: 'Período de retenção não definido',
      level: 'Médio',
      mitigation: 'Definir política de retenção baseada na necessidade',
      priority: priority++,
    });
  }

  return risks;
}

/**
 * Identifica gaps de conformidade
 */
function identifyComplianceGaps(input: DataFlowInput): ComplianceGap[] {
  const gaps: ComplianceGap[] = [];

  // Base legal
  if (input.processingActivities) {
    const missingLegalBasis = input.processingActivities.filter(
      (a) => !a.legalBasis
    );
    if (missingLegalBasis.length > 0) {
      gaps.push({
        category: 'Base Legal',
        gap: `${missingLegalBasis.length} atividades sem base legal definida`,
        severity: missingLegalBasis.length > 2 ? 'Alta' : 'Média',
        remediation: 'Documentar base legal para cada atividade (Art. 7º LGPD)',
      });
    }
  }

  // DPA com terceiros
  if (input.thirdParties) {
    const missingDPA = input.thirdParties.filter((tp) => !tp.hasDPA);
    if (missingDPA.length > 0) {
      gaps.push({
        category: 'Terceiros',
        gap: `${missingDPA.length} terceiros sem DPA`,
        severity: 'Alta',
        remediation: 'Assinar acordos de processamento de dados com todos terceiros',
      });
    }
  }

  // Criptografia
  if (input.dataSources) {
    const unencrypted = input.dataSources.filter((s) => !s.encryption);
    if (unencrypted.length > 0) {
      gaps.push({
        category: 'Segurança',
        gap: `${unencrypted.length} fontes sem criptografia`,
        severity: 'Alta',
        remediation: 'Implementar criptografia em todas as fontes de dados',
      });
    }
  }

  // Transferência internacional
  if (input.internationalTransfer && !input.countries?.length) {
    gaps.push({
      category: 'Transferência Internacional',
      gap: 'Países de destino não especificados',
      severity: 'Média',
      remediation: 'Documentar todos países de destino e medidas de segurança',
    });
  }

  return gaps;
}

/**
 * Gera recomendações baseado no fluxo de dados
 */
function generateRecommendations(
  input: DataFlowInput,
  risks: RiskPoint[],
  gaps: ComplianceGap[]
): string[] {
  const recommendations: string[] = [];

  // Recomendações de segurança
  if (risks.some((r) => r.location.includes('criptografia'))) {
    recommendations.push('🔒 **Segurança**: Implementar criptografia de ponta a ponta');
  }

  // Recomendações de terceiros
  if (gaps.some((g) => g.category === 'Terceiros')) {
    recommendations.push('📋 **Contratos**: Revisar e atualizar todos acordos com terceiros');
  }

  // Recomendações de base legal
  if (gaps.some((g) => g.category === 'Base Legal')) {
    recommendations.push('⚖️ **Legal**: Documentar base legal LGPD para todas atividades');
  }

  // Recomendações de retenção
  if (!input.retentionPeriod) {
    recommendations.push(
      '⏰ **Retenção**: Definir política de retenção de dados (mínimo necessário)'
    );
  }

  // Recomendações de decisão automatizada
  if (input.processingActivities?.some((a) => a.automatedDecision)) {
    recommendations.push(
      '🤖 **IA**: Implementar direito de explicação para decisões automatizadas'
    );
  }

  // Recomendações de transferência internacional
  if (input.internationalTransfer) {
    recommendations.push(
      '🌍 **Internacional**: Estabelecer cláusulas contratuais padrão (SCCs)'
    );
  }

  return recommendations;
}

/**
 * Analisa e mapeia fluxo de dados completo
 */
export async function mapDataFlow(
  input: DataFlowInput
): Promise<DataFlowResult> {
  const startTime = Date.now();
  logger.info(`Mapping data flow for ${input.systemName}...`);

  // Validação
  if (!input.systemName) {
    throw new Error('System name is required');
  }

  // Buscar contexto LEANN
  let leannContext: LEANNResult[] = [];
  try {
    const searchQuery = input.dataSources
      ? `fluxo de dados LGPD ${input.dataSources[0].dataTypes.join(' ')}`
      : 'mapeamento fluxo de dados LGPD';

    leannContext = await searchLEANN({
      query: searchQuery,
      topK: 5,
      complexity: 32,
    });
    logger.info(`Retrieved ${leannContext.length} relevant documents from LEANN`);
  } catch (error) {
    logger.warn('Failed to fetch LEANN context:', error);
  }

  // Gerar diagrama Mermaid
  const mermaidDiagram = generateMermaidDiagram(input);

  // Identificar riscos
  const riskPoints = identifyRiskPoints(input);

  // Identificar gaps
  const complianceGaps = identifyComplianceGaps(input);

  // Gerar recomendações
  const recommendations = generateRecommendations(
    input,
    riskPoints,
    complianceGaps
  );

  // Extrair fluxos de dados estruturados
  const dataFlows: DataFlow[] = [];
  let flowId = 0;

  if (input.dataSources && input.processingActivities) {
    input.dataSources.forEach((source) => {
      input.processingActivities!.forEach((activity) => {
        const intersection = source.dataTypes.filter((value) =>
          activity.dataTypes.includes(value)
        );

        if (intersection.length > 0) {
          dataFlows.push({
            id: `DF${flowId++}`,
            from: source.name,
            to: activity.name,
            dataTypes: intersection,
            purpose: activity.purpose,
            encrypted: source.encryption || false,
            riskLevel: assessFlowRisk(
              source,
              activity,
              input.internationalTransfer
            ),
          });
        }
      });
    });
  }

  const result: DataFlowResult = {
    systemName: input.systemName,
    systemDescription: input.systemDescription,
    mermaidDiagram,
    dataFlows,
    riskPoints,
    complianceGaps,
    recommendations,
    generatedAt: Date.now(),
  };

  const executionTime = Date.now() - startTime;
  logger.info(`Data flow mapped in ${executionTime}ms: ${dataFlows.length} flows, ${riskPoints.length} risks`);

  return result;
}

/**
 * Avalia nível de risco de um fluxo específico
 */
function assessFlowRisk(
  source: DataSource,
  activity: ProcessingActivity,
  internationalTransfer?: boolean
): 'Baixo' | 'Médio' | 'Alto' {
  let score = 0;

  // Criptografia reduz risco
  if (!source.encryption) score += 2;

  // Decisão automatizada aumenta risco
  if (activity.automatedDecision) score += 2;

  // Transferência internacional aumenta risco
  if (internationalTransfer) score += 2;

  // Volume de dados aumenta risco
  if (source.volume && source.volume.includes('mil')) score += 1;

  if (score >= 4) return 'Alto';
  if (score >= 2) return 'Médio';
  return 'Baixo';
}
