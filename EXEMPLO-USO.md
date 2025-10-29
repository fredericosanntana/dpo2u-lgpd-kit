# 📋 Exemplo de Uso - DPO2U LGPD Kit

## 🎯 Cenário: Primeira Execução

### Empresa: TechCorp Soluções Ltda.

```bash
# 1. Executar adequação
$ npm run adequacao

🚀 DPO2U LGPD Kit - Adequação Completa

🔍 Verificando dependências...
🔄 Verificando se modelo qwen2.5:3b-instruct está disponível...
✅ Modelo qwen2.5:3b-instruct carregado e pronto
✅ Ollama conectado e modelo pronto

📋 Vamos coletar algumas informações sobre sua empresa:

? Nome da empresa: TechCorp Soluções Ltda.
? CNPJ da empresa: 12.345.678/0001-90
? Setor de atuação: Tecnologia/Software
? Número de colaboradores: 11-49 (Pequena)
? A empresa coleta dados pessoais de clientes/usuários? Sim
? A empresa utiliza fornecedores que processam dados pessoais (operadores)? Sim
? Nome do responsável/DPO: João Silva
? Email de contato: joao@techcorp.com
? Telefone (opcional): (11) 99999-9999

📁 Documentos serão salvos em: ./compliance-output/techcorp-solucoes-ltda-2025-10-29

🔄 Iniciando fluxo de adequação LGPD...

📊 1/8 - Avaliando maturidade LGPD...
🤖 Gerando resposta (tentativa 1/3)...
✅ Resposta gerada com sucesso (1247 caracteres)

🗺️  2/8 - Mapeando fluxo de dados...
🤖 Gerando resposta (tentativa 1/3)...
✅ Resposta gerada com sucesso (892 caracteres)

⚖️  3/8 - Definindo bases legais...
🤖 Gerando resposta (tentativa 1/3)...
✅ Resposta gerada com sucesso (567 caracteres)

🔍 4/8 - Gerando DPIA...
🤖 Gerando resposta (tentativa 1/3)...
✅ Resposta gerada com sucesso (1034 caracteres)

📄 5/8 - Gerando Política de Privacidade...
📝 6/8 - Gerando contratos DPA...
🚨 7/8 - Criando plano de resposta a incidentes...
📋 8/8 - Gerando relatório final...
📦 Criando pacote final...
📦 Pacote criado: ./compliance-output/techcorp-solucoes-ltda-2025-10-29/pacote-final.zip (45670 bytes)

✅ Fluxo de adequação concluído com sucesso!

🎉 Adequação LGPD Concluída!
✅ 8/8 etapas executadas com sucesso

📋 Log de auditoria salvo em: ./compliance-output/techcorp-solucoes-ltda-2025-10-29/log-auditoria.json
📁 Todos os documentos estão em: ./compliance-output/techcorp-solucoes-ltda-2025-10-29
💾 Dados salvos no cache para reutilização futura
```

## 🔄 Cenário: Segunda Execução (com Cache)

```bash
# 2. Executar novamente
$ npm run adequacao

🚀 DPO2U LGPD Kit - Adequação Completa

🔍 Verificando dependências...
✅ Ollama conectado e modelo pronto

📋 Empresas processadas anteriormente encontradas:

1. TechCorp Soluções Ltda. (12.345.678/0001-90) - ✅ Concluída - 29/10/2025

? O que deseja fazer?
  🔄 Usar empresa existente
❯ ➕ Adicionar nova empresa
  🗑️  Limpar cache e começar do zero

# Escolhendo "Usar empresa existente":

? Selecione a empresa: TechCorp Soluções Ltda. (12.345.678/0001-90)

📁 Usando diretório existente: ./compliance-output/techcorp-solucoes-ltda-2025-10-29
📄 Arquivos encontrados: empresa.json, maturidade.pdf, inventario.csv, bases-legais.csv, dpia.pdf, politica-privacidade.txt, contrato-dpa.txt, plano-incidente.txt, relatorio-dpo.pdf, log-auditoria.json, pacote-final.zip

? 🔄 Deseja reprocessar e sobrescrever os arquivos existentes? No

📋 Usando dados existentes. Executando apenas etapas faltantes...

🎉 Adequação LGPD Concluída!
✅ 8/8 etapas executadas com sucesso

📁 Todos os documentos estão em: ./compliance-output/techcorp-solucoes-ltda-2025-10-29
💾 Dados salvos no cache para reutilização futura
```

