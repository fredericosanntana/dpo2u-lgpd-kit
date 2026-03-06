import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class BreachTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) { }

  async execute(empresa: Empresa, outputDir: string): Promise<ToolResult> {
    try {
      const plano = await this.gerarPlanoIncidenteViaLLM(empresa);
      const docPath = path.join(outputDir, 'plano-incidente.txt');
      fs.writeFileSync(docPath, plano);

      this.logger.log('BREACH_RESPONSE_PLAN', true, { empresa: empresa.nome }, { arquivo: docPath });

      return {
        success: true,
        file: docPath,
        data: plano
      };

    } catch (error) {
      this.logger.log('BREACH_RESPONSE_PLAN', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async gerarPlanoIncidenteViaLLM(empresa: Empresa): Promise<string> {
    // Identificar dados sensíveis do wizard se disponível
    let dadosSensiveis = '';
    let riscos = '';
    if (empresa.wizard_data) {
      const sensiveis = empresa.wizard_data.inventory.filter(i => i.categoria === 'sensivel');
      if (sensiveis.length > 0) {
        dadosSensiveis = `\nDADOS SENSÍVEIS TRATADOS:\n${sensiveis.map(s => `- ${s.tipo}: ${s.descricao || 'sem descrição'}`).join('\n')}`;
      }
      if (empresa.wizard_data.risks) {
        const r = empresa.wizard_data.risks;
        const riskItems = [];
        if (r.atividades_alto_risco) riskItems.push(`Atividades de alto risco: ${r.atividades_alto_risco_descricao || 'sim'}`);
        if (r.decisoes_automatizadas) riskItems.push(`Decisões automatizadas: ${r.decisoes_automatizadas_descricao || 'sim'}`);
        if (r.transferencia_internacional) riskItems.push(`Transferência internacional para: ${r.transferencia_internacional_paises?.join(', ') || 'países não especificados'}`);
        if (r.incidentes_anteriores) riskItems.push(`Incidentes anteriores: ${r.incidentes_anteriores_descricao || 'sim'}`);
        if (riskItems.length > 0) {
          riscos = `\nFATORES DE RISCO IDENTIFICADOS:\n${riskItems.map(i => `- ${i}`).join('\n')}`;
        }
      }
    }

    const prompt = `Você é um especialista em segurança da informação e resposta a incidentes, certificado em ISO 27001, CISM, e com experiência em LGPD (Lei 13.709/2018).

Elabore um Plano de Resposta a Incidentes de Segurança de Dados Pessoais completo e personalizado para:

EMPRESA: ${empresa.nome}
CNPJ: ${empresa.cnpj}
SETOR: ${empresa.setor}
COLABORADORES: ${empresa.colaboradores}
DPO/ENCARREGADO: ${empresa.contato.responsavel} (${empresa.contato.email}${empresa.contato.telefone ? `, tel: ${empresa.contato.telefone}` : ''})
COLETA DADOS PESSOAIS: ${empresa.coletaDados ? 'Sim' : 'Não'}
POSSUI OPERADORES TERCEIROS: ${empresa.possuiOperadores ? 'Sim' : 'Não'}
${dadosSensiveis}${riscos}

O plano DEVE conter as seguintes seções, PERSONALIZADAS para o contexto da empresa:

1. EQUIPE DE RESPOSTA A INCIDENTES
   - Papéis e responsabilidades específicos (Coordenador, Técnico, Jurídico, Comunicação)
   - Matriz RACI para o setor ${empresa.setor}
   - Contatos internos e externos

2. CLASSIFICAÇÃO DE INCIDENTES
   - Tabela de severidade (Baixo/Médio/Alto/Crítico) com exemplos ESPECÍFICOS para o setor ${empresa.setor}
   - Critérios de escalação baseados no tipo de dado afetado

3. PROCEDIMENTOS POR FASE TEMPORAL
   - Primeiros 30 minutos: contenção e documentação
   - Primeiras 2 horas: investigação e avaliação de impacto
   - Primeiras 24 horas: notificações obrigatórias
   - Primeiras 72 horas: comunicação à ANPD (Art. 48 LGPD)
   - Até 15 dias: comunicação aos titulares e relatório final

4. CENÁRIOS DE INCIDENTES ESPECÍFICOS
   - Pelo menos 3 cenários realistas para o setor ${empresa.setor}
   - Para cada cenário: descrição, classificação, ações imediatas, notificações necessárias

5. CRITÉRIOS DE NOTIFICAÇÃO À ANPD (Art. 48)
   - Quando notificar vs. quando não notificar
   - Conteúdo mínimo da comunicação
   - Prazos legais
   - Template de comunicação preenchido com dados da empresa

6. COMUNICAÇÃO AOS TITULARES
   - Critérios para decidir comunicar
   - Template de comunicação personalizado
   - Canais de comunicação

7. PÓS-INCIDENTE
   - Análise de causa raiz
   - Plano de remediação
   - Atualização de controles
   - Lições aprendidas
   - Relatório final para a diretoria

8. CONTATOS DE EMERGÊNCIA
   - ANPD
   - Autoridades policiais (crimes cibernéticos)
   - Assessoria jurídica
   - Consultor forense

9. PROGRAMA DE TESTES
   - Frequência de simulações (tabletop exercises)
   - Métricas de eficácia (MTTD, MTTR)

10. REVISÃO E ATUALIZAÇÃO
    - Periodicidade de revisão
    - Triggers para revisão extraordinária
    - Responsável pela manutenção

Use linguagem profissional e técnica. Seja ESPECÍFICO para o setor ${empresa.setor} — não gere plano genérico. Inclua referências aos artigos da LGPD quando pertinente.`;

    const response = await this.llm.generateText(prompt);

    const header = `PLANO DE RESPOSTA A INCIDENTES DE SEGURANÇA DE DADOS PESSOAIS
${empresa.nome} — CNPJ: ${empresa.cnpj}
Setor: ${empresa.setor}

Data de elaboração: ${new Date().toLocaleDateString('pt-BR')}
Versão: 1.0
Classificação: CONFIDENCIAL

Responsável: ${empresa.contato.responsavel}
Email: ${empresa.contato.email}
${empresa.contato.telefone ? `Telefone: ${empresa.contato.telefone}` : ''}

${'='.repeat(60)}

`;

    const footer = `

${'='.repeat(60)}

CONTROLE DE VERSÃO
| Versão | Data | Responsável | Descrição |
|--------|------|-------------|-----------|
| 1.0 | ${new Date().toLocaleDateString('pt-BR')} | ${empresa.contato.responsavel} | Elaboração inicial |

APROVAÇÕES
Elaborado por: ${empresa.contato.responsavel} — DPO/Encarregado
Aprovado por: _________________________ — Diretoria
Data de aprovação: ____/____/________

Próxima revisão: ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} (semestral)

Documento gerado pelo DPO2U LGPD Kit — ${new Date().toISOString()}`;

    return header + response + footer;
  }
}