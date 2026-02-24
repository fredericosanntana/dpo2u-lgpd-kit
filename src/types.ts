/**
 * Tipos do Compliance Engine
 */

export interface DPIAInput {
  company: string;
  cnpj?: string;
  processingActivity: string;
  dataTypes: string[];
  dataSubjects: string[];
  purpose: string;
  legalBasis?: string;
  internationalTransfer?: boolean;
  automatedDecision?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface AuditInput {
  company: string;
  cnpj?: string;
  auditScope: 'full' | 'partial' | 'specific';
  areas?: string[];
  framework?: 'lgpd' | 'gdpr' | 'iso27001' | 'all';
}

export interface LEANNResult {
  content: string;
  score: number;
  metadata?: {
    file: string;
    tags: string[];
  };
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface DPIAResult {
  dpia: string;
  metadata: {
    generatedAt: number;
    company: string;
    processingActivity: string;
    riskLevel: string;
    legalBasis: string;
    sources: LEANNResult[];
    model: string;
  };
}

export interface AuditResult {
  audit: string;
  metadata: {
    generatedAt: number;
    company: string;
    framework: string;
    scope: string;
    sources: LEANNResult[];
    model: string;
  };
}

export interface DPIASection {
  title: string;
  content: string;
  order: number;
}

export enum RiskLevel {
  LOW = 'Baixo',
  MEDIUM = 'Médio',
  HIGH = 'Alto'
}

export enum LegalBasisLGPD {
  CONSENT = 'Art. 7º, I - Consentimento',
  COMPLIANCE = 'Art. 7º, II - Cumprimento de obrigação legal',
  PUBLIC_POLICY = 'Art. 7º, III - Execução de políticas públicas',
  STUDIES = 'Art. 7º, IV - Estudos por órgão de pesquisa',
  CONTRACT = 'Art. 7º, V - Execução de contrato',
  LEGAL_PROCESS = 'Art. 7º, VI - Exercício de direitos em processo judicial',
  VITAL_INTEREST = 'Art. 7º, VII - Proteção da vida',
  HEALTH_PROTECTION = 'Art. 7º, VIII - Tutela da saúde',
  LEGITIMATE_INTEREST = 'Art. 7º, IX - Legítimo interesse'
}