## 📋 Gerenciamento de Cache

```bash
# 3. Visualizar cache
$ npm run cache

📋 Empresas no cache:

1. TechCorp Soluções Ltda.
   CNPJ: 12.345.678/0001-90
   Status: ✅ Concluída
   Última execução: 29/10/2025
   Diretório: ./compliance-output/techcorp-solucoes-ltda-2025-10-29 📁
   Setor: Tecnologia/Software

2. InovaCorp Consultoria
   CNPJ: 98.765.432/0001-10
   Status: ⏳ Incompleta
   Última execução: 28/10/2025
   Diretório: ./compliance-output/inovacorp-consultoria-2025-10-28 ❌
   Setor: Consultoria

? O que deseja fazer?
❯ 👁️  Apenas visualizar
  📁 Abrir diretório de uma empresa
  🗑️  Limpar cache
  🚪 Sair

# Escolhendo "Abrir diretório de uma empresa":

? Selecione a empresa: TechCorp Soluções Ltda. (12.345.678/0001-90)

📁 Diretório: ./compliance-output/techcorp-solucoes-ltda-2025-10-29
📄 Arquivos gerados: empresa.json, maturidade.pdf, inventario.csv, bases-legais.csv, dpia.pdf, politica-privacidade.txt, contrato-dpa.txt, plano-incidente.txt, relatorio-dpo.pdf, log-auditoria.json, pacote-final.zip
```

## 📁 Estrutura de Arquivos Gerados

```
./compliance-output/techcorp-solucoes-ltda-2025-10-29/
├── 📄 empresa.json                    # Dados da empresa
├── 📊 maturidade.pdf                  # Avaliação de maturidade LGPD
├── 📊 maturidade.json                 # Dados da avaliação
├── 🗺️  inventario.csv                 # Inventário de dados
├── 🗺️  inventario.json                # Mapeamento de fluxos
├── ⚖️  bases-legais.csv               # Bases legais por atividade
├── 🔍 dpia.pdf                        # Avaliação de impacto
├── 📄 politica-privacidade.txt        # Política de privacidade
├── 📝 contrato-dpa.txt                # Contratos com operadores
├── 🚨 plano-incidente.txt             # Plano de resposta a incidentes
├── 📋 relatorio-dpo.pdf               # Relatório final do DPO
├── 📋 log-auditoria.json              # Log completo de auditoria
└── 📦 pacote-final.zip                # Todos os documentos em ZIP

Cache (oculto):
./compliance-output/.cache/
└── 💾 companies.json                   # Cache de empresas processadas
```

## 🎯 Benefícios do Sistema de Cache

### ✅ **Economia de Tempo**
- **Primeira execução**: 5 min coleta + 15-30 min processamento
- **Execuções seguintes**: 0 min coleta + processamento apenas se necessário

### 🔄 **Recuperação de Falhas**
- Se a execução falhar, dados ficam salvos
- Pode retentar sem re-inserir informações
- Preserva trabalho já realizado

### 👥 **Múltiplas Empresas**
- Suporte para várias empresas no mesmo sistema
- Fácil alternância entre empresas
- Histórico de todas as execuções

### 📊 **Rastreabilidade**
- Data da última execução
- Status de conclusão
- Validação de arquivos gerados
- Logs de auditoria preservados

---

💡 **Dica**: Use `npm run cache` regularmente para verificar o status das empresas processadas e gerenciar o armazenamento local.