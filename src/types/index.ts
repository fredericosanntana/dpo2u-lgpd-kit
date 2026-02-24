export interface Empresa {
  nome: string;
  cnpj: string;
  setor: string;
  colaboradores: number;
  coletaDados: boolean;
  possuiOperadores: boolean;
  contato: {
    email: string;
    telefone?: string;
    responsavel: string;
  };
  // Dados estendidos do wizard (opcional - backward compatibility)
  wizard_data?: WizardData;
}

// Wizard data interfaces
export interface WizardDataInventoryItem {
  id: string;
  tipo: string;
  categoria: 'cadastral' | 'sensivel' | 'crianca' | 'financeiro' | 'outro';
  volume: 'baixo' | 'medio' | 'alto';
  descricao: string;
}

export interface WizardPurposeAndBasis {
  dataItemId: string;
  finalidade: string;
  baseLegal: string;
  justificativa: string;
}

export interface WizardStorageAndRetention {
  dataItemId: string;
  localizacao: string;
  provedor?: string;
  periodo_retencao: string;
  procedimento_exclusao: string;
}

export interface WizardThirdPartyProcessor {
  id: string;
  nome: string;
  cnpj?: string;
  tipo: string;
  localizacao: string;
  dados_compartilhados: string[];
  finalidade_compartilhamento: string;
  possui_dpa: boolean;
  data_dpa?: string;
}

export interface WizardSecurityMeasures {
  tecnicas: {
    criptografia: boolean;
    criptografia_descricao?: string;
    controle_acesso: boolean;
    controle_acesso_descricao?: string;
    backup: boolean;
    backup_frequencia?: string;
    firewall: boolean;
    antivirus: boolean;
    monitoramento: boolean;
    outras: string[];
  };
  organizacionais: {
    politica_privacidade_interna: boolean;
    treinamento_colaboradores: boolean;
    treinamento_frequencia?: string;
    procedimentos_documentados: boolean;
    auditoria_regular: boolean;
    outras: string[];
  };
}

export interface WizardRiskAssessment {
  atividades_alto_risco: boolean;
  atividades_alto_risco_descricao?: string;
  decisoes_automatizadas: boolean;
  decisoes_automatizadas_descricao?: string;
  perfilamento: boolean;
  perfilamento_descricao?: string;
  transferencia_internacional: boolean;
  transferencia_internacional_paises?: string[];
  incidentes_anteriores: boolean;
  incidentes_anteriores_descricao?: string;
  medidas_mitigacao: string;
}

export interface WizardData {
  inventory: WizardDataInventoryItem[];
  purposes: WizardPurposeAndBasis[];
  storage: WizardStorageAndRetention[];
  third_parties: WizardThirdPartyProcessor[];
  security: WizardSecurityMeasures;
  risks: WizardRiskAssessment;
}

export interface MaturityResult {
  score: number;
  nivel: 'Inicial' | 'Básico' | 'Intermediário' | 'Avançado';
  gaps: string[];
  planoAcao: string[];
}

export interface DataFlow {
  atividade: string;
  dados: string[];
  finalidade: string;
  baseLegal: string;
  retencao: string;
  operador?: string;
  destino: string;
  acesso: string[];
}

export interface AuditLog {
  timestamp: string;
  etapa: string;
  sucesso: boolean;
  entrada: any;
  saida?: any;
  erro?: string;
}

export interface ToolResult {
  success: boolean;
  file?: string;
  data?: any;
  error?: string;
}

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

export interface DocumentRef {
  type: string;
  cid: string | null;
}

export interface LGPDPolicy {
  retention_days: number;
  data_categories: string[];
  consent_mechanism: string;
  dpo_contact: string;
  last_review: string;
}

export interface LGPDV1Schema {
  schema_version: 'dpo2u/lgpd/v1';
  company_id: string;
  generated_at: string;
  policy: LGPDPolicy;
  documents: DocumentRef[];
}

export interface CompanyProfile {
  company_id: string; // CNPJ ou DID
  name: string;
  processingActivity: string;
  dataTypes: string[];
  dataSubjects: string[];
  purpose: string;
  dpo_contact?: string;
}

export interface LGPDKitResult {
  policy_json: LGPDV1Schema;
  documents: {
    type: string;
    content: string; // O markdown gerado
  }[];
}