import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class ReportTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) { }

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
    // 1. Ler dados reais das etapas anteriores
    const maturityData = this.readJsonSafe(path.join(outputDir, 'maturidade.json'));
    const inventarioData = this.readJsonSafe(path.join(outputDir, 'inventario.json'));
    const policyJson = this.readJsonSafe(path.join(outputDir, 'policy.json'));

    // 2. Listar documentos gerados (reais, do filesystem)
    const arquivos = fs.readdirSync(outputDir);
    const documentosGerados = arquivos.filter(f =>
      f.endsWith('.pdf') || f.endsWith('.csv') || f.endsWith('.txt') || f.endsWith('.json')
    );

    // 3. Resumo real baseado nos dados
    const maturityScore = maturityData?.score ?? 'Não avaliado';
    const maturityLevel = maturityData?.nivel ?? 'Não avaliado';
    const numGaps = maturityData?.gaps?.length ?? 0;
    const numFluxos = Array.isArray(inventarioData) ? inventarioData.length : 0;
    const numPlanoAcao = maturityData?.planoAcao?.length ?? 0;

    // 4. Gerar análise executiva via LLM
    const analiseExecutiva = await this.gerarAnaliseExecutiva(empresa, {
      maturityScore,
      maturityLevel,
      numGaps,
      numFluxos,
      numPlanoAcao,
      gaps: maturityData?.gaps || [],
      planoAcao: maturityData?.planoAcao || [],
      documentosGerados
    });

    return {
      empresa: empresa.nome,
      cnpj: empresa.cnpj,
      setor: empresa.setor,
      dataGeracao: new Date().toISOString(),
      documentos: documentosGerados,
      metricas: {
        maturityScore,
        maturityLevel,
        numFluxosDados: numFluxos,
        numGaps,
        numAcoesRecomendadas: numPlanoAcao,
        numDocumentosGerados: documentosGerados.length
      },
      gaps: maturityData?.gaps || [],
      planoAcao: maturityData?.planoAcao || [],
      analiseExecutiva,
      proximosPassos: await this.gerarProximosPassos(empresa, maturityData)
    };
  }

  private async gerarAnaliseExecutiva(empresa: Empresa, dados: any): Promise<string> {
    const prompt = `Você é um DPO (Data Protection Officer) experiente, certificado CIPP/E e CIPM.

Redija uma ANÁLISE EXECUTIVA para o Relatório de Adequação LGPD da empresa:

EMPRESA: ${empresa.nome}
SETOR: ${empresa.setor}
COLABORADORES: ${empresa.colaboradores}

DADOS DA AVALIAÇÃO:
- Score de maturidade: ${dados.maturityScore}/100 (Nível: ${dados.maturityLevel})
- Fluxos de dados mapeados: ${dados.numFluxos}
- Gaps identificados: ${dados.numGaps}
- Ações recomendadas: ${dados.numPlanoAcao}
- Documentos gerados: ${dados.documentosGerados.join(', ')}
${dados.gaps.length > 0 ? `\nGAPS ENCONTRADOS:\n${dados.gaps.map((g: string) => `- ${g}`).join('\n')}` : ''}

Redija a análise executiva incluindo:
1. Visão geral do estado de conformidade da empresa
2. Pontos fortes identificados
3. Áreas críticas que requerem atenção imediata
4. Riscos regulatórios (multas ANPD, danos reputacionais)
5. Recomendação geral (conforme/parcial/não conforme)

Use linguagem executiva, objetiva e profissional. Máximo 400 palavras. Cite artigos da LGPD quando relevante.`;

    try {
      return await this.llm.generateText(prompt);
    } catch {
      return `A empresa ${empresa.nome} (setor ${empresa.setor}) alcançou score de maturidade LGPD de ${dados.maturityScore}/100 (${dados.maturityLevel}). Foram mapeados ${dados.numFluxos} fluxos de dados e identificados ${dados.numGaps} gaps de conformidade. ${dados.numPlanoAcao} ações foram recomendadas para remediar as lacunas encontradas.`;
    }
  }

  private async gerarProximosPassos(empresa: Empresa, maturityData: any): Promise<string[]> {
    const gaps = maturityData?.gaps || [];
    const score = maturityData?.score ?? 50;

    const prompt = `Você é um consultor de LGPD. Com base no perfil da empresa e seus gaps, gere uma lista priorizada de PRÓXIMOS PASSOS concretos e acionáveis.

EMPRESA: ${empresa.nome} (${empresa.setor}, ${empresa.colaboradores} colaboradores)
SCORE: ${score}/100
${gaps.length > 0 ? `GAPS: ${gaps.join('; ')}` : 'Nenhum gap crítico identificado.'}

Gere entre 5 e 8 itens priorizados (do mais urgente ao menos urgente).
Para cada item, inclua: ação concreta + prazo sugerido + responsável sugerido.

Formato: lista simples, um item por linha. Não use numeração, apenas o texto direto.`;

    try {
      const response = await this.llm.generateText(prompt);
      const lines = response
        .split('\n')
        .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter(l => l.length > 10);
      return lines.length > 0 ? lines.slice(0, 8) : this.proximosPassosFallback(score);
    } catch {
      return this.proximosPassosFallback(score);
    }
  }

  private proximosPassosFallback(score: number): string[] {
    const passos = [
      'Publicar política de privacidade atualizada no site — Prazo: 7 dias — Responsável: DPO',
      'Treinar equipe sobre LGPD e procedimentos internos — Prazo: 30 dias — Responsável: RH + DPO',
      'Implementar controles técnicos de acesso — Prazo: 30 dias — Responsável: TI',
      'Assinar contratos DPA com operadores terceiros — Prazo: 45 dias — Responsável: Jurídico',
      'Testar plano de resposta a incidentes — Prazo: 60 dias — Responsável: TI + DPO',
      'Agendar revisão trimestral de conformidade — Prazo: 90 dias — Responsável: DPO'
    ];
    if (score < 50) {
      passos.unshift('URGENTE: Nomear DPO formalmente e comunicar à ANPD — Prazo: imediato — Responsável: Diretoria');
    }
    return passos;
  }

  private readJsonSafe(filePath: string): any {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch { /* ignore parse errors */ }
    return null;
  }

  private async gerarPDF(empresa: Empresa, relatorio: any, outputDir: string): Promise<string> {
    const pdfPath = path.join(outputDir, 'relatorio-dpo.pdf');
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(18).text('RELATÓRIO DE ADEQUAÇÃO LGPD', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(empresa.nome, { align: 'center' });
    doc.fontSize(10).text(`CNPJ: ${empresa.cnpj} | Setor: ${empresa.setor}`, { align: 'center' });
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1);

    // Métricas
    doc.fontSize(14).text('MÉTRICAS DA AVALIAÇÃO');
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Score de Maturidade: ${relatorio.metricas.maturityScore}/100 (${relatorio.metricas.maturityLevel})`);
    doc.text(`Fluxos de Dados Mapeados: ${relatorio.metricas.numFluxosDados}`);
    doc.text(`Gaps Identificados: ${relatorio.metricas.numGaps}`);
    doc.text(`Ações Recomendadas: ${relatorio.metricas.numAcoesRecomendadas}`);
    doc.text(`Documentos Gerados: ${relatorio.metricas.numDocumentosGerados}`);
    doc.moveDown(1);

    // Análise Executiva
    doc.fontSize(14).text('ANÁLISE EXECUTIVA');
    doc.moveDown(0.3);
    doc.fontSize(10).text(relatorio.analiseExecutiva, { width: 500 });
    doc.moveDown(1);

    // Documentos Gerados
    doc.addPage();
    doc.fontSize(14).text('DOCUMENTOS GERADOS');
    doc.moveDown(0.3);
    relatorio.documentos.forEach((arquivo: string) => {
      doc.fontSize(10).text(`✓ ${arquivo}`);
    });
    doc.moveDown(1);

    // Gaps
    if (relatorio.gaps.length > 0) {
      doc.fontSize(14).text('GAPS IDENTIFICADOS');
      doc.moveDown(0.3);
      relatorio.gaps.forEach((gap: string) => {
        doc.fontSize(10).text(`• ${gap}`);
      });
      doc.moveDown(1);
    }

    // Próximos Passos
    doc.fontSize(14).text('PRÓXIMOS PASSOS');
    doc.moveDown(0.3);
    relatorio.proximosPassos.forEach((passo: string, index: number) => {
      doc.fontSize(10).text(`${index + 1}. ${passo}`);
    });
    doc.moveDown(1);

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(8).text('Este relatório foi gerado automaticamente pelo DPO2U LGPD Kit.', { align: 'center' });
    doc.text('Recomenda-se revisão jurídica e validação por profissional qualificado.', { align: 'center' });
    doc.text(`Próxima revisão recomendada: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`, { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }
}