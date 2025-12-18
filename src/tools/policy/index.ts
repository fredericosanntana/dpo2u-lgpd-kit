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
Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas.

8. ALTERAÇÕES
Esta política pode ser alterada a qualquer tempo, com comunicação prévia aos titulares.`;
  }
}