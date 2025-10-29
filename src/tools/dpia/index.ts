import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class DpiaTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, context: any, outputDir: string): Promise<ToolResult> {
    try {
      const dpia = await this.gerarDPIA(empresa, context);
      const pdfPath = await this.gerarPDF(empresa, dpia, outputDir);

      this.logger.log('DPIA_GENERATION', true, context, dpia);

      return {
        success: true,
        file: pdfPath,
        data: dpia
      };

    } catch (error) {
      this.logger.log('DPIA_GENERATION', false, context, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async gerarDPIA(empresa: Empresa, context: any) {
    const prompt = `
Gere uma DPIA (Avaliação de Impacto à Proteção de Dados) para:

EMPRESA: ${empresa.nome}
SETOR: ${empresa.setor}
MATURIDADE: ${context.maturity?.score || 50}/100

Inclua:
1. Descrição do tratamento
2. Riscos identificados (Alto/Médio/Baixo)
3. Medidas de mitigação
4. Score de risco residual

Formato JSON:
{
  "descricao": "texto",
  "riscos": [{"tipo": "texto", "nivel": "Alto|Médio|Baixo", "probabilidade": "texto"}],
  "mitigacoes": ["medida1", "medida2"],
  "scoreResidual": numero_1_a_10
}
`;

    const response = await this.llm.generateText(prompt);

    try {
      const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Erro ao parsear DPIA, usando padrão');
    }

    return {
      descricao: `Tratamento de dados pessoais pela ${empresa.nome} no setor ${empresa.setor}`,
      riscos: [
        { tipo: 'Vazamento de dados', nivel: 'Médio', probabilidade: 'Baixa com medidas adequadas' },
        { tipo: 'Acesso não autorizado', nivel: 'Alto', probabilidade: 'Média sem controles' }
      ],
      mitigacoes: [
        'Implementar controles de acesso',
        'Criptografia de dados sensíveis',
        'Treinamento de equipe',
        'Monitoramento contínuo'
      ],
      scoreResidual: 4
    };
  }

  private async gerarPDF(empresa: Empresa, dpia: any, outputDir: string): Promise<string> {
    const pdfPath = path.join(outputDir, 'dpia.pdf');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text('DPIA - Avaliação de Impacto', 50, 50);
    doc.fontSize(12).text(`Empresa: ${empresa.nome}`, 50, 100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 50, 115);

    doc.fontSize(14).text('Descrição do Tratamento:', 50, 150);
    doc.fontSize(10).text(dpia.descricao, 50, 170, { width: 500 });

    doc.fontSize(14).text('Riscos Identificados:', 50, 220);
    dpia.riscos.forEach((risco: any, index: number) => {
      doc.fontSize(10).text(`• ${risco.tipo} (${risco.nivel})`, 70, 245 + (index * 15));
    });

    doc.fontSize(14).text('Medidas de Mitigação:', 50, 320);
    dpia.mitigacoes.forEach((medida: string, index: number) => {
      doc.fontSize(10).text(`• ${medida}`, 70, 345 + (index * 15));
    });

    doc.fontSize(14).text(`Score de Risco Residual: ${dpia.scoreResidual}/10`, 50, 420);

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }
}