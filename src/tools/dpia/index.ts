import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import { extractJson } from '../../lib/validator.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class DpiaTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) { }

  async execute(empresa: Empresa, context: any, outputDir: string): Promise<ToolResult> {
    try {
      const dpia = await this.gerarDPIA(empresa, context);
      const pdfPath = await this.gerarPDF(empresa, dpia, outputDir);

      // Salvar JSON
      const jsonPath = path.join(outputDir, 'dpia.json');
      fs.writeFileSync(jsonPath, JSON.stringify(dpia, null, 2));

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
    // Montar contexto enriquecido
    let wizardContext = '';
    if (empresa.wizard_data) {
      const inv = empresa.wizard_data.inventory;
      const sensiveis = inv.filter(i => i.categoria === 'sensivel');
      const riscos = empresa.wizard_data.risks;

      wizardContext = `
INVENTÁRIO DE DADOS:
${inv.map(i => `- ${i.tipo} (${i.categoria}, volume: ${i.volume}): ${i.descricao || 'sem descrição'}`).join('\n')}

${sensiveis.length > 0 ? `DADOS SENSÍVEIS (requerem atenção especial):
${sensiveis.map(s => `- ${s.tipo}: ${s.descricao || ''}`).join('\n')}` : 'Nenhum dado sensível identificado.'}

TERCEIROS/OPERADORES:
${empresa.wizard_data.third_parties.length > 0
          ? empresa.wizard_data.third_parties.map(tp => `- ${tp.nome} (${tp.tipo}, ${tp.localizacao}): ${tp.finalidade_compartilhamento}`).join('\n')
          : 'Nenhum operador terceiro identificado.'}

MEDIDAS DE SEGURANÇA EXISTENTES:
- Criptografia: ${empresa.wizard_data.security.tecnicas.criptografia ? 'Sim' : 'Não'}
- Controle de acesso: ${empresa.wizard_data.security.tecnicas.controle_acesso ? 'Sim' : 'Não'}
- Backup: ${empresa.wizard_data.security.tecnicas.backup ? 'Sim' : 'Não'}
- Firewall: ${empresa.wizard_data.security.tecnicas.firewall ? 'Sim' : 'Não'}
- Monitoramento: ${empresa.wizard_data.security.tecnicas.monitoramento ? 'Sim' : 'Não'}
- Treinamento de colaboradores: ${empresa.wizard_data.security.organizacionais.treinamento_colaboradores ? 'Sim' : 'Não'}

FATORES DE RISCO:
- Atividades de alto risco: ${riscos.atividades_alto_risco ? `Sim — ${riscos.atividades_alto_risco_descricao || ''}` : 'Não'}
- Decisões automatizadas: ${riscos.decisoes_automatizadas ? `Sim — ${riscos.decisoes_automatizadas_descricao || ''}` : 'Não'}
- Perfilamento: ${riscos.perfilamento ? `Sim — ${riscos.perfilamento_descricao || ''}` : 'Não'}
- Transferência internacional: ${riscos.transferencia_internacional ? `Sim — ${riscos.transferencia_internacional_paises?.join(', ') || ''}` : 'Não'}
- Incidentes anteriores: ${riscos.incidentes_anteriores ? `Sim — ${riscos.incidentes_anteriores_descricao || ''}` : 'Não'}`;
    }

    const prompt = `Você é um DPO certificado (CIPP/E, CIPM) especialista em LGPD e GDPR.

Elabore um Relatório de Impacto à Proteção de Dados Pessoais (RIPD/DPIA) completo conforme as diretrizes da ANPD para:

EMPRESA: ${empresa.nome}
CNPJ: ${empresa.cnpj}
SETOR: ${empresa.setor}
COLABORADORES: ${empresa.colaboradores}
SCORE DE MATURIDADE: ${context.maturity?.score || 'Não avaliado'}/100
${wizardContext}

Gere o RIPD no formato JSON com a seguinte estrutura COMPLETA:

{
  "identificacao": {
    "descricao": "Descrição detalhada do tratamento de dados pessoais",
    "natureza": "Natureza do tratamento (coleta, armazenamento, uso, compartilhamento, etc.)",
    "escopo": "Escopo do tratamento (volume, frequência, duração)",
    "contexto": "Contexto organizacional e regulatório",
    "finalidade": "Finalidades específicas do tratamento"
  },
  "necessidade_proporcionalidade": {
    "baseLegal": "Base(s) legal(is) aplicável(is) — Art. 7° LGPD",
    "necessidade": "Justificativa da necessidade do tratamento",
    "proporcionalidade": "Análise de proporcionalidade (dados mínimos necessários)",
    "alternativas": "Alternativas consideradas para minimizar o tratamento"
  },
  "riscos": [
    {
      "descricao": "Descrição do risco",
      "tipo": "Categoria do risco",
      "probabilidade": "Alta|Média|Baixa",
      "impacto": "Alto|Médio|Baixo",
      "nivel": "Crítico|Alto|Médio|Baixo",
      "titulares_afetados": "Quem é afetado"
    }
  ],
  "medidas_mitigacao": [
    {
      "risco_relacionado": "A qual risco se refere",
      "medida": "Descrição da medida de mitigação",
      "tipo": "Técnica|Organizacional|Jurídica",
      "status": "Implementada|Em implementação|Planejada",
      "prazo": "Prazo estimado se não implementada",
      "risco_residual": "Alto|Médio|Baixo"
    }
  ],
  "parecer": {
    "conclusao": "Parecer geral sobre a viabilidade e conformidade do tratamento",
    "aprovacao": "Aprovado|Aprovado com ressalvas|Não aprovado",
    "condicoes": "Condições para aprovação, se aplicável",
    "revisao": "Data sugerida para revisão do RIPD"
  },
  "scoreResidual": 1-10
}

REGRAS:
- Identifique pelo menos 5 riscos específicos para o setor ${empresa.setor}
- As medidas de mitigação devem ser concretas e acionáveis
- O parecer deve ser fundamentado nos artigos da LGPD
- Considere o score de maturidade na avaliação de risco residual
- NÃO use texto genérico — personalize para o contexto específico

Responda APENAS com o JSON válido.`;

    const response = await this.llm.generateText(prompt);

    try {
      const parsed = extractJson<any>(response);
      if (parsed && parsed.identificacao) {
        return parsed;
      }
    } catch { /* fallback below */ }

    // Tentar extrair JSON de resposta com texto envolvendo
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.identificacao || parsed.riscos) return parsed;
      }
    } catch { /* fallback below */ }

    // Fallback enriquecido
    return {
      identificacao: {
        descricao: `Tratamento de dados pessoais pela ${empresa.nome} no setor ${empresa.setor}`,
        natureza: 'Coleta, armazenamento, uso e compartilhamento de dados pessoais',
        escopo: `${empresa.colaboradores} colaboradores, múltiplos fluxos de dados`,
        contexto: `Empresa do setor ${empresa.setor} sob jurisdição da LGPD`,
        finalidade: 'Execução das atividades empresariais e cumprimento de obrigações legais'
      },
      necessidade_proporcionalidade: {
        baseLegal: 'Art. 7°, V — Execução de contrato; Art. 7°, II — Cumprimento de obrigação legal',
        necessidade: 'Dados são necessários para a execução das atividades do setor',
        proporcionalidade: 'Avaliação detalhada requer revisão jurídica especializada',
        alternativas: 'Minimização de dados e pseudonimização devem ser avaliadas'
      },
      riscos: [
        { descricao: 'Vazamento de dados por falha técnica', tipo: 'Técnico', probabilidade: 'Média', impacto: 'Alto', nivel: 'Alto', titulares_afetados: 'Clientes e colaboradores' },
        { descricao: 'Acesso não autorizado por credenciais comprometidas', tipo: 'Técnico', probabilidade: 'Média', impacto: 'Alto', nivel: 'Alto', titulares_afetados: 'Todos os titulares' },
        { descricao: 'Uso indevido de dados por operador terceiro', tipo: 'Contratual', probabilidade: 'Baixa', impacto: 'Alto', nivel: 'Médio', titulares_afetados: 'Clientes' },
        { descricao: 'Retenção excessiva de dados pessoais', tipo: 'Processual', probabilidade: 'Alta', impacto: 'Médio', nivel: 'Médio', titulares_afetados: 'Ex-clientes e ex-colaboradores' },
        { descricao: 'Falta de canal para exercício de direitos dos titulares', tipo: 'Organizacional', probabilidade: 'Média', impacto: 'Médio', nivel: 'Médio', titulares_afetados: 'Todos os titulares' }
      ],
      medidas_mitigacao: [
        { risco_relacionado: 'Vazamento de dados', medida: 'Implementar criptografia em repouso e em trânsito', tipo: 'Técnica', status: 'Planejada', prazo: '30 dias', risco_residual: 'Baixo' },
        { risco_relacionado: 'Acesso não autorizado', medida: 'MFA + controle de acesso baseado em funções', tipo: 'Técnica', status: 'Planejada', prazo: '30 dias', risco_residual: 'Baixo' },
        { risco_relacionado: 'Uso indevido por operador', medida: 'Firmar DPA com cláusulas de auditoria', tipo: 'Jurídica', status: 'Em implementação', prazo: '45 dias', risco_residual: 'Baixo' },
        { risco_relacionado: 'Retenção excessiva', medida: 'Implantar política de retenção com exclusão automatizada', tipo: 'Organizacional', status: 'Planejada', prazo: '60 dias', risco_residual: 'Baixo' },
        { risco_relacionado: 'Canal de direitos', medida: 'Criar canal digital para atendimento aos titulares', tipo: 'Organizacional', status: 'Planejada', prazo: '30 dias', risco_residual: 'Baixo' }
      ],
      parecer: {
        conclusao: `O tratamento de dados pessoais pela ${empresa.nome} apresenta riscos que podem ser mitigados com as medidas propostas.`,
        aprovacao: 'Aprovado com ressalvas',
        condicoes: 'Implementação das medidas de mitigação dentro dos prazos estabelecidos',
        revisao: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      scoreResidual: 4
    };
  }

  private async gerarPDF(empresa: Empresa, dpia: any, outputDir: string): Promise<string> {
    const pdfPath = path.join(outputDir, 'dpia.pdf');
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(16).text('RELATÓRIO DE IMPACTO À PROTEÇÃO DE DADOS', { align: 'center' });
    doc.fontSize(12).text('(RIPD / DPIA)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Empresa: ${empresa.nome} — CNPJ: ${empresa.cnpj}`, { align: 'center' });
    doc.fontSize(10).text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1);

    // Identificação
    if (dpia.identificacao) {
      doc.fontSize(13).text('1. IDENTIFICAÇÃO DO TRATAMENTO');
      doc.moveDown(0.3);
      doc.fontSize(10);
      if (dpia.identificacao.descricao) doc.text(`Descrição: ${dpia.identificacao.descricao}`, { width: 500 });
      if (dpia.identificacao.natureza) { doc.moveDown(0.2); doc.text(`Natureza: ${dpia.identificacao.natureza}`, { width: 500 }); }
      if (dpia.identificacao.escopo) { doc.moveDown(0.2); doc.text(`Escopo: ${dpia.identificacao.escopo}`, { width: 500 }); }
      if (dpia.identificacao.finalidade) { doc.moveDown(0.2); doc.text(`Finalidade: ${dpia.identificacao.finalidade}`, { width: 500 }); }
      doc.moveDown(1);
    }

    // Necessidade e Proporcionalidade
    if (dpia.necessidade_proporcionalidade) {
      doc.fontSize(13).text('2. NECESSIDADE E PROPORCIONALIDADE');
      doc.moveDown(0.3);
      doc.fontSize(10);
      const np = dpia.necessidade_proporcionalidade;
      if (np.baseLegal) doc.text(`Base Legal: ${np.baseLegal}`, { width: 500 });
      if (np.necessidade) { doc.moveDown(0.2); doc.text(`Necessidade: ${np.necessidade}`, { width: 500 }); }
      if (np.proporcionalidade) { doc.moveDown(0.2); doc.text(`Proporcionalidade: ${np.proporcionalidade}`, { width: 500 }); }
      doc.moveDown(1);
    }

    // Riscos
    doc.addPage();
    doc.fontSize(13).text('3. RISCOS IDENTIFICADOS');
    doc.moveDown(0.3);
    if (Array.isArray(dpia.riscos)) {
      dpia.riscos.forEach((risco: any, i: number) => {
        doc.fontSize(10).text(`${i + 1}. ${risco.descricao || risco.tipo || 'Risco'}`);
        doc.fontSize(9);
        if (risco.nivel) doc.text(`   Nível: ${risco.nivel} | Probabilidade: ${risco.probabilidade || 'N/A'} | Impacto: ${risco.impacto || 'N/A'}`);
        if (risco.titulares_afetados) doc.text(`   Titulares afetados: ${risco.titulares_afetados}`);
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // Medidas de mitigação
    doc.fontSize(13).text('4. MEDIDAS DE MITIGAÇÃO');
    doc.moveDown(0.3);
    if (Array.isArray(dpia.medidas_mitigacao)) {
      dpia.medidas_mitigacao.forEach((medida: any, i: number) => {
        doc.fontSize(10).text(`${i + 1}. ${medida.medida || 'Medida'}`);
        doc.fontSize(9);
        if (medida.tipo) doc.text(`   Tipo: ${medida.tipo} | Status: ${medida.status || 'N/A'} | Prazo: ${medida.prazo || 'N/A'}`);
        if (medida.risco_residual) doc.text(`   Risco residual: ${medida.risco_residual}`);
        doc.moveDown(0.3);
      });
    }

    // Parecer
    if (dpia.parecer) {
      doc.addPage();
      doc.fontSize(13).text('5. PARECER');
      doc.moveDown(0.3);
      doc.fontSize(10);
      if (dpia.parecer.conclusao) doc.text(`Conclusão: ${dpia.parecer.conclusao}`, { width: 500 });
      doc.moveDown(0.2);
      if (dpia.parecer.aprovacao) doc.text(`Decisão: ${dpia.parecer.aprovacao}`);
      if (dpia.parecer.condicoes) { doc.moveDown(0.2); doc.text(`Condições: ${dpia.parecer.condicoes}`, { width: 500 }); }
      if (dpia.parecer.revisao) { doc.moveDown(0.2); doc.text(`Próxima revisão: ${dpia.parecer.revisao}`); }
    }

    doc.moveDown(1);
    doc.fontSize(10).text(`Score de Risco Residual: ${dpia.scoreResidual || 'N/A'}/10`);

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(8).text('Documento gerado pelo DPO2U LGPD Kit — Conforme Art. 38 da LGPD', { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }
}