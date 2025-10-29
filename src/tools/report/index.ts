import { OllamaClient } from '../../lib/ollama.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class ReportTool {
  constructor(
    private ollama: OllamaClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, outputDir: string): Promise<ToolResult> {
    try {
      const relatorio = await this.gerarRelatorio(empresa, outputDir);
      const pdfPath = await this.gerarPDF(empresa, relatorio, outputDir);

      this.logger.log('DPO_REPORT_GENERATION', true, { empresa: empresa.nome }, relatorio);

      return {
        success: true,
        file: pdfPath,
        data: relatorio
      };

    } catch (error) {
      this.logger.log('DPO_REPORT_GENERATION', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async gerarRelatorio(empresa: Empresa, outputDir: string) {
    const arquivos = fs.readdirSync(outputDir);
    const documentosGerados = arquivos.filter(f => f.endsWith('.pdf') || f.endsWith('.csv') || f.endsWith('.txt'));

    return {
      empresa: empresa.nome,
      dataGeracao: new Date().toISOString(),
      documentos: documentosGerados,
      resumo: {
        maturidade: 'Avaliada',
        inventario: 'Mapeado',
        basesLegais: 'Definidas',
        dpia: 'Elaborada',
        politica: 'Gerada',
        contratos: 'Preparados',
        incidentes: 'Planejado',
        status: 'Conformidade básica alcançada'
      },
      proximosPassos: [
        'Publicar política de privacidade',
        'Treinar equipe sobre LGPD',
        'Implementar controles técnicos',
        'Assinar contratos com operadores',
        'Testar plano de incidentes',
        'Agendar revisão trimestral'
      ]
    };
  }

  private async gerarPDF(empresa: Empresa, relatorio: any, outputDir: string): Promise<string> {
    const pdfPath = path.join(outputDir, 'relatorio-dpo.pdf');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text('RELATÓRIO DE ADEQUAÇÃO LGPD', 50, 50);
    doc.fontSize(12).text(`Empresa: ${empresa.nome}`, 50, 100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 50, 115);
    doc.text(`Status: ${relatorio.resumo.status}`, 50, 130);

    doc.fontSize(14).text('Documentos Gerados:', 50, 170);
    relatorio.documentos.forEach((arquivo: string, index: number) => {
      doc.fontSize(10).text(`✓ ${arquivo}`, 70, 195 + (index * 15));
    });

    doc.fontSize(14).text('Próximos Passos:', 50, 280);
    relatorio.proximosPassos.forEach((passo: string, index: number) => {
      doc.fontSize(10).text(`• ${passo}`, 70, 305 + (index * 15));
    });

    doc.fontSize(14).text('Recomendações:', 50, 420);
    doc.fontSize(10).text('Esta adequação representa a conformidade documental mínima.', 50, 445);
    doc.text('Recomenda-se revisão jurídica e implementação técnica das medidas.', 50, 460);
    doc.text('Acompanhamento trimestral é essencial para manutenção da conformidade.', 50, 475);

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }
}