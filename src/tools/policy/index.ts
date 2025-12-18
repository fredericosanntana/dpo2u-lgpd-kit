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
      const politica = await this.gerarPolitica(empresa, dataFlows);
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

  private async gerarPolitica(empresa: Empresa, dataFlows: DataFlow[]): Promise<string> {
    // Check if wizard data is available for enhanced policy generation
    if (empresa.wizard_data && empresa.wizard_data.inventory.length > 0) {
      console.log('✓ Usando dados do wizard para política de privacidade');
      return this.gerarPoliticaDeWizard(empresa);
    }

    // Fallback to LLM-based generation
    const dadosColetados = [...new Set(dataFlows.flatMap(f => f.dados))].join(', ');
    const finalidades = [...new Set(dataFlows.map(f => f.finalidade))].join('; ');

    const prompt = `
Você é um advogado especialista em LGPD. Redija duas seções para a Política de Privacidade da empresa ${empresa.nome}.

DADOS BRUTOS:
- Dados pessoais tratados: ${dadosColetados}
- Finalidades do tratamento: ${finalidades}

Redija em linguagem jurídica clara e acolhedora:

1. Seção "DADOS COLETADOS": Descreva as categorias de dados coletados de forma textual e organizada.
2. Seção "FINALIDADES": Explique para que os dados são usados, baseando-se nas finalidades informadas.

Responda no formato:
[SECAO_DADOS]
...texto aqui...
[SECAO_FINALIDADES]
...texto aqui...
`;

    const response = await this.llm.generateText(prompt);

    let textoDados = `Coletamos os seguintes dados pessoais: ${dadosColetados}`;
    let textoFinalidades = finalidades;

    const matchDados = response.match(/\[SECAO_DADOS\]([\s\S]*?)\[SECAO_FINALIDADES\]/);
    if (matchDados && matchDados[1]) textoDados = matchDados[1].trim();

    const matchFinalidades = response.match(/\[SECAO_FINALIDADES\]([\s\S]*)/);
    if (matchFinalidades && matchFinalidades[1]) textoFinalidades = matchFinalidades[1].trim();

    return `POLÍTICA DE PRIVACIDADE
${empresa.nome}

Última atualização: ${new Date().toLocaleDateString('pt-BR')}

1. DADOS COLETADOS
${textoDados}

2. FINALIDADES
${textoFinalidades}

3. BASE LEGAL
Tratamento baseado nas hipóteses do Art. 7º da LGPD.

4. COMPARTILHAMENTO
${empresa.possuiOperadores ? 'Dados podem ser compartilhados com fornecedores mediante contrato, garantindo a segurança e confidencialidade das informações.' : 'Dados não são compartilhados com terceiros, exceto quando exigido por lei.'}

5. DIREITOS DOS TITULARES
- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos
- Eliminação dos dados
- Portabilidade dos dados
- Informação sobre compartilhamento
- Revogação do consentimento

6. CONTATO
Encarregado: ${empresa.contato.responsavel}
Email: ${empresa.contato.email}
${empresa.contato.telefone ? `Telefone: ${empresa.contato.telefone}` : ''}

7. SEGURANÇA
Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra acessos não autorizados e situações de destruição, perda, alteração ou qualquer forma de tratamento inadequado.

8. ALTERAÇÕES
Esta política pode ser alterada a qualquer tempo, com comunicação prévia aos titulares.`;
  }

  // New method: Generate policy from wizard data
  private gerarPoliticaDeWizard(empresa: Empresa): string {
    if (!empresa.wizard_data) return '';

    const { inventory, purposes, storage, third_parties, security } = empresa.wizard_data;

    // Build data collected section
    const dadosTexto = inventory.map(item => {
      const cat = item.categoria === 'sensivel' ? ' (dado sensível)' : '';
      return `- ${item.tipo}${cat}: ${item.descricao || 'Utilizado conforme descrito nesta política.'}`;
    }).join('\n');

    // Build purposes section
    const finalidadesTexto = purposes.map(p => {
      const item = inventory.find(i => i.dataItemId === p.dataItemId);
      return `- ${item?.tipo || 'Dado'}: ${p.finalidade}\n  Base legal: ${p.baseLegal}\n  Justificativa: ${p.justificativa}`;
    }).join('\n\n');

    // Build storage section
    const armazenamentoTexto = storage.map(s => {
      const item = inventory.find(i => i.dataItemId === s.dataItemId);
      return `- ${item?.tipo || 'Dado'}: Armazenado em ${s.localizacao}${s.provedor ? ` (${s.provedor})` : ''}, mantido por ${s.periodo_retencao}`;
    }).join('\n');

    // Build sharing section
    const compartilhamentoTexto = third_parties.length > 0
      ? third_parties.map(tp => {
        const dpaStatus = tp.possui_dpa ? `✓ DPA assinado${tp.data_dpa ? ` em ${tp.data_dpa}` : ''}` : '⚠️ DPA pendente';
        return `- ${tp.nome} (${tp.tipo}): ${tp.finalidade_compartilhamento}\n  ${dpaStatus}`;
      }).join('\n\n')
      : 'Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei.';

    // Build security section
    const medidasTecnicas = [];
    if (security.tecnicas.criptografia) medidasTecnicas.push(`Criptografia ${security.tecnicas.criptografia_descricao || ''}`);
    if (security.tecnicas.controle_acesso) medidasTecnicas.push(`Controle de acesso ${security.tecnicas.controle_acesso_descricao || ''}`);
    if (security.tecnicas.backup) medidasTecnicas.push(`Backup regular ${security.tecnicas.backup_frequencia ? `(${security.tecnicas.backup_frequencia})` : ''}`);
    if (security.tecnicas.firewall) medidasTecnicas.push('Firewall');
    if (security.tecnicas.antivirus) medidasTecnicas.push('Antivírus');
    if (security.tecnicas.monitoramento) medidasTecnicas.push('Monitoramento de segurança');

    const medidasOrganizacionais = [];
    if (security.organizacionais.politica_privacidade_interna) medidasOrganizacionais.push('Política de privacidade interna');
    if (security.organizacionais.treinamento_colaboradores) medidasOrganizacionais.push(`Treinamento de colaboradores ${security.organizacionais.treinamento_frequencia ? `(${security.organizacionais.treinamento_frequencia})` : ''}`);
    if (security.organizacionais.procedimentos_documentados) medidasOrganizacionais.push('Procedimentos documentados');
    if (security.organizacionais.auditoria_regular) medidasOrganizacionais.push('Auditoria regular');

    return `POLÍTICA DE PRIVACIDADE
${empresa.nome}
CNPJ: ${empresa.cnpj}

Última atualização: ${new Date().toLocaleDateString('pt-BR')}

1. INTRODUÇÃO
Esta Política de Privacidade descreve como ${empresa.nome} coleta, usa, armazena e protege os dados pessoais de nossos clientes, usuários e colaboradores, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

2. DADOS COLETADOS
Coletamos e tratamos as seguintes categorias de dados pessoais:

${dadosTexto}

3. FINALIDADES E BASES LEGAIS
Utilizamos os dados pessoais para as seguintes finalidades:

${finalidadesTexto}

4. ARMAZENAMENTO E RETENÇÃO
${armazenamentoTexto}

5. COMPARTILHAMENTO DE DADOS
${compartilhamentoTexto}

6. SEGURANÇA
Adotamos as seguintes medidas de segurança:

Medidas Técnicas:
${medidasTecnicas.map(m => `- ${m}`).join('\n')}

Medidas Organizacionais:
${medidasOrganizacionais.map(m => `- ${m}`).join('\n')}

7. DIREITOS DOS TITULARES
Você tem direito a:
- Confirmação da existência de tratamento dos seus dados
- Acesso aos seus dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados
- Portabilidade dos dados
- Informação sobre compartilhamento dos dados
- Revogação do consentimento

8. ENCARREGADO DE DADOS (DPO)
Para exercer seus direitos ou esclarecer dúvidas sobre esta política:
Nome: ${empresa.contato.responsavel}
Email: ${empresa.contato.email}
${empresa.contato.telefone ? `Telefone: ${empresa.contato.telefone}` : ''}

9. ALTERAÇÕES NESTA POLÍTICA
Esta política pode ser atualizada periodicamente. A data da última atualização está indicada no início deste documento.`;
  }
}