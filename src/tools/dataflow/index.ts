import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export class DataFlowTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, outputDir: string): Promise<ToolResult> {
    try {
      const atividades = await this.identificarAtividades(empresa);
      const fluxos = await this.mapearFluxosDados(empresa, atividades);

      // Gerar CSV
      const csvPath = await this.gerarCSV(fluxos, outputDir);

      // Salvar JSON
      const jsonPath = path.join(outputDir, 'inventario.json');
      fs.writeFileSync(jsonPath, JSON.stringify(fluxos, null, 2));

      this.logger.log('DATA_FLOW_MAPPING', true, empresa, fluxos);

      return {
        success: true,
        file: csvPath,
        data: fluxos
      };

    } catch (error) {
      this.logger.log('DATA_FLOW_MAPPING', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async identificarAtividades(empresa: Empresa): Promise<string[]> {
    const prompt = `
Você é um especialista em mapeamento de dados pessoais para LGPD.

Analise a empresa e identifique as principais atividades que envolvem tratamento de dados pessoais:

EMPRESA:
- Nome: ${empresa.nome}
- Setor: ${empresa.setor}
- Colaboradores: ${empresa.colaboradores}
- Coleta dados: ${empresa.coletaDados ? 'Sim' : 'Não'}
- Possui operadores: ${empresa.possuiOperadores ? 'Sim' : 'Não'}

Liste as atividades típicas para este tipo de empresa que envolvem dados pessoais.

Exemplos por setor:
- E-commerce: Cadastro de clientes, Processamento de pagamentos, Marketing direto
- SaaS: Cadastro de usuários, Analytics, Suporte técnico
- Consultoria: Gestão de RH, Contratos com clientes, Relatórios

Responda apenas com uma lista JSON de strings:
["Atividade 1", "Atividade 2", "Atividade 3"]
`;

    const response = await this.llm.generateText(prompt);

    try {
      const jsonMatch = response.match(/\\[[\\s\\S]*?\\]/);
      if (jsonMatch) {
        const atividades = JSON.parse(jsonMatch[0]);
        return Array.isArray(atividades) ? atividades : [];
      }
    } catch (error) {
      console.warn('Erro ao parsear atividades, usando padrão');
    }

    // Fallback baseado no setor
    return this.atividadesPadrao(empresa.setor);
  }

  private atividadesPadrao(setor: string): string[] {
    const atividades: { [key: string]: string[] } = {
      'Tecnologia/Software': [
        'Cadastro de usuários',
        'Analytics e métricas',
        'Suporte técnico',
        'Marketing digital',
        'Gestão de RH'
      ],
      'E-commerce/Varejo': [
        'Cadastro de clientes',
        'Processamento de pagamentos',
        'Gestão de entregas',
        'Marketing e promoções',
        'Atendimento ao cliente'
      ],
      'Serviços Financeiros': [
        'Onboarding de clientes',
        'Análise de crédito',
        'Transações financeiras',
        'Compliance e auditoria',
        'Atendimento'
      ],
      'Saúde': [
        'Cadastro de pacientes',
        'Prontuários médicos',
        'Agendamentos',
        'Exames e resultados',
        'Faturamento'
      ],
      'Educação': [
        'Cadastro de alunos',
        'Gestão acadêmica',
        'Comunicação escolar',
        'Avaliações',
        'Recursos humanos'
      ]
    };

    return atividades[setor] || [
      'Cadastro de clientes',
      'Recursos humanos',
      'Marketing',
      'Atendimento',
      'Administrativo'
    ];
  }

  private async mapearFluxosDados(empresa: Empresa, atividades: string[]): Promise<DataFlow[]> {
    const fluxos: DataFlow[] = [];

    for (const atividade of atividades) {
      const prompt = `
Você é um especialista em LGPD. Para a atividade "${atividade}" na empresa do setor "${empresa.setor}", identifique:

1. Dados pessoais coletados
2. Finalidade específica
3. Base legal apropriada (Art. 7º LGPD)
4. Período de retenção
5. Quem tem acesso
6. Destino dos dados

Responda no formato JSON:
{
  "dados": ["lista", "de", "dados"],
  "finalidade": "finalidade específica",
  "baseLegal": "base legal do Art. 7º",
  "retencao": "período em anos ou até finalidade",
  "acesso": ["função1", "função2"],
  "destino": "local/sistema onde ficam armazenados"
}

Bases legais comuns:
- Execução de contrato
- Consentimento
- Legítimo interesse
- Cumprimento de obrigação legal
- Proteção da vida
- Exercício de direitos
`;

      try {
        const response = await this.llm.generateText(prompt);
        const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);

        if (jsonMatch) {
          const dados = JSON.parse(jsonMatch[0]);
          fluxos.push({
            atividade,
            dados: dados.dados || [],
            finalidade: dados.finalidade || 'Não especificado',
            baseLegal: dados.baseLegal || 'A definir',
            retencao: dados.retencao || 'A definir',
            acesso: dados.acesso || [],
            destino: dados.destino || 'Sistema interno',
            operador: empresa.possuiOperadores ? 'A definir' : ''
          });
        }
      } catch (error) {
        // Fallback com dados básicos
        fluxos.push({
          atividade,
          dados: ['Nome', 'Email', 'Telefone'],
          finalidade: 'Execução da atividade',
          baseLegal: 'A definir',
          retencao: 'A definir',
          acesso: ['Equipe responsável'],
          destino: 'Sistema interno',
          operador: empresa.possuiOperadores ? 'A definir' : ''
        });
      }
    }

    return fluxos;
  }

  private async gerarCSV(fluxos: DataFlow[], outputDir: string): Promise<string> {
    const csvPath = path.join(outputDir, 'inventario.csv');

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'atividade', title: 'Atividade' },
        { id: 'dados', title: 'Dados Pessoais' },
        { id: 'finalidade', title: 'Finalidade' },
        { id: 'baseLegal', title: 'Base Legal' },
        { id: 'retencao', title: 'Retenção' },
        { id: 'acesso', title: 'Acesso' },
        { id: 'destino', title: 'Destino' },
        { id: 'operador', title: 'Operador' }
      ]
    });

    const records = fluxos.map(fluxo => ({
      ...fluxo,
      dados: fluxo.dados.join(', '),
      acesso: fluxo.acesso.join(', ')
    }));

    await csvWriter.writeRecords(records);
    return csvPath;
  }
}