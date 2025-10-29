import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class PolicyTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

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
    const finalidades = dataFlows.map(f => f.finalidade).join('; ');

    return `POLÍTICA DE PRIVACIDADE
${empresa.nome}

Última atualização: ${new Date().toLocaleDateString('pt-BR')}

1. DADOS COLETADOS
Coletamos os seguintes dados pessoais: ${dadosColetados}

2. FINALIDADES
${finalidades}

3. BASE LEGAL
Tratamento baseado nas hipóteses do Art. 7º da LGPD.

4. COMPARTILHAMENTO
${empresa.possuiOperadores ? 'Dados podem ser compartilhados com fornecedores mediante contrato.' : 'Dados não são compartilhados com terceiros.'}

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
Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais.

8. ALTERAÇÕES
Esta política pode ser alterada a qualquer tempo, com comunicação prévia aos titulares.`;
  }
}