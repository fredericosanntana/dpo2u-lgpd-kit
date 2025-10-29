#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { AdequacaoFlow } from './flows/adequacao.js';
import { CompanyCache, CachedCompany } from './lib/cache.js';
import { OllamaClient } from './lib/ollama.js';
import { AnthropicClient } from './lib/anthropic.js';
import { CodexClient } from './lib/codex.js';
import { LanguageModelClient } from './lib/llm.js';
import { Logger } from './lib/logger.js';
import { Empresa } from './types/index.js';
import { MaturityTool } from './tools/maturity/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

class DPO2UMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'dpo2u-lgpd-kit',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'lgpd_compliance_full',
            description: 'Executa processo completo de adequação LGPD para uma empresa',
            inputSchema: {
              type: 'object',
              properties: {
                nome: {
                  type: 'string',
                  description: 'Nome da empresa'
                },
                cnpj: {
                  type: 'string',
                  description: 'CNPJ da empresa (opcional)'
                },
                setor: {
                  type: 'string',
                  description: 'Setor de atuação da empresa'
                },
                colaboradores: {
                  type: 'number',
                  description: 'Número de colaboradores'
                },
                coletaDados: {
                  type: 'boolean',
                  description: 'Se a empresa coleta dados pessoais'
                },
                possuiOperadores: {
                  type: 'boolean',
                  description: 'Se a empresa possui operadores/fornecedores'
                },
                contato: {
                  type: 'object',
                  properties: {
                    responsavel: { type: 'string' },
                    email: { type: 'string' },
                    telefone: { type: 'string' }
                  },
                  required: ['responsavel', 'email']
                },
                provider: {
                  type: 'string',
                  enum: ['ollama', 'claude', 'codex'],
                  description: 'Provedor de IA a ser usado',
                  default: 'claude'
                },
                apiKey: {
                  type: 'string',
                  description: 'Chave de API (para Claude ou Codex)'
                },
                outputDir: {
                  type: 'string',
                  description: 'Diretório de saída (opcional, usa pasta temporária por padrão)'
                }
              },
              required: ['nome', 'setor', 'colaboradores', 'coletaDados', 'possuiOperadores', 'contato']
            }
          },
          {
            name: 'lgpd_check_company_cache',
            description: 'Verifica se uma empresa já possui dados em cache',
            inputSchema: {
              type: 'object',
              properties: {
                nome: {
                  type: 'string',
                  description: 'Nome da empresa'
                },
                cnpj: {
                  type: 'string',
                  description: 'CNPJ da empresa (opcional)'
                }
              },
              required: ['nome']
            }
          },
          {
            name: 'lgpd_maturity_assessment',
            description: 'Executa apenas avaliação de maturidade LGPD',
            inputSchema: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                cnpj: { type: 'string' },
                setor: { type: 'string' },
                colaboradores: { type: 'number' },
                coletaDados: { type: 'boolean' },
                possuiOperadores: { type: 'boolean' },
                contato: {
                  type: 'object',
                  properties: {
                    responsavel: { type: 'string' },
                    email: { type: 'string' },
                    telefone: { type: 'string' }
                  },
                  required: ['responsavel', 'email']
                },
                provider: { type: 'string', enum: ['ollama', 'claude', 'codex'], default: 'claude' },
                apiKey: { type: 'string' },
                outputDir: { type: 'string' }
              },
              required: ['nome', 'setor', 'colaboradores', 'coletaDados', 'possuiOperadores', 'contato']
            }
          }
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'lgpd_compliance_full':
            return await this.handleFullCompliance(args);

          case 'lgpd_check_company_cache':
            return await this.handleCheckCache(args);

          case 'lgpd_maturity_assessment':
            return await this.handleMaturityAssessment(args);

          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Erro ao executar ${name}: ${errorMessage}`
            }
          ],
          isError: true,
        };
      }
    });
  }

  private async handleCheckCache(args: any) {
    const cache = new CompanyCache();
    const similar = cache.findSimilarCompany(args.nome, args.cnpj);

    if (similar) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Empresa encontrada no cache:\n- Nome: ${similar.empresa.nome}\n- CNPJ: ${similar.empresa.cnpj || 'Não informado'}\n- Última execução: ${similar.lastExecution}\n- Status: ${similar.completed ? 'Adequação completa' : 'Adequação parcial'}\n- Diretório: ${similar.outputDir}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Empresa não encontrada no cache. Será necessário executar adequação completa.`
          }
        ]
      };
    }
  }

  private async handleMaturityAssessment(args: any) {
    const empresa = this.buildEmpresaFromArgs(args);
    const outputDir = args.outputDir || path.join(os.tmpdir(), `lgpd-${Date.now()}`);

    // Garantir que o diretório existe
    fs.mkdirSync(outputDir, { recursive: true });

    const llm = this.createLanguageModelClient(args.provider, args.apiKey);
    const logger = new Logger(outputDir);
    const maturityTool = new MaturityTool(llm, logger);
    const result = await maturityTool.execute(empresa, outputDir);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Avaliação de maturidade concluída!\n\n📊 **Resultado:**\n- Score: ${result.data.score}/100\n- Nível: ${result.data.nivel}\n- Gaps identificados: ${result.data.gaps.length}\n\n📁 **Arquivo gerado:** ${result.file}\n\n🎯 **Próximos passos:**\n${result.data.planoAcao.map((acao: string, i: number) => `${i + 1}. ${acao}`).join('\n')}`
          }
        ]
      };
    } else {
      throw new Error(result.error || 'Erro na avaliação de maturidade');
    }
  }

  private async handleFullCompliance(args: any) {
    const empresa = this.buildEmpresaFromArgs(args);
    const outputDir = args.outputDir || path.join(os.tmpdir(), `lgpd-${Date.now()}`);

    // Verificar cache primeiro
    const cache = new CompanyCache();
    const similar = cache.findSimilarCompany(empresa.nome, empresa.cnpj);

    if (similar && similar.completed) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Empresa já possui adequação LGPD completa!\n\n📁 **Documentos anteriores:** ${similar.outputDir}\n📅 **Última execução:** ${similar.lastExecution}\n\n💡 Para nova adequação, use um nome ou CNPJ diferente.`
          }
        ]
      };
    }

    // Garantir que o diretório existe
    fs.mkdirSync(outputDir, { recursive: true });

    const llm = this.createLanguageModelClient(args.provider, args.apiKey);
    const logger = new Logger(outputDir);

    // Executar processo completo
    console.log('🚀 Iniciando processo de adequação LGPD...');
    const flow = new AdequacaoFlow(llm, logger, outputDir);
    await flow.execute(empresa);

    // Verificar resultado do log
    const summary = logger.getSummary();
    const result = {
      success: summary.erros === 0,
      documentos: this.listGeneratedFiles(outputDir),
      maturidade: undefined, // Será obtido do log se disponível
      error: summary.erros > 0 ? `${summary.erros} etapas falharam` : undefined
    };

    if (result.success) {
      // Salvar no cache
      cache.saveCompany(empresa, outputDir, true);

      return {
        content: [
          {
            type: 'text',
            text: `🎉 **Adequação LGPD Concluída com Sucesso!**

📋 **Documentos Gerados:**
${result.documentos.map((doc: string) => `• ${doc}`).join('\n')}

📁 **Local:** ${outputDir}

📊 **Resumo da Adequação:**
• Maturidade: Avaliada (N/A/100)
• Inventário: Mapeado
• Bases Legais: Definidas
• DPIA: Elaborada
• Política: Gerada
• Contratos: Preparados
• Relatório: Finalizado

✅ **Status:** Conformidade básica alcançada

🎯 **Próximos Passos Recomendados:**
1. Publicar política de privacidade
2. Treinar equipe sobre LGPD
3. Implementar controles técnicos
4. Assinar contratos com operadores
5. Testar plano de incidentes
6. Agendar revisão trimestral

📞 **Suporte:** Para dúvidas sobre implementação, consulte um especialista jurídico.`
          }
        ]
      };
    } else {
      throw new Error(result.error || 'Erro na adequação LGPD');
    }
  }

  private buildEmpresaFromArgs(args: any): Empresa {
    return {
      nome: args.nome,
      cnpj: args.cnpj,
      setor: args.setor,
      colaboradores: args.colaboradores,
      coletaDados: args.coletaDados,
      possuiOperadores: args.possuiOperadores,
      contato: args.contato
    };
  }

  private listGeneratedFiles(outputDir: string): string[] {
    try {
      if (!fs.existsSync(outputDir)) return [];
      return fs.readdirSync(outputDir)
        .filter(file => !file.startsWith('.') && file !== 'log-auditoria.json')
        .sort();
    } catch {
      return [];
    }
  }

  private createLanguageModelClient(provider: string = 'claude', apiKey?: string): LanguageModelClient {
    switch (provider.toLowerCase()) {
      case 'ollama':
        return new OllamaClient({
          url: 'http://localhost:11434',
          model: 'qwen2.5:3b-instruct'
        });
      case 'claude':
        if (!apiKey) {
          throw new Error('API key necessária para Claude');
        }
        return new AnthropicClient({
          apiKey,
          model: 'claude-3-5-sonnet-20241022'
        });
      case 'codex':
        if (!apiKey) {
          throw new Error('API key necessária para Codex');
        }
        return new CodexClient({
          apiKey,
          model: 'gpt-4o-mini'
        });
      default:
        throw new Error(`Provedor desconhecido: ${provider}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 DPO2U LGPD Kit MCP Server rodando...');
  }
}

const server = new DPO2UMCPServer();
server.run().catch(console.error);