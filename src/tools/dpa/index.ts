import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import { extractJson } from '../../lib/validator.js';
import fs from 'fs';
import path from 'path';

export class DpaTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) { }

  async execute(empresa: Empresa, dataFlows: DataFlow[], outputDir: string): Promise<ToolResult> {
    try {
      let dpa: string;

      // Se wizard_data tem third_parties, gerar DPA personalizado para cada operador
      if (empresa.wizard_data && empresa.wizard_data.third_parties.length > 0) {
        console.log(`  ✓ ${empresa.wizard_data.third_parties.length} operador(es) encontrado(s) no wizard`);
        dpa = await this.gerarDPAsPersonalizados(empresa, dataFlows);
      } else if (dataFlows.some(f => f.operador && f.operador.trim() !== '' && f.operador !== 'A definir')) {
        console.log('  ✓ Operadores identificados nos fluxos de dados');
        dpa = await this.gerarDPADeFluxos(empresa, dataFlows);
      } else {
        console.log('  ⚠️ Nenhum operador específico encontrado, gerando modelo genérico via IA');
        dpa = await this.gerarDPAGenericoViaLLM(empresa);
      }

      const docPath = path.join(outputDir, 'contrato-dpa.txt');
      fs.writeFileSync(docPath, dpa);

      this.logger.log('DPA_CONTRACT_GENERATION', true, { empresa: empresa.nome }, { arquivo: docPath });

      return {
        success: true,
        file: docPath,
        data: dpa
      };

    } catch (error) {
      this.logger.log('DPA_CONTRACT_GENERATION', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Gera DPA personalizado para cada operador do wizard
  private async gerarDPAsPersonalizados(empresa: Empresa, dataFlows: DataFlow[]): Promise<string> {
    const parties = empresa.wizard_data!.third_parties;
    const sections: string[] = [];

    sections.push(`ADENDOS DE PROTEÇÃO DE DADOS (DPA)\n${empresa.nome} — CNPJ: ${empresa.cnpj}\n`);
    sections.push(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}\n`);
    sections.push(`Este documento contém ${parties.length} adendo(s) de proteção de dados, um para cada operador/processador identificado.\n`);
    sections.push('='.repeat(80) + '\n');

    for (let i = 0; i < parties.length; i++) {
      const tp = parties[i];
      const dadosCompartilhados = tp.dados_compartilhados.join(', ') || 'dados pessoais gerais';

      const prompt = `Você é um advogado especialista em LGPD (Lei 13.709/2018).

Redija as cláusulas específicas de um Adendo de Proteção de Dados (DPA) entre:

CONTROLADOR: ${empresa.nome} (CNPJ: ${empresa.cnpj}), setor: ${empresa.setor}
OPERADOR: ${tp.nome}${tp.cnpj ? ` (CNPJ: ${tp.cnpj})` : ''}, tipo: ${tp.tipo}, localização: ${tp.localizacao}

CONTEXTO:
- Dados compartilhados: ${dadosCompartilhados}
- Finalidade do compartilhamento: ${tp.finalidade_compartilhamento}
- DPA existente: ${tp.possui_dpa ? 'Sim' + (tp.data_dpa ? `, assinado em ${tp.data_dpa}` : '') : 'Não — este é o primeiro DPA'}

Gere APENAS as seguintes seções no formato solicitado:

[OBJETO]
Descreva o objeto do contrato especificando os dados e a finalidade.

[OBRIGACOES_OPERADOR]
Liste as obrigações específicas do operador considerando o tipo de dado e finalidade.

[MEDIDAS_SEGURANCA]
Medidas técnicas e organizacionais obrigatórias que o operador deve implementar.

[SUBCONTRATACAO]
Regras sobre subcontratação de terceiros pelo operador.

[TRANSFERENCIA_INTERNACIONAL]
Cláusula sobre transferência internacional (considere a localização: ${tp.localizacao}).

[INCIDENTES]
Procedimentos de notificação de incidentes de segurança pelo operador.

[AUDITORIA]
Direitos de auditoria do controlador sobre o operador.

[VIGENCIA_RESCISAO]
Vigência, rescisão e obrigações pós-contratuais (devolução/exclusão de dados).

Responda com texto jurídico claro e objetivo, personalizado para este contexto específico. NÃO use placeholders genéricos.`;

      const response = await this.llm.generateText(prompt);

      // Montar o DPA completo para este operador
      sections.push(`\nADENDO DE PROTEÇÃO DE DADOS #${i + 1}`);
      sections.push(`Operador: ${tp.nome}${tp.cnpj ? ` — CNPJ: ${tp.cnpj}` : ''}`);
      sections.push(`Tipo: ${tp.tipo} | Localização: ${tp.localizacao}`);
      sections.push(`Dados compartilhados: ${dadosCompartilhados}`);
      sections.push(`Finalidade: ${tp.finalidade_compartilhamento}`);
      sections.push('-'.repeat(60));

      // Parsear as seções do LLM ou usar a resposta inteira
      const parsed = this.parseSections(response);
      if (Object.keys(parsed).length >= 3) {
        sections.push(this.formatParsedDPA(parsed, empresa, tp));
      } else {
        // LLM não seguiu o formato, usar a resposta direta
        sections.push(response);
      }

      sections.push('\n' + '='.repeat(80));

      // Assinaturas
      sections.push(`\nControlador: _________________________`);
      sections.push(`${empresa.contato.responsavel} — ${empresa.nome}\n`);
      sections.push(`Operador: ___________________________`);
      sections.push(`[Nome e Assinatura] — ${tp.nome}\n`);
    }

    return sections.join('\n');
  }

  // Gera DPA a partir dos fluxos de dados (quando wizard não está disponível)
  private async gerarDPADeFluxos(empresa: Empresa, dataFlows: DataFlow[]): Promise<string> {
    const operadores = [...new Set(dataFlows
      .filter(f => f.operador && f.operador.trim() !== '' && f.operador !== 'A definir')
      .map(f => f.operador!)
    )];

    const dadosPorOperador = operadores.map(op => {
      const fluxos = dataFlows.filter(f => f.operador === op);
      return {
        operador: op,
        dados: [...new Set(fluxos.flatMap(f => f.dados))],
        finalidades: [...new Set(fluxos.map(f => f.finalidade))]
      };
    });

    const prompt = `Você é um advogado especialista em LGPD (Lei 13.709/2018).

Redija um Adendo de Proteção de Dados (DPA) completo entre o Controlador e os operadores identificados.

CONTROLADOR: ${empresa.nome} (CNPJ: ${empresa.cnpj}), setor: ${empresa.setor}

OPERADORES E DADOS:
${dadosPorOperador.map(o => `- ${o.operador}: processa ${o.dados.join(', ')} para ${o.finalidades.join('; ')}`).join('\n')}

Gere um DPA completo com as seguintes seções:
1. DEFINIÇÕES — Com definições de Controlador, Operador, Dados Pessoais, Tratamento específicas
2. OBJETO — O que cada operador faz e quais dados processa
3. OBRIGAÇÕES DO OPERADOR — Personalizadas para o tipo de dados
4. MEDIDAS DE SEGURANÇA — Proporcionais ao tipo de dados tratados
5. SUBCONTRATAÇÃO — Regras claras
6. TRANSFERÊNCIA INTERNACIONAL — Considerando o setor ${empresa.setor}
7. NOTIFICAÇÃO DE INCIDENTES — Com prazos (24h para controlador)
8. AUDITORIA — Direitos de verificação
9. RESPONSABILIDADE — Limites e solidariedade
10. VIGÊNCIA E RESCISÃO — Com obrigações pós-contratuais

Use linguagem jurídica formal e profissional. Personalize para o contexto da empresa ${empresa.nome} no setor ${empresa.setor}. NÃO use texto genérico.`;

    const response = await this.llm.generateText(prompt);

    const header = `ADENDO DE PROTEÇÃO DE DADOS (DPA)\n${empresa.nome} — CNPJ: ${empresa.cnpj}\n\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    const footer = `\n\nControlador: _________________________\n${empresa.contato.responsavel} — ${empresa.nome}\n\nOperador: ___________________________\n[Nome e Assinatura]`;

    return header + response + footer;
  }

  // Gera DPA genérico via LLM (sem operadores específicos)
  private async gerarDPAGenericoViaLLM(empresa: Empresa): Promise<string> {
    const prompt = `Você é um advogado especialista em LGPD (Lei 13.709/2018).

Redija um modelo de Adendo de Proteção de Dados (DPA) para a empresa:

CONTROLADOR: ${empresa.nome}
CNPJ: ${empresa.cnpj}
Setor: ${empresa.setor}
Colaboradores: ${empresa.colaboradores}
Coleta dados pessoais: ${empresa.coletaDados ? 'Sim' : 'Não'}
Possui operadores terceiros: ${empresa.possuiOperadores ? 'Sim' : 'Não'}
DPO/Encarregado: ${empresa.contato.responsavel} (${empresa.contato.email})

Gere um DPA modelo completo com:
1. DEFINIÇÕES — Conceitos relevantes para LGPD aplicados ao contexto
2. OBJETO — Descrição genérica adaptável ao tipo de serviço
3. OBRIGAÇÕES DO OPERADOR — Incluindo tratamento por instrução, confidencialidade, cooperação
4. MEDIDAS DE SEGURANÇA — Técnicas e organizacionais proporcionais ao setor ${empresa.setor}
5. SUBCONTRATAÇÃO — Condições para sub-operadores
6. TRANSFERÊNCIA INTERNACIONAL — Compatível com Art. 33 LGPD
7. NOTIFICAÇÃO DE INCIDENTES — Prazos e procedimentos (Art. 48)
8. DIREITO DE AUDITORIA — Do controlador sobre o operador
9. RESPONSABILIDADE — Solidária conforme Art. 42
10. VIGÊNCIA E RESCISÃO — Devolução/exclusão de dados

Personalize o documento para uma empresa de ${empresa.colaboradores} colaboradores no setor ${empresa.setor}. Não gere documento genérico.`;

    const response = await this.llm.generateText(prompt);

    const header = `ADENDO DE PROTEÇÃO DE DADOS (DPA) — MODELO\n${empresa.nome} — CNPJ: ${empresa.cnpj}\n\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    const footer = `\n\nControlador: _________________________\n${empresa.contato.responsavel} — ${empresa.nome}\n\nOperador: ___________________________\n[Nome e Assinatura]`;

    return header + response + footer;
  }

  // Helpers
  private parseSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const regex = /\[(\w+)\]\s*([\s\S]*?)(?=\[\w+\]|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      sections[match[1]] = match[2].trim();
    }
    return sections;
  }

  private formatParsedDPA(sections: Record<string, string>, empresa: Empresa, tp: any): string {
    const lines: string[] = [];
    const sectionNames: Record<string, string> = {
      'OBJETO': '1. OBJETO',
      'OBRIGACOES_OPERADOR': '2. OBRIGAÇÕES DO OPERADOR',
      'MEDIDAS_SEGURANCA': '3. MEDIDAS DE SEGURANÇA',
      'SUBCONTRATACAO': '4. SUBCONTRATAÇÃO',
      'TRANSFERENCIA_INTERNACIONAL': '5. TRANSFERÊNCIA INTERNACIONAL',
      'INCIDENTES': '6. NOTIFICAÇÃO DE INCIDENTES',
      'AUDITORIA': '7. AUDITORIA',
      'VIGENCIA_RESCISAO': '8. VIGÊNCIA E RESCISÃO'
    };

    for (const [key, title] of Object.entries(sectionNames)) {
      if (sections[key]) {
        lines.push(`\n${title}`);
        lines.push(sections[key]);
      }
    }

    return lines.join('\n');
  }
}