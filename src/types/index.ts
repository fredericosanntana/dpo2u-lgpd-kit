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