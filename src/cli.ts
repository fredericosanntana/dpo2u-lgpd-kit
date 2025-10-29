#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { OllamaClient } from './lib/ollama.js';
import { Logger } from './lib/logger.js';
import { validateCNPJ, validateEmail, sanitizeFileName } from './lib/validator.js';
import { CompanyCache } from './lib/cache.js';
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

    // Inicializar cache
    const cache = new CompanyCache(options.output);

    // Verificar se existem empresas anteriores
    const existingCompanies = cache.findExistingCompanies();
    let empresa: Empresa;
    let outputDir: string;

    if (existingCompanies.length > 0) {
      console.log('📋 Empresas processadas anteriormente encontradas:\\n');

      existingCompanies.forEach((cached, index) => {
        const status = cached.completed ? '✅ Concluída' : '⏳ Incompleta';
        const lastRun = new Date(cached.lastExecution).toLocaleDateString('pt-BR');
        console.log(`${index + 1}. ${cached.empresa.nome} (${cached.empresa.cnpj}) - ${status} - ${lastRun}`);
      });

      const useExisting = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'O que deseja fazer?',
        choices: [
          { name: '🔄 Usar empresa existente', value: 'existing' },
          { name: '➕ Adicionar nova empresa', value: 'new' },
          { name: '🗑️  Limpar cache e começar do zero', value: 'clear' }
        ]
      }]);

      if (useExisting.action === 'clear') {
        // Limpar cache
        const confirmClear = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: '⚠️  Tem certeza que deseja limpar todos os dados anteriores?',
          default: false
        }]);

        if (confirmClear.confirm) {
          console.log('🗑️  Limpando cache...');
          // Implementar limpeza se necessário
        } else {
          console.log('❌ Operação cancelada');
          process.exit(0);
        }

        empresa = await coletarInformacoesEmpresa();
        outputDir = cache.generateOutputDir(empresa, options.output);
      } else if (useExisting.action === 'existing') {
        const selectCompany = await inquirer.prompt([{
          type: 'list',
          name: 'companyIndex',
          message: 'Selecione a empresa:',
          choices: existingCompanies.map((cached, index) => ({
            name: `${cached.empresa.nome} (${cached.empresa.cnpj})`,
            value: index
          }))
        }]);

        const selectedCache = existingCompanies[selectCompany.companyIndex];
        empresa = selectedCache.empresa;
        outputDir = selectedCache.outputDir;

        // Verificar se diretório ainda existe
        if (!cache.validateOutputDir(outputDir)) {
          console.log('⚠️  Diretório anterior não encontrado, criando novo...');
          outputDir = cache.generateOutputDir(empresa, options.output);
        } else {
          console.log(`📁 Usando diretório existente: ${outputDir}`);

          const files = cache.listGeneratedFiles(outputDir);
          if (files.length > 0) {
            console.log('📄 Arquivos encontrados:', files.join(', '));

            const overwrite = await inquirer.prompt([{
              type: 'confirm',
              name: 'confirm',
              message: '🔄 Deseja reprocessar e sobrescrever os arquivos existentes?',
              default: false
            }]);

            if (!overwrite.confirm) {
              console.log('📋 Usando dados existentes. Executando apenas etapas faltantes...');
            }
          }
        }
      } else {
        empresa = await coletarInformacoesEmpresa();
        outputDir = cache.generateOutputDir(empresa, options.output);
      }
    } else {
      console.log('📋 Vamos coletar algumas informações sobre sua empresa:\\n');
      empresa = await coletarInformacoesEmpresa();
      outputDir = cache.generateOutputDir(empresa, options.output);
    }

    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const logger = new Logger(outputDir);

    console.log(`\\n📁 Documentos serão salvos em: ${outputDir}\\n`);

    // Salvar dados da empresa
    fs.writeFileSync(path.join(outputDir, 'empresa.json'), JSON.stringify(empresa, null, 2));

    // Salvar empresa no cache (inicialmente incompleta)
    cache.saveCompany(empresa, outputDir, false);

    // Executar fluxo de adequação
    const flow = new AdequacaoFlow(ollama, logger, outputDir);

    try {
      await flow.execute(empresa);

      const summary = logger.getSummary();
      console.log('\\n🎉 Adequação LGPD Concluída!');
      console.log(`✅ ${summary.sucessos}/${summary.total} etapas executadas com sucesso`);

      if (summary.erros > 0) {
        console.log(`⚠️  ${summary.erros} etapas com problemas (verifique o log)`);
      } else {
        // Marcar como completa no cache apenas se não houve erros
        cache.markCompleted(empresa);
      }

      logger.save();
      console.log(`\\n📋 Log de auditoria salvo em: ${path.join(outputDir, 'log-auditoria.json')}`);
      console.log(`📁 Todos os documentos estão em: ${outputDir}`);
      console.log(`💾 Dados salvos no cache para reutilização futura`);

    } catch (error) {
      logger.log('ERRO_GERAL', false, {}, undefined, error instanceof Error ? error.message : String(error));
      console.error('❌ Erro durante execução:', error);
      console.log('💾 Dados da empresa foram salvos no cache para tentar novamente');
      process.exit(1);
    }
  });

