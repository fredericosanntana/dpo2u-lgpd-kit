import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class PolicyTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) { }

  async execute(empresa: Empresa, dataFlows: DataFlow[], outputDir: string): Promise<ToolResult> {
    try {
      let politica: string;

      if (empresa.wizard_data && empresa.wizard_data.inventory.length > 0) {
        console.log('  ✓ Usando dados do wizard + IA para política de privacidade');
        politica = await this.gerarPoliticaDeWizardComLLM(empresa);
      } else {
        console.log('  ✓ Gerando política completa via IA');
        politica = await this.gerarPoliticaCompletaViaLLM(empresa, dataFlows);
      }

      const docPath = path.join(outputDir, 'politica-privacidade.txt');
      fs.writeFileSync(docPath, politica);

      this.logger.log('PRIVACY_POLICY_GENERATION', true, { empresa: empresa.nome }, { arquivo: docPath });

      return {
        success: true,
        file: docPath,
        data: politica
      };

    } catch (error) {
      this.logger.log('PRIVACY_POLICY_GENERATION', false, empresa, undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Gera TODAS as seções da política via LLM com dados do wizard
  private async gerarPoliticaDeWizardComLLM(empresa: Empresa): Promise<string> {
    const wd = empresa.wizard_data!;

    // Preparar contexto estruturado
    const dadosColetados = wd.inventory.map(i => {
      const cat = i.categoria === 'sensivel' ? ' (SENSÍVEL)' : '';
      return `${i.tipo}${cat}: ${i.descricao || 'conforme descrito nesta política'}`;
    }).join('\n');

    const finalidades = wd.purposes.map(p => {
      const item = wd.inventory.find(i => i.id === p.dataItemId);
      return `${item?.tipo || 'Dado'}: ${p.finalidade} (Base legal: ${p.baseLegal})`;
    }).join('\n');

    const armazenamento = wd.storage.map(s => {
      const item = wd.inventory.find(i => i.id === s.dataItemId);
      return `${item?.tipo || 'Dado'}: ${s.localizacao}${s.provedor ? ` (${s.provedor})` : ''}, retido por ${s.periodo_retencao}`;
    }).join('\n');

    const terceiros = wd.third_parties.length > 0
      ? wd.third_parties.map(tp => `${tp.nome} (${tp.tipo}): ${tp.finalidade_compartilhamento}`).join('\n')
      : 'Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei.';

    const seguranca = [
      wd.security.tecnicas.criptografia ? 'Criptografia de dados' : null,
      wd.security.tecnicas.controle_acesso ? 'Controle de acesso' : null,
      wd.security.tecnicas.backup ? 'Backup regular' : null,
      wd.security.tecnicas.firewall ? 'Firewall' : null,
      wd.security.tecnicas.monitoramento ? 'Monitoramento de segurança' : null,
      wd.security.organizacionais.treinamento_colaboradores ? 'Treinamento de colaboradores' : null,
      wd.security.organizacionais.procedimentos_documentados ? 'Procedimentos documentados' : null,
      wd.security.organizacionais.auditoria_regular ? 'Auditoria regular' : null,
    ].filter(Boolean).join(', ');

    const prompt = `Você é um advogado especialista em direito digital e proteção de dados, com experiência em LGPD (Lei 13.709/2018).

Redija uma Política de Privacidade COMPLETA e PROFISSIONAL para a empresa abaixo, usando os dados estruturados fornecidos.

EMPRESA: ${empresa.nome}
CNPJ: ${empresa.cnpj}
SETOR: ${empresa.setor}
DPO/ENCARREGADO: ${empresa.contato.responsavel} (${empresa.contato.email}${empresa.contato.telefone ? `, tel: ${empresa.contato.telefone}` : ''})

DADOS COLETADOS:
${dadosColetados}

FINALIDADES E BASES LEGAIS:
${finalidades}

ARMAZENAMENTO E RETENÇÃO:
${armazenamento}

COMPARTILHAMENTO COM TERCEIROS:
${terceiros}

MEDIDAS DE SEGURANÇA IMPLEMENTADAS:
${seguranca}

Redija a política com TODAS as seguintes seções (não omita nenhuma):

1. INTRODUÇÃO — Objetivo da política e identificação do controlador
2. DADOS COLETADOS — Categorias detalhadas com base nos dados acima
3. FINALIDADES E BASES LEGAIS — Use as bases legais específicas fornecidas, cite os artigos do Art. 7° da LGPD
4. ARMAZENAMENTO E RETENÇÃO — Locais, períodos e procedimentos de exclusão
5. COMPARTILHAMENTO DE DADOS — Quem, por que e sob quais garantias
6. SEGURANÇA DOS DADOS — Medidas técnicas e organizacionais implementadas (Art. 46)
7. DIREITOS DOS TITULARES — TODOS os direitos do Art. 18 da LGPD, com descrição de como exercê-los
8. COOKIES E TECNOLOGIAS — Política de cookies (se aplicável ao setor)
9. TRANSFERÊNCIA INTERNACIONAL — Aplicabilidade conforme Art. 33-36
10. ENCARREGADO DE DADOS (DPO) — Nome, email, canal de atendimento
11. ALTERAÇÕES NESTA POLÍTICA — Procedimentos de atualização e comunicação

REGRAS:
- Linguagem jurídica clara, objetiva e acessível
- Cite artigos da LGPD quando relevante
- Personalize para o setor ${empresa.setor}
- Use os dados reais fornecidos, NÃO invente dados
- Formato: texto corrido com seções numeradas`;

    const response = await this.llm.generateText(prompt);

    const header = `POLÍTICA DE PRIVACIDADE
${empresa.nome}
CNPJ: ${empresa.cnpj}

Última atualização: ${new Date().toLocaleDateString('pt-BR')}

`;

    return header + response;
  }

  // Gera política completa via LLM quando não há dados do wizard
  private async gerarPoliticaCompletaViaLLM(empresa: Empresa, dataFlows: DataFlow[]): Promise<string> {
    const dadosColetados = [...new Set(dataFlows.flatMap(f => f.dados))].join(', ');
    const finalidades = [...new Set(dataFlows.map(f => f.finalidade))].join('; ');
    const basesLegais = [...new Set(dataFlows.map(f => f.baseLegal).filter(b => b && b !== 'A definir'))].join('; ');
    const operadores = [...new Set(dataFlows.map(f => f.operador).filter(Boolean))].join(', ');

    const prompt = `Você é um advogado especialista em LGPD (Lei 13.709/2018).

Redija uma Política de Privacidade COMPLETA para:

EMPRESA: ${empresa.nome}
CNPJ: ${empresa.cnpj}
SETOR: ${empresa.setor}
COLABORADORES: ${empresa.colaboradores}
DPO: ${empresa.contato.responsavel} (${empresa.contato.email})
DADOS TRATADOS: ${dadosColetados || 'dados pessoais gerais'}
FINALIDADES: ${finalidades || 'execução das atividades empresariais'}
BASES LEGAIS IDENTIFICADAS: ${basesLegais || 'Art. 7°, V — Execução de contrato'}
OPERADORES TERCEIROS: ${operadores || (empresa.possuiOperadores ? 'Sim (a identificar)' : 'Não possui')}

A política DEVE conter TODAS estas seções:
1. INTRODUÇÃO — Com identificação completa do controlador
2. DADOS COLETADOS — Categorias de dados pessoais tratados
3. FINALIDADES E BASES LEGAIS — Com citação dos artigos do Art. 7° LGPD
4. ARMAZENAMENTO E RETENÇÃO — Locais e períodos
5. COMPARTILHAMENTO — Com quem e sob quais garantias
6. SEGURANÇA — Medidas técnicas e organizacionais (Art. 46)
7. DIREITOS DOS TITULARES — Todos os direitos do Art. 18 LGPD com instruções de exercício
8. COOKIES — Política de cookies se aplicável
9. TRANSFERÊNCIA INTERNACIONAL — Conforme Art. 33-36
10. DPO — Dados de contato do encarregado
11. ALTERAÇÕES — Procedimentos de atualização

Use linguagem jurídica clara e personalizada para o setor ${empresa.setor}. Cite artigos da LGPD.
NÃO use texto genérico ou placeholders. Gere conteúdo real e profissional.`;

    const response = await this.llm.generateText(prompt);

    const header = `POLÍTICA DE PRIVACIDADE
${empresa.nome}
CNPJ: ${empresa.cnpj}

Última atualização: ${new Date().toLocaleDateString('pt-BR')}

`;

    return header + response;
  }
}