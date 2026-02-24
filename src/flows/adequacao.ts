import { LanguageModelClient } from '../lib/llm.js';
import { Logger } from '../lib/logger.js';
import { Empresa } from '../types/index.js';
import { MaturityTool } from '../tools/maturity/index.js';
import { DataFlowTool } from '../tools/dataflow/index.js';
import { LegalBasisTool } from '../tools/legalbasis/index.js';
import { DpiaTool } from '../tools/dpia/index.js';
import { PolicyTool } from '../tools/policy/index.js';
import { DpaTool } from '../tools/dpa/index.js';
import { BreachTool } from '../tools/breach/index.js';
import { ReportTool } from '../tools/report/index.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export class AdequacaoFlow {
  constructor(
    private llm: LanguageModelClient,
    private logger: Logger,
    private outputDir: string
  ) { }

  async execute(empresa: Empresa): Promise<void> {
    console.log('🔄 Iniciando fluxo de adequação LGPD...\\n');

    // Etapa 1: Avaliação de Maturidade
    console.log('📊 1/8 - Avaliando maturidade LGPD...');
    const maturityTool = new MaturityTool(this.llm, this.logger);
    const maturityResult = await maturityTool.execute(empresa, this.outputDir);

    // Etapa 2: Mapeamento de Dados
    console.log('🗺️  2/8 - Mapeando fluxo de dados...');
    const dataFlowTool = new DataFlowTool(this.llm, this.logger);
    const dataFlowResult = await dataFlowTool.execute(empresa, this.outputDir);

    // Etapa 3: Definição de Bases Legais
    console.log('⚖️  3/8 - Definindo bases legais...');
    const legalBasisTool = new LegalBasisTool(this.llm, this.logger);
    await legalBasisTool.execute(empresa, dataFlowResult.data, this.outputDir);

    // Etapa 4: DPIA (Avaliação de Impacto)
    console.log('🔍 4/8 - Gerando DPIA...');
    const dpiaTool = new DpiaTool(this.llm, this.logger);
    await dpiaTool.execute(empresa, { maturity: maturityResult.data, dataFlow: dataFlowResult.data }, this.outputDir);

    // Etapa 5: Política de Privacidade
    console.log('📄 5/8 - Gerando Política de Privacidade...');
    const policyTool = new PolicyTool(this.llm, this.logger);
    await policyTool.execute(empresa, dataFlowResult.data, this.outputDir);

    // Etapa 6: Contratos com Operadores (DPA)
    console.log('📝 6/8 - Gerando contratos DPA...');
    const dpaTool = new DpaTool(this.llm, this.logger);
    await dpaTool.execute(empresa, dataFlowResult.data, this.outputDir);

    // Etapa 7: Plano de Resposta a Incidentes
    console.log('🚨 7/8 - Criando plano de resposta a incidentes...');
    const breachTool = new BreachTool(this.llm, this.logger);
    await breachTool.execute(empresa, this.outputDir);

    // Etapa 8: Relatório Final do DPO
    console.log('📋 8/8 - Gerando relatório final...');
    const reportTool = new ReportTool(this.llm, this.logger);
    await reportTool.execute(empresa, this.outputDir);

    // Etapa 9: Compliance como Protocolo (Schema v1)
    console.log('🤖 9/9 - Gerando Protocolo de Compliance (policy.json)...');
    await this.generateProtocolSchema(empresa, maturityResult.data, dataFlowResult.data);

    // Etapa 9: Empacotamento Final
    console.log('📦 Criando pacote final...');
    await this.createFinalPackage();

    console.log('\\n✅ Fluxo de adequação concluído com sucesso!');
  }

  private async createFinalPackage(): Promise<void> {
    const zipPath = path.join(this.outputDir, 'pacote-final.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`📦 Pacote criado: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', (err: any) => {
        reject(err);
      });

      archive.pipe(output);

      // Adicionar todos os arquivos gerados
      const files = fs.readdirSync(this.outputDir);
      files.forEach(file => {
        if (file !== 'pacote-final.zip') {
          const filePath = path.join(this.outputDir, file);
          if (fs.statSync(filePath).isFile()) {
            archive.file(filePath, { name: file });
          }
        }
      });

      archive.finalize();
    });
  }

  private async generateProtocolSchema(empresa: Empresa, maturityData: any, dataFlowData: any): Promise<void> {
    try {
      // Extrair categorias de dados
      const dataCategories = Array.from(new Set(
        dataFlowData.flatMap((flow: any) => flow.dados)
      )) as string[];

      // Construir schema LGPD v1
      const policy_json = {
        schema_version: 'dpo2u/lgpd/v1',
        company_id: empresa.cnpj,
        generated_at: new Date().toISOString(),
        policy: {
          retention_days: 1825, // Fallback genérico para guarda fiscal (5 anos) ou adaptar da LLM
          data_categories: dataCategories,
          consent_mechanism: "opt-in-explicito",
          dpo_contact: empresa.contato.email,
          last_review: new Date().toISOString().split('T')[0]
        },
        documents: [
          { type: 'maturidade', file: 'maturidade.pdf', cid: null },
          { type: 'inventario', file: 'inventario.csv', cid: null },
          { type: 'bases_legais', file: 'bases-legais.csv', cid: null },
          { type: 'dpia', file: 'dpia.pdf', cid: null },
          { type: 'privacy_policy', file: 'politica-privacidade.txt', cid: null },
          { type: 'dpa', file: 'contrato-dpa.txt', cid: null },
          { type: 'incident_plan', file: 'plano-incidente.txt', cid: null },
          { type: 'dpo_report', file: 'relatorio-dpo.pdf', cid: null }
        ]
      };

      const jsonPath = path.join(this.outputDir, 'policy.json');
      fs.writeFileSync(jsonPath, JSON.stringify(policy_json, null, 2));
      console.log(`🤖 Schema policy.json gerado referenciando todos os arquivos locais.`);
    } catch (error) {
      console.error(`Erro ao gerar Protocol Schema: ${error}`);
    }
  }
}