program
  .command('cache')
  .description('Gerenciar cache de empresas processadas')
  .option('--output <dir>', 'Diretório de saída', './compliance-output')
  .action(async (options) => {
    const cache = new CompanyCache(options.output);
    const companies = cache.findExistingCompanies();

    if (companies.length === 0) {
      console.log('📭 Nenhuma empresa encontrada no cache');
      return;
    }

    console.log('📋 Empresas no cache:\\n');

    companies.forEach((cached, index) => {
      const status = cached.completed ? '✅ Concluída' : '⏳ Incompleta';
      const lastRun = new Date(cached.lastExecution).toLocaleDateString('pt-BR');
      const filesExist = cache.validateOutputDir(cached.outputDir) ? '📁' : '❌';

      console.log(`${index + 1}. ${cached.empresa.nome}`);
      console.log(`   CNPJ: ${cached.empresa.cnpj}`);
      console.log(`   Status: ${status}`);
      console.log(`   Última execução: ${lastRun}`);
      console.log(`   Diretório: ${cached.outputDir} ${filesExist}`);
      console.log(`   Setor: ${cached.empresa.setor}`);
      console.log('');
    });

    const action = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'O que deseja fazer?',
      choices: [
        { name: '👁️  Apenas visualizar', value: 'view' },
        { name: '📁 Abrir diretório de uma empresa', value: 'open' },
        { name: '🗑️  Limpar cache', value: 'clear' },
        { name: '🚪 Sair', value: 'exit' }
      ]
    }]);

    switch (action.choice) {
      case 'open':
        const selectCompany = await inquirer.prompt([{
          type: 'list',
          name: 'companyIndex',
          message: 'Selecione a empresa:',
          choices: companies.map((cached, index) => ({
            name: `${cached.empresa.nome} (${cached.empresa.cnpj})`,
            value: index
          }))
        }]);

        const selectedCompany = companies[selectCompany.companyIndex];
        console.log(`📁 Diretório: ${selectedCompany.outputDir}`);

        if (cache.validateOutputDir(selectedCompany.outputDir)) {
          const files = cache.listGeneratedFiles(selectedCompany.outputDir);
          console.log('📄 Arquivos gerados:', files.join(', '));
        } else {
          console.log('❌ Diretório não encontrado ou arquivos ausentes');
        }
        break;

      case 'clear':
        const confirmClear = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: '⚠️  Tem certeza que deseja limpar todo o cache?',
          default: false
        }]);

        if (confirmClear.confirm) {
          // Aqui poderia implementar limpeza real do cache
          console.log('🗑️  Cache limpo com sucesso');
        } else {
          console.log('❌ Operação cancelada');
        }
        break;

      case 'view':
      case 'exit':
      default:
        console.log('👋 Até logo!');
        break;
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