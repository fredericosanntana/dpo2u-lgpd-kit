import { OllamaClient } from '../../lib/ollama.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, DataFlow, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class DpaTool {
  constructor(
    private ollama: OllamaClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, dataFlows: DataFlow[], outputDir: string): Promise<ToolResult> {
    try {
      const dpa = this.gerarContratoDPA(empresa);
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

  private gerarContratoDPA(empresa: Empresa): string {
    return `ADENDO DE PROTEÇÃO DE DADOS (DPA)
${empresa.nome}

Data: ${new Date().toLocaleDateString('pt-BR')}

1. DEFINIÇÕES
Controlador: ${empresa.nome}
Operador: [Nome do Fornecedor]

2. OBJETO
Este adendo regula o tratamento de dados pessoais pelo Operador em nome do Controlador.

3. OBRIGAÇÕES DO OPERADOR
- Tratar dados apenas conforme instruções documentadas
- Garantir confidencialidade dos dados
- Implementar medidas técnicas de segurança
- Auxiliar o Controlador no atendimento aos direitos dos titulares
- Notificar incidentes de segurança em até 24 horas
- Excluir ou devolver dados ao final do contrato

4. MEDIDAS DE SEGURANÇA
- Criptografia de dados em trânsito e repouso
- Controle de acesso baseado em funções
- Logs de auditoria
- Backup seguro
- Treinamento de equipe

5. SUBCONTRATAÇÃO
Qualquer subcontratação deve ser aprovada previamente pelo Controlador.

6. TRANSFERÊNCIA INTERNACIONAL
${empresa.setor.includes('Internacional') ? 'Transferências internacionais mediante salvaguardas adequadas.' : 'Dados permanecem no território nacional.'}

7. AUDITORIA
Controlador pode auditar o cumprimento deste adendo mediante aviso prévio.

8. RESPONSABILIDADE
Operador é responsável por danos causados por tratamento em desacordo com a LGPD.

9. VIGÊNCIA
Este adendo vigora durante todo o período do contrato principal.


Controlador: _________________________
${empresa.contato.responsavel}

Operador: ___________________________
[Nome e Assinatura]`;
  }
}