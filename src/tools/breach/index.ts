import { LanguageModelClient } from '../../lib/llm.js';
import { Logger } from '../../lib/logger.js';
import { Empresa, ToolResult } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export class BreachTool {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger
  ) {}

  async execute(empresa: Empresa, outputDir: string): Promise<ToolResult> {
    try {
      const plano = this.gerarPlanoIncidente(empresa);
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

  private gerarPlanoIncidente(empresa: Empresa): string {
    return `PLANO DE RESPOSTA A INCIDENTES DE DADOS
${empresa.nome}

Data: ${new Date().toLocaleDateString('pt-BR')}

1. EQUIPE DE RESPOSTA
Coordenador: ${empresa.contato.responsavel}
Email: ${empresa.contato.email}
${empresa.contato.telefone ? `Telefone: ${empresa.contato.telefone}` : ''}

2. CLASSIFICAÇÃO DE INCIDENTES
Baixo: Acesso não autorizado limitado
Médio: Exposição de dados não sensíveis
Alto: Vazamento de dados sensíveis
Crítico: Vazamento massivo com risco aos titulares

3. PRIMEIROS 30 MINUTOS
□ Identificar e conter o incidente
□ Documentar evidências
□ Acionar equipe de resposta
□ Avaliar gravidade e impacto

4. PRIMEIRAS 2 HORAS
□ Investigar causa raiz
□ Implementar medidas corretivas
□ Preparar comunicação interna
□ Avaliar necessidade de notificação à ANPD

5. PRIMEIRAS 24 HORAS
□ Notificar ANPD (se aplicável)
□ Preparar comunicação aos titulares
□ Revisar medidas de segurança
□ Documentar lições aprendidas

6. CRITÉRIOS PARA NOTIFICAÇÃO ANPD
- Incidente de alto risco aos direitos dos titulares
- Possibilidade de danos patrimoniais, morais ou coletivos
- Vazamento de dados sensíveis
- Grande volume de titulares afetados

7. TEMPLATE DE COMUNICAÇÃO
\"Informamos sobre incidente de segurança ocorrido em [data].\nDados afetados: [tipos]\nTitulares impactados: [número]\nMedidas adotadas: [ações]\nContato: ${empresa.contato.email}\"\n
8. PÓS-INCIDENTE
□ Análise forense completa
□ Atualização de políticas
□ Treinamento adicional
□ Monitoramento reforçado
□ Relatório final

9. CONTATOS IMPORTANTES
ANPD: https://www.gov.br/anpd/
Polícia Civil - Crimes Cibernéticos
Advogado especializado em LGPD

10. REVISÃO
Este plano deve ser revisado semestralmente e testado anualmente.`;
  }
}