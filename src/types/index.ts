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