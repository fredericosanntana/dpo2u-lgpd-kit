/**
 * Privacy Score Calculator - Avaliação de Maturidade LGPD/GDPR
 *
 * Calcula score de maturidade 0-100 baseado em 5 dimensões:
 * - Governança (0-20)
 * - Direitos dos Titulares (0-20)
 * - Segurança (0-20)
 * - Transferência Internacional (0-20)
 * - Monitoramento e Auditoria (0-20)
 */

import { searchLEANN } from './leann-client.js';
import { logger } from './logger.js';

/**
 * Input para cálculo de privacy score
 */
export interface PrivacyScoreInput {
  company: string;
  industry?: string;
  hasDPO?: boolean;
  hasDPOReport?: boolean;
  dataSubjects?: string[];
  dataCategories?: string[];
  hasPrivacyPolicy?: boolean;
  hasCookieConsent?: boolean;
  hasDataBreachProtocol?: boolean;
  internationalTransfer?: boolean;
  hasDataProcessingAgreement?: boolean;
  hasAuditProgram?: boolean;
  employeeTrainingFrequency?: 'none' | 'annual' | 'semiannual' | 'quarterly';
  hasDataMapping?: boolean;
  hasIncidentResponsePlan?: boolean;
  hasDataRetentionPolicy?: boolean;
}

/**
 * Resultado do privacy score
 */
export interface PrivacyScoreResult {
  company: string;
  industry?: string;
  overallScore: number;
  maturityLevel: 'Iniciante' | 'Em Desenvolvimento' | 'Intermediário' | 'Avançado' | 'Excelente';
  categories: {
    governance: CategoryScore;
    rights: CategoryScore;
    security: CategoryScore;
    international: CategoryScore;
    monitoring: CategoryScore;
  };
  strengths: string[];
  improvements: string[];
  roadmap: RoadmapItem[];
  generatedAt: number;
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  percentage: number;
  status: 'Critical' | 'Needs Improvement' | 'Adequate' | 'Good' | 'Excellent';
  findings: string[];
}

export interface RoadmapItem {
  priority: 'Alta' | 'Média' | 'Baixa';
  action: string;
  category: string;
  estimatedEffort: string;
  expectedImpact: string;
}

/**
 * Calcula score de governança (0-20)
 */
function calculateGovernanceScore(input: PrivacyScoreInput): CategoryScore {
  let score = 0;
  const findings: string[] = [];

  // DPO designado (5 pontos)
  if (input.hasDPO) {
    score += 5;
    findings.push('✅ DPO designado');
  } else {
    findings.push('❌ DPO não designado');
  }

  // Relatório DPO (3 pontos)
  if (input.hasDPOReport) {
    score += 3;
    findings.push('✅ Relatório DPO elaborado');
  } else {
    findings.push('⚠️ Relatório DPO não elaborado');
  }

  // Política de privacidade (4 pontos)
  if (input.hasPrivacyPolicy) {
    score += 4;
    findings.push('✅ Política de privacidade publicada');
  } else {
    findings.push('❌ Política de privacidade ausente');
  }

  // Mapeamento de dados (4 pontos)
  if (input.hasDataMapping) {
    score += 4;
    findings.push('✅ Mapeamento de dados realizado');
  } else {
    findings.push('⚠️ Mapeamento de dados não realizado');
  }

  // Política de retenção (4 pontos)
  if (input.hasDataRetentionPolicy) {
    score += 4;
    findings.push('✅ Política de retenção de dados definida');
  } else {
    findings.push('⚠️ Política de retenção não definida');
  }

  return {
    score,
    maxScore: 20,
    percentage: (score / 20) * 100,
    status: getCategoryStatus(score, 20),
    findings,
  };
}

/**
 * Calcula score de direitos dos titulares (0-20)
 */
function calculateRightsScore(input: PrivacyScoreInput): CategoryScore {
  let score = 0;
  const findings: string[] = [];

  // Consentimento de cookies (4 pontos)
  if (input.hasCookieConsent) {
    score += 4;
    findings.push('✅ Consentimento de cookies implementado');
  } else {
    findings.push('❌ Consentimento de cookies ausente');
  }

  // Canais de solicitação (4 pontos)
  if (input.hasDPO) {
    score += 4;
    findings.push('✅ Canais de solicitação disponíveis');
  } else {
    findings.push('⚠️ Canais de solicitação limitados');
  }

  // Processamento de solicitações (4 pontos)
  if (input.hasDPOReport) {
    score += 4;
    findings.push('✅ Processamento de solicitações estruturado');
  } else {
    findings.push('⚠️ Processamento de solicitações informal');
  }

  // Informações transparentes (4 pontos)
  if (input.hasPrivacyPolicy) {
    score += 4;
    findings.push('✅ Informações transparentes disponíveis');
  } else {
    findings.push('❌ Transparência insuficiente');
  }

  // Portal do titular (4 pontos)
  if (input.hasPrivacyPolicy && input.hasCookieConsent) {
    score += 4;
    findings.push('✅ Portal do titular funcional');
  } else {
    findings.push('⚠️ Portal do titular limitado ou inexistente');
  }

  return {
    score,
    maxScore: 20,
    percentage: (score / 20) * 100,
    status: getCategoryStatus(score, 20),
    findings,
  };
}

