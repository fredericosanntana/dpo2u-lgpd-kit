#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { OllamaClient } from './lib/ollama.js';
import { Logger } from './lib/logger.js';
import { validateCNPJ, validateEmail, sanitizeFileName } from './lib/validator.js';
import { Empresa } from './types/index.js';
import { AdequacaoFlow } from './flows/adequacao.js';

const program = new Command();

program
  .name('dpo2u-mcp')
  .description('LGPD Local Compliance Kit - Conformidade LGPD em 1 dia')
  .version('1.0.0');

program
  .command('adequacao')
  .description('Executa fluxo completo de adequação LGPD')
  .option('--output <dir>', 'Diretório de saída', './compliance-output')
  .option('--ollama-url <url>', 'URL do Ollama', 'http://localhost:11434')
  .option('--model <model>', 'Modelo do Ollama', 'qwen2.5:3b-instruct')
  .action(async (options) => {
    console.log('🚀 DPO2U LGPD Kit - Adequação Completa\\n');

    // Verificar Ollama
    const ollama = new OllamaClient({
      url: options.ollamaUrl,
      model: options.model
    });

    console.log('🔍 Verificando dependências...');

    const isHealthy = await ollama.checkHealth();
    if (!isHealthy) {
      console.error('❌ Ollama não está rodando ou não acessível');
      console.log('💡 Verifique se o Ollama está rodando em:', options.ollamaUrl);
      console.log('💡 Comando: ollama serve');
      process.exit(1);
    }

    const models = await ollama.listModels();
    if (!models.includes(options.model)) {
      console.error(`❌ Modelo ${options.model} não encontrado`);
      console.log('📋 Modelos disponíveis:', models.join(', '));
      console.log(`💡 Para instalar: ollama pull ${options.model}`);
      process.exit(1);
    }

    // Tentar carregar o modelo
    try {
      await ollama.ensureModelLoaded();
    } catch (error) {
      console.error('❌', (error as Error).message);
      process.exit(1);
    }

    console.log('✅ Ollama conectado e modelo pronto\\n');

    // Coleta de informações da empresa
    console.log('📋 Vamos coletar algumas informações sobre sua empresa:\\n');

    const empresa = await coletarInformacoesEmpresa();

    // Criar diretório de saída
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputDir = path.join(options.output, `${sanitizeFileName(empresa.nome)}-${timestamp}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const logger = new Logger(outputDir);

    console.log(`\\n📁 Documentos serão salvos em: ${outputDir}\\n`);

    // Salvar dados da empresa
    fs.writeFileSync(path.join(outputDir, 'empresa.json'), JSON.stringify(empresa, null, 2));

    // Executar fluxo de adequação
    const flow = new AdequacaoFlow(ollama, logger, outputDir);

    try {
      await flow.execute(empresa);

      const summary = logger.getSummary();
      console.log('\\n🎉 Adequação LGPD Concluída!');
      console.log(`✅ ${summary.sucessos}/${summary.total} etapas executadas com sucesso`);

      if (summary.erros > 0) {
        console.log(`⚠️  ${summary.erros} etapas com problemas (verifique o log)`);
      }

      logger.save();
      console.log(`\\n📋 Log de auditoria salvo em: ${path.join(outputDir, 'log-auditoria.json')}`);
      console.log(`📁 Todos os documentos estão em: ${outputDir}`);

    } catch (error) {
      logger.log('ERRO_GERAL', false, {}, undefined, error instanceof Error ? error.message : String(error));
      console.error('❌ Erro durante execução:', error);
      process.exit(1);
    }
  });

async function coletarInformacoesEmpresa(): Promise<Empresa> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'nome',
      message: 'Nome da empresa:',
      validate: (input) => input.trim().length > 0 || 'Nome da empresa é obrigatório'
    },
    {
      type: 'input',
      name: 'cnpj',
      message: 'CNPJ da empresa:',
      validate: (input) => {
        if (!input.trim()) return 'CNPJ é obrigatório';
        if (!validateCNPJ(input)) return 'CNPJ inválido';
        return true;
      }
    },
    {
      type: 'list',
      name: 'setor',
      message: 'Setor de atuação:',
      choices: [
        'Tecnologia/Software',
        'E-commerce/Varejo',
        'Serviços Financeiros',
        'Saúde',
        'Educação',
        'Consultoria',
        'Indústria',
        'Outro'
      ]
    },
    {
      type: 'list',
      name: 'colaboradores',
      message: 'Número de colaboradores:',
      choices: [
        { name: '1-10 (Micro)', value: 5 },
        { name: '11-49 (Pequena)', value: 30 },
        { name: '50-249 (Média)', value: 150 },
        { name: '250+ (Grande)', value: 500 }
      ]
    },
    {
      type: 'confirm',
      name: 'coletaDados',
      message: 'A empresa coleta dados pessoais de clientes/usuários?',
      default: true
    },
    {
      type: 'confirm',
      name: 'possuiOperadores',
      message: 'A empresa utiliza fornecedores que processam dados pessoais (operadores)?',
      default: true
    },
    {
      type: 'input',
      name: 'responsavel',
      message: 'Nome do responsável/DPO:',
      validate: (input) => input.trim().length > 0 || 'Nome do responsável é obrigatório'
    },
    {
      type: 'input',
      name: 'email',
      message: 'Email de contato:',
      validate: (input) => {
        if (!input.trim()) return 'Email é obrigatório';
        if (!validateEmail(input)) return 'Email inválido';
        return true;
      }
    },
    {
      type: 'input',
      name: 'telefone',
      message: 'Telefone (opcional):',
    }
  ]);

  return {
    nome: answers.nome,
    cnpj: answers.cnpj,
    setor: answers.setor,
    colaboradores: answers.colaboradores,
    coletaDados: answers.coletaDados,
    possuiOperadores: answers.possuiOperadores,
    contato: {
      responsavel: answers.responsavel,
      email: answers.email,
      telefone: answers.telefone || undefined
    }
  };
}

program.parse();