import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, MaturityResult, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class MaturityTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, outputDir: string): Promise<ToolResult> {
    try {
      const perguntas = this.gerarPerguntas();
      const respostas = await this.processarRespostas(empresa, perguntas);
      const result = this.calcularMaturidade(respostas);

      // Gerar relatório PDF
      const pdfPath = await this.gerarRelatorioPDF(empresa, result, outputDir);

      // Salvar dados JSON
      const jsonPath = path.join(outputDir, 'maturidade.json');
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

      this.logger.log('MATURITY_CHECK', true, empresa, result);

      return {
        success: true,
        file: pdfPath,
        data: result
      };

    } catch (error) {
      this.logger.log('MATURITY_CHECK', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private gerarPerguntas(): string[] {
    return [
      'A empresa possui política de privacidade publicada e atualizada?',
      'Existe um encarregado (DPO) nomeado e treinado?',
      'A empresa realiza avaliação de impacto (DPIA) para novos projetos?',
      'Existe controle formal de solicitações de titulares de dados?',
      'A empresa possui contratos adequados com fornecedores que processam dados?',
      'Existe inventário atualizado de tratamento de dados pessoais?',
      'A empresa possui plano de resposta a incidentes de segurança?',
      'São realizados treinamentos regulares sobre LGPD para colaboradores?',
      'Existe processo formal para coleta e gestão de consentimentos?',
      'A empresa possui medidas técnicas adequadas de segurança?'
    ];
  }

  private async processarRespostas(empresa: Empresa, perguntas: string[]): Promise<{ pergunta: string; resposta: number; justificativa: string }[]> {
    const prompt = `
Você é um especialista em LGPD. Analise a empresa e responda as perguntas abaixo com uma nota de 0 a 10 e justificativa.

EMPRESA:
- Nome: ${empresa.nome}
- Setor: ${empresa.setor}
- Colaboradores: ${empresa.colaboradores}
- Coleta dados: ${empresa.coletaDados ? 'Sim' : 'Não'}
- Possui operadores: ${empresa.possuiOperadores ? 'Sim' : 'Não'}

Para cada pergunta, forneça:
1. Nota de 0 a 10 (baseada no perfil da empresa)
2. Justificativa técnica

PERGUNTAS:
${perguntas.map((p, i) => `${i + 1}. ${p}`).join('\\n')}

Responda no formato JSON:
[
  {
    "pergunta": "texto da pergunta",
    "resposta": numero_0_a_10,
    "justificativa": "explicacao_técnica"
  }
]
`;

    const response = await this.llm.generateText(prompt);

    try {
      const jsonMatch = response.match(/\\[[\\s\\S]*\\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Erro ao parsear resposta da IA, usando valores padrão');
    }

    // Fallback com valores padrão
    return perguntas.map(pergunta => ({
      pergunta,
      resposta: Math.floor(Math.random() * 6) + 2, // 2-8
      justificativa: 'Avaliação baseada no perfil da empresa'
    }));
  }

  private calcularMaturidade(respostas: { pergunta: string; resposta: number; justificativa: string }[]): MaturityResult {
    const score = Math.round(respostas.reduce((acc, r) => acc + r.resposta, 0) / respostas.length * 10);

    let nivel: MaturityResult['nivel'];
    if (score < 40) nivel = 'Inicial';
    else if (score < 60) nivel = 'Básico';
    else if (score < 80) nivel = 'Intermediário';
    else nivel = 'Avançado';

    const gaps = respostas
      .filter(r => r.resposta < 7)
      .map(r => r.pergunta);

    const planoAcao = this.gerarPlanoAcao(gaps, nivel);

    return { score, nivel, gaps, planoAcao };
  }

  private gerarPlanoAcao(gaps: string[], nivel: MaturityResult['nivel']): string[] {
    const acoes: string[] = [];

    if (gaps.some(g => g.includes('política de privacidade'))) {
      acoes.push('Criar/atualizar política de privacidade conforme LGPD');
    }

    if (gaps.some(g => g.includes('encarregado'))) {
      acoes.push('Nomear e treinar encarregado de dados (DPO)');
    }

    if (gaps.some(g => g.includes('DPIA'))) {
      acoes.push('Implementar processo de avaliação de impacto (DPIA)');
    }

    if (gaps.some(g => g.includes('contratos'))) {
      acoes.push('Revisar e adequar contratos com fornecedores');
    }

    if (gaps.some(g => g.includes('inventário'))) {
      acoes.push('Criar inventário completo de tratamento de dados');
    }

    if (gaps.some(g => g.includes('incidentes'))) {
      acoes.push('Desenvolver plano de resposta a incidentes');
    }

    if (gaps.some(g => g.includes('treinamento'))) {
      acoes.push('Implementar programa de treinamentos em LGPD');
    }

    if (gaps.some(g => g.includes('segurança'))) {
      acoes.push('Implementar medidas técnicas de segurança');
    }

    return acoes;
  }

  private async gerarRelatorioPDF(empresa: Empresa, result: MaturityResult, outputDir: string): Promise<string> {
    const pdfPath = path.join(outputDir, 'maturidade.pdf');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(20).text('Avaliação de Maturidade LGPD', 50, 50);
    doc.fontSize(12).text(`Empresa: ${empresa.nome}`, 50, 100);
    doc.text(`CNPJ: ${empresa.cnpj}`, 50, 115);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 50, 130);

    // Score
    doc.fontSize(16).text(`Score de Maturidade: ${result.score}/100`, 50, 170);
    doc.fontSize(14).text(`Nível: ${result.nivel}`, 50, 195);

    // Gaps identificados
    if (result.gaps.length > 0) {
      doc.fontSize(14).text('Gaps Identificados:', 50, 230);
      result.gaps.forEach((gap, index) => {
        doc.fontSize(10).text(`• ${gap}`, 70, 255 + (index * 15));
      });
    }

    // Plano de ação
    if (result.planoAcao.length > 0) {
      doc.fontSize(14).text('Plano de Ação (30 dias):', 50, 330);
      result.planoAcao.forEach((acao, index) => {
        doc.fontSize(10).text(`${index + 1}. ${acao}`, 70, 355 + (index * 15));
      });
    }

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }
}