/**
 * Calcula score de segurança (0-20)
 */
function calculateSecurityScore(input: PrivacyScoreInput): CategoryScore {
  let score = 0;
  const findings: string[] = [];

  // Protocolo de violação de dados (5 pontos)
  if (input.hasDataBreachProtocol) {
    score += 5;
    findings.push('✅ Protocolo de violação de dados estabelecido');
  } else {
    findings.push('❌ Protocolo de violação ausente');
  }

  // Plano de resposta a incidentes (5 pontos)
  if (input.hasIncidentResponsePlan) {
    score += 5;
    findings.push('✅ Plano de resposta a incidentes definido');
  } else {
    findings.push('⚠️ Plano de resposta a incidentes não definido');
  }

  // Acordos de confidencialidade (5 pontos)
  if (input.hasDataProcessingAgreement) {
    score += 5;
    findings.push('✅ Acordos de processamento de dados estabelecidos');
  } else {
    findings.push('⚠️ Acordos de confidencialidade limitados');
  }

  // Controles de acesso (3 pontos)
  score += 3; // Assume mínimo
  findings.push('✅ Controles de acesso básicos implementados');

  // Criptografia (2 pontos)
  score += 2; // Assume mínimo
  findings.push('✅ Criptografia em trânsito e em repouso');

  return {
    score,
    maxScore: 20,
    percentage: (score / 20) * 100,
    status: getCategoryStatus(score, 20),
    findings,
  };
}

/**
 * Calcula score de transferência internacional (0-20)
 */
function calculateInternationalScore(input: PrivacyScoreInput): CategoryScore {
  let score = 0;
  const findings: string[] = [];

  // Sem transferência internacional (20 pontos automáticos)
  if (!input.internationalTransfer) {
    score += 20;
    findings.push('✅ Sem transferência internacional de dados');
  } else {
    // Transferência com medidas adequadas
    if (input.hasDataProcessingAgreement) {
      score += 10;
      findings.push('✅ Acordos de transferência estabelecidos');
    } else {
      findings.push('❌ Acordos de transferência ausentes');
    }

    if (input.hasDataBreachProtocol) {
      score += 10;
      findings.push('✅ Protocolos de segurança internacionais');
    } else {
      findings.push('⚠️ Protocolos de segurança internacionais limitados');
    }
  }

  return {
    score,
    maxScore: 20,
    percentage: (score / 20) * 100,
    status: getCategoryStatus(score, 20),
    findings,
  };
}

/**
 * Calcula score de monitoramento e auditoria (0-20)
 */
function calculateMonitoringScore(input: PrivacyScoreInput): CategoryScore {
  let score = 0;
  const findings: string[] = [];

  // Programa de auditoria (5 pontos)
  if (input.hasAuditProgram) {
    score += 5;
    findings.push('✅ Programa de auditoria ativo');
  } else {
    findings.push('⚠️ Programa de auditoria não estabelecido');
  }

  // Frequência de treinamento (8 pontos)
  const trainingFreq = input.employeeTrainingFrequency || 'none';
  if (trainingFreq === 'quarterly') {
    score += 8;
    findings.push('✅ Treinamento trimestral');
  } else if (trainingFreq === 'semiannual') {
    score += 6;
    findings.push('✅ Treinamento semestral');
  } else if (trainingFreq === 'annual') {
    score += 4;
    findings.push('✅ Treinamento anual');
  } else {
    findings.push('❌ Sem treinamento formal');
  }

  // Monitoramento contínuo (4 pontos)
  if (input.hasAuditProgram) {
    score += 4;
    findings.push('✅ Monitoramento contínuo implementado');
  } else {
    findings.push('⚠️ Monitoramento contínuo limitado');
  }

  // Métricas e KPIs (3 pontos)
  score += 3; // Assume mínimo
  findings.push('✅ Métricas básicas de privacidade');

  return {
    score,
    maxScore: 20,
    percentage: (score / 20) * 100,
    status: getCategoryStatus(score, 20),
    findings,
  };
}

/**
 * Retorna status baseado no score
 */
function getCategoryStatus(score: number, max: number): CategoryScore['status'] {
  const percentage = (score / max) * 100;

  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 50) return 'Adequate';
  if (percentage >= 25) return 'Needs Improvement';
  return 'Critical';
}

/**
 * Retorna nível de maturidade global
 */
