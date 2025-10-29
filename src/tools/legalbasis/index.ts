import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class LegalBasisTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, dataFlows: DataFlow[], outputDir: string): Promise<ToolResult> {
    try {
      const basesLegais = await this.definirBasesLegais(dataFlows);

      const csvPath = path.join(outputDir, 'bases-legais.csv');
      const csvContent = this.gerarCSV(basesLegais);
      fs.writeFileSync(csvPath, csvContent);

      this.logger.log('LEGAL_BASIS_ASSIGNMENT', true, dataFlows, basesLegais);

      return {
        success: true,
        file: csvPath,
        data: basesLegais
      };

    } catch (error) {
      this.logger.log('LEGAL_BASIS_ASSIGNMENT', false, dataFlows, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async definirBasesLegais(dataFlows: DataFlow[]): Promise<any[]> {
    const basesLegais = [];

    for (const flow of dataFlows) {
      const prompt = `
Para a atividade "${flow.atividade}" com finalidade "${flow.finalidade}",
qual a base legal mais apropriada do Art. 7º da LGPD?

Opções:
I - consentimento
II - cumprimento de obrigação legal
III - execução de políticas públicas
IV - estudos por órgão de pesquisa
V - execução de contrato
VI - exercício regular de direitos
VII - proteção da vida
VIII - tutela da saúde
IX - legítimo interesse
X - proteção do crédito

Responda apenas com o número romano e nome: "V - execução de contrato"
`;

      const response = await this.llm.generateText(prompt);
      const baseLegal = response.trim() || 'V - execução de contrato';

      basesLegais.push({
        atividade: flow.atividade,
        finalidade: flow.finalidade,
        baseLegal,
        justificativa: this.gerarJustificativa(baseLegal)
      });
    }

    return basesLegais;
  }

  private gerarJustificativa(baseLegal: string): string {
    const justificativas: { [key: string]: string } = {
      'I': 'Consentimento livre, informado e inequívoco do titular',
      'II': 'Cumprimento de obrigação legal ou regulatória',
      'V': 'Execução de contrato ou procedimentos preliminares',
      'IX': 'Legítimo interesse do controlador ou terceiros',
      'VI': 'Exercício regular de direitos em processo judicial'
    };

    const numero = baseLegal.split(' ')[0];
    return justificativas[numero] || 'Base legal definida conforme análise jurídica';
  }

  private gerarCSV(basesLegais: any[]): string {
    let csv = 'Atividade,Finalidade,Base Legal,Justificativa\\n';

    basesLegais.forEach(base => {
      csv += `"${base.atividade}","${base.finalidade}","${base.baseLegal}","${base.justificativa}"\\n`;
    });

    return csv;
  }
}