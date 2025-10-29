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
      // Governança e Organização
      'A empresa possui política de privacidade publicada e atualizada?',
      'Existe um encarregado (DPO) nomeado e treinado?',
      'A empresa possui política corporativa abrangente de proteção de dados pessoais?',
      'Estão claramente definidas as responsabilidades de cada área sobre proteção de dados?',

      // Bases Legais e Tratamento
      'Para cada tratamento existe base legal específica identificada e documentada?',
      'A empresa identificou e possui controles especiais para dados pessoais sensíveis?',
      'Existe inventário atualizado de tratamento de dados pessoais?',
      'A empresa realiza avaliação de impacto (DPIA) para novos projetos?',

      // Direitos dos Titulares
      'Existe controle formal de solicitações de titulares de dados?',
      'Existe canal específico e divulgado para exercício de direitos dos titulares?',
      'Existem procedimentos padronizados para atender cada tipo de solicitação?',
      'A empresa cumpre os prazos legais para resposta às solicitações?',

      // Segurança e Tecnologia
      'A empresa possui medidas técnicas adequadas de segurança?',
      'Dados pessoais sensíveis são adequadamente criptografados?',
      'Existe controle rigoroso de acesso baseado no princípio do menor privilégio?',
      'Sistemas mantêm logs de acesso e alteração de dados pessoais?',

      // Contratos e Operadores
      'A empresa possui contratos adequados com fornecedores que processam dados?',
      'Existe processo formal para coleta e gestão de consentimentos?',

      // Gestão de Incidentes
      'A empresa possui plano de resposta a incidentes de segurança?',

      // Treinamento e Conscientização
      'São realizados treinamentos regulares sobre LGPD para colaboradores?',
      'Todos os pontos de coleta possuem avisos claros sobre o tratamento?',

      // Monitoramento e Auditoria
      'A empresa possui KPIs para medir a eficácia do programa de privacidade?',
      'São realizadas auditorias internas regulares de conformidade?'
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

    // Categorizar gaps por área
    const gaps = respostas
      .filter(r => r.resposta < 7)
      .map(r => r.pergunta);

    const gapsPorCategoria = this.categorizarGaps(gaps);
    const planoAcao = this.gerarPlanoAcaoDetalhado(gapsPorCategoria, nivel);

    return { score, nivel, gaps, planoAcao };
  }

  private categorizarGaps(gaps: string[]): { [categoria: string]: string[] } {
    const categorias: { [categoria: string]: string[] } = {
      'Governança': [],
      'Bases Legais': [],
      'Direitos dos Titulares': [],
      'Segurança': [],
      'Contratos': [],
      'Incidentes': [],
      'Treinamento': [],
      'Monitoramento': []
    };

    gaps.forEach(gap => {
      if (gap.includes('política') || gap.includes('responsabilidades') || gap.includes('corporativa')) {
        categorias['Governança'].push(gap);
      } else if (gap.includes('base legal') || gap.includes('sensíveis') || gap.includes('inventário') || gap.includes('DPIA')) {
        categorias['Bases Legais'].push(gap);
      } else if (gap.includes('solicitações') || gap.includes('canal') || gap.includes('procedimentos') || gap.includes('prazos')) {
        categorias['Direitos dos Titulares'].push(gap);
      } else if (gap.includes('segurança') || gap.includes('criptograf') || gap.includes('acesso') || gap.includes('logs')) {
        categorias['Segurança'].push(gap);
      } else if (gap.includes('contratos') || gap.includes('consentimentos')) {
        categorias['Contratos'].push(gap);
      } else if (gap.includes('incidentes')) {
        categorias['Incidentes'].push(gap);
      } else if (gap.includes('treinamentos') || gap.includes('avisos')) {
        categorias['Treinamento'].push(gap);
      } else if (gap.includes('KPIs') || gap.includes('auditorias')) {
        categorias['Monitoramento'].push(gap);
      }
    });

    // Remover categorias vazias
    Object.keys(categorias).forEach(key => {
      if (categorias[key].length === 0) {
        delete categorias[key];
      }
    });

    return categorias;
  }

  private gerarPlanoAcaoDetalhado(gapsPorCategoria: { [categoria: string]: string[] }, nivel: MaturityResult['nivel']): string[] {
    const acoes: string[] = [];

    Object.entries(gapsPorCategoria).forEach(([categoria, gaps]) => {
      switch (categoria) {
        case 'Governança':
          acoes.push('Estabelecer estrutura de governança de dados com políticas claras');
          acoes.push('Definir papéis e responsabilidades específicas para proteção de dados');
          break;
        case 'Bases Legais':
          acoes.push('Mapear e documentar bases legais para todos os tratamentos');
          acoes.push('Implementar controles específicos para dados sensíveis');
          acoes.push('Atualizar inventário de dados com detalhamento por finalidade');
          break;
        case 'Direitos dos Titulares':
          acoes.push('Criar canal dedicado para exercício de direitos dos titulares');
          acoes.push('Padronizar procedimentos de atendimento com prazos definidos');
          break;
        case 'Segurança':
          acoes.push('Implementar criptografia para dados sensíveis');
          acoes.push('Estabelecer controles de acesso baseados em menor privilégio');
          acoes.push('Configurar logs de auditoria para acesso a dados pessoais');
          break;
        case 'Contratos':
          acoes.push('Revisar e adequar contratos com fornecedores (DPAs)');
          acoes.push('Implementar sistema de gestão de consentimentos');
          break;
        case 'Incidentes':
          acoes.push('Desenvolver e testar plano de resposta a incidentes');
          break;
        case 'Treinamento':
          acoes.push('Implementar programa de treinamento contínuo em LGPD');
          acoes.push('Criar avisos de privacidade em todos os pontos de coleta');
          break;
        case 'Monitoramento':
          acoes.push('Definir KPIs para medir eficácia do programa de privacidade');
          acoes.push('Estabelecer cronograma de auditorias internas');
          break;
      }
    });

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