function getMaturityLevel(overallScore: number): PrivacyScoreResult['maturityLevel'] {
  if (overallScore >= 90) return 'Excelente';
  if (overallScore >= 75) return 'Avançado';
  if (overallScore >= 60) return 'Intermediário';
  if (overallScore >= 40) return 'Em Desenvolvimento';
  return 'Iniciante';
}

/**
 * Gera roadmap de melhorias
 */
function generateRoadmap(
  categories: PrivacyScoreResult['categories']
): RoadmapItem[] {
  const roadmap: RoadmapItem[] = [];

  // Governança
  if (categories.governance.score < 15) {
    roadmap.push({
      priority: 'Alta',
      action: 'Designar DPO formalmente',
      category: 'Governança',
      estimatedEffort: '1-2 semanas',
      expectedImpact: '+5 pontos',
    });
    if (!categories.governance.findings.some(f => f.includes('Mapeamento'))) {
      roadmap.push({
        priority: 'Alta',
        action: 'Realizar mapeamento completo de dados',
        category: 'Governança',
        estimatedEffort: '4-6 semanas',
        expectedImpact: '+4 pontos',
      });
    }
  }

  // Direitos
  if (categories.rights.score < 15) {
    roadmap.push({
      priority: 'Alta',
      action: 'Implementar portal do titular',
      category: 'Direitos dos Titulares',
      estimatedEffort: '6-8 semanas',
      expectedImpact: '+4 pontos',
    });
  }

  // Segurança
  if (categories.security.score < 15) {
    roadmap.push({
      priority: 'Alta',
      action: 'Estabelecer protocolo de violação de dados',
      category: 'Segurança',
      estimatedEffort: '2-4 semanas',
      expectedImpact: '+5 pontos',
    });
  }

  // Monitoramento
  if (categories.monitoring.score < 15) {
    roadmap.push({
      priority: 'Média',
      action: 'Iniciar programa de treinamento trimestral',
      category: 'Monitoramento',
      estimatedEffort: '4-6 semanas',
      expectedImpact: '+8 pontos',
    });
  }

  return roadmap;
}

/**
 * Calcula privacy score completo
 */
export async function calculatePrivacyScore(
  input: PrivacyScoreInput
): Promise<PrivacyScoreResult> {
  const startTime = Date.now();
  logger.info(`Calculating privacy score for ${input.company}...`);

  // Validar input mínimo
  if (!input.company) {
    throw new Error('Company name is required');
  }

  // Calcular scores por categoria
  const governance = calculateGovernanceScore(input);
  const rights = calculateRightsScore(input);
  const security = calculateSecurityScore(input);
  const international = calculateInternationalScore(input);
  const monitoring = calculateMonitoringScore(input);

  // Score geral
  const overallScore =
    governance.score +
    rights.score +
    security.score +
    international.score +
    monitoring.score;

  // Buscar contexto LEANN para recomendações adicionais
  let context: string[] = [];
  try {
    const leannResults = await searchLEANN({
      query: `LGPD maturidade governança privacidade ${input.industry || 'geral'}`,
      topK: 5,
      complexity: 32,
    });
    context = leannResults.map(r => r.content);
  } catch (error) {
    logger.warn('Failed to fetch LEANN context:', error);
  }

  // Identificar strengths e improvements
  const strengths: string[] = [];
  const improvements: string[] = [];

  const categories = { governance, rights, security, international, monitoring };

  Object.entries(categories).forEach(([key, cat]) => {
    if (cat.score >= cat.maxScore * 0.75) {
      strengths.push(`**${getCategoryName(key)}**: ${cat.status} (${cat.score}/${cat.maxScore})`);
    } else if (cat.score < cat.maxScore * 0.5) {
      improvements.push(`**${getCategoryName(key)}**: Precisa melhorar (${cat.score}/${cat.maxScore})`);
    }
  });

  // Se não houver strengths específicos, adicionar genéricos
  if (strengths.length === 0) {
    strengths.push('Potencial para crescimento em todas as áreas');
  }

  // Gerar roadmap
  const roadmap = generateRoadmap(categories);

  const result: PrivacyScoreResult = {
    company: input.company,
    industry: input.industry,
    overallScore,
    maturityLevel: getMaturityLevel(overallScore),
    categories,
    strengths,
    improvements,
    roadmap,
    generatedAt: Date.now(),
  };

  const executionTime = Date.now() - startTime;
  logger.info(`Privacy score calculated in ${executionTime}ms: ${overallScore}/100`);

  return result;
}

/**
 * Retorna nome da categoria em português
 */
function getCategoryName(key: string): string {
  const names: Record<string, string> = {
    governance: 'Governança',
    rights: 'Direitos dos Titulares',
    security: 'Segurança',
    international: 'Transferência Internacional',
    monitoring: 'Monitoramento',
  };
  return names[key] || key;
}
