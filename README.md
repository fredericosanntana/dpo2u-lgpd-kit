# 🚀 DPO2U LGPD Kit

> **LGPD Local Compliance Kit & API** - Conquiste conformidade documental mínima com a LGPD executando um assistente local, 100% offline, ou integre a geração de políticas estruturadas ao ecossistema Web3 DPO2U.

## ✨ O que é o DPO2U LGPD Kit?

Sistema open-source de **Compliance como Protocolo** com arquitetura híbrida:

1. **Modo CLI (B2C/PMEs)**: Permite que qualquer empresa obtenha conformidade documental executando um fluxo guiado que gera 8 documentos essenciais 100% localmente em apenas 1 dia.
2. **Modo Motor de Protocolo (B2B)**: Gera estruturas de dados verificáveis (`policy.json` schema `dpo2u/lgpd/v1`) prontas para integração on-chain via Midnight Network e armazenamento em IPFS via Lighthouse. Destinado ao consumo autônomo de Agentes de IA via servidor MCP.

### 🎯 **Problema que Resolve**

- ❌ Adequação LGPD é **cara** e **lenta** (consultorias tradicionais R$ 50k+)
- ❌ Documentações são passivas, de papel, e não auditáveis por máquinas/IAs
- ❌ Depende de **serviços cloud** que coletam dados sensíveis da própria empresa

### ✅ **Nossa Solução**

- ✅ **100% Local (CLI)** - Dados sensíveis nunca saem da sua máquina
- ✅ **Compliance como Protocolo (Motor B2B)** - Geração de attestation baseada no Schema `v1`
- ✅ **Zero Custo** - Completamente gratuito e open-source
- ✅ **Completo** - PDFs gerados via CLI e JSON schemas gerados via API

## 📦 Entregáveis Gerados

O LGPD Kit emite dois níveis de conformidade: **estruturas de dados para IA (Protocolo)** e **documentos para humanos (CLI/Wizard)**.

### 🤖 Output Estruturado (Core Engine)
- `policy.json`: Schema oficial respeitando a interface `dpo2u/lgpd/v1`.
- Retenção em IPFS e atribuição aos Agentes via MCP Server.

### 📄 Output Humano (CLI / Local)
| Documento | Arquivo | Descrição |
|-----------|---------|-----------|
| 📊 **Avaliação de Maturidade** | `maturidade.pdf` | Score 0-100 + 23 perguntas categorizadas |
| 🗺️ **Inventário de Dados** | `inventario.csv` | Mapeamento completo de fluxos |
| ⚖️ **Bases Legais** | `bases-legais.csv` | Art. 7º LGPD por atividade |
| 🔍 **DPIA** | `dpia.pdf` | Avaliação de impacto detalhada |
| 📄 **Política de Privacidade** | `politica-privacidade.txt` | Pronta para publicação |
| 📝 **Contratos DPA** | `contrato-dpa.txt` | Template para operadores |
| 🚨 **Plano de Incidentes** | `plano-incidente.txt` | Resposta a vazamentos |
| 📋 **Relatório DPO** | `relatorio-dpo.pdf` | Evidências e próximos passos |
| 🤖 **Protocolo de Compliance** | `policy.json` | Schema v1 com referências aos arquivos acima |

**📦 Pacote CLI Final:** `pacote-final.zip` com todos os documentos + log de auditoria

## 🛠️ Instalação Rápida

### Pré-requisitos

```bash
# 1. Node.js 18+ (obrigatório)
node --version  # v18.0.0+

# 2. Ollama rodando localmente (obrigatório)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5:3b-instruct
ollama serve
```

### Instalação

```bash
# Clone o repositório
git clone https://github.com/fredericosanntana/dpo2u-lgpd-kit.git
cd dpo2u-lgpd-kit

# Instale dependências (OBRIGATÓRIO!)
npm install

# Compile TypeScript
npm run build
```

> ⚠️ **Importante**: Sempre execute `npm install` após clonar o repositório para instalar todas as dependências, incluindo os tipos TypeScript necessários.

### Uso

```bash
# Execute o fluxo completo de adequação
npm run adequacao

# Gerenciar cache de empresas processadas
npm run cache

# Ver todos os comandos disponíveis
node dist/cli.js --help

# Ou diretamente
node dist/cli.js adequacao
node dist/cli.js cache
```

## 🎮 Como Funciona

### 🔄 **Sistema de Cache Inteligente**
O sistema automaticamente salva os dados da empresa para evitar re-digitação:

- **Primeira execução**: Coleta dados da empresa
- **Execuções seguintes**: Oferece opções:
  - 🔄 Usar empresa existente
  - ➕ Adicionar nova empresa
  - 🗑️ Limpar cache

```bash
# Visualizar empresas salvas
npm run cache
```

### 1️⃣ **Coleta de Informações** (5 min - apenas primeira vez)
- Nome da empresa, CNPJ, setor
- Tamanho (micro, pequena, média, grande)
- Se coleta dados pessoais
- Contato do responsável/DPO

### 2️⃣ **Processamento Inteligente** (10-30 min)
- IA local analisa o perfil da empresa
- Gera conteúdo específico por setor
- Mapeia fluxos de dados típicos
- Define bases legais adequadas

### 3️⃣ **Saída Completa** (Instantâneo)
- 8 documentos profissionais gerados
- Log de auditoria para evidências
- Pacote ZIP pronto para advogado/auditor
- **Cache salvo** para reutilização

### 🏃‍♂️ **Exemplo de Execução**

```bash
$ npm run adequacao

🚀 DPO2U LGPD Kit - Adequação Completa

🔍 Verificando dependências...
✅ Ollama conectado com sucesso

📋 Vamos coletar algumas informações sobre sua empresa:

? Nome da empresa: TechCorp Soluções
? CNPJ da empresa: 12.345.678/0001-90
? Setor de atuação: Tecnologia/Software
? Número de colaboradores: 11-49 (Pequena)
? A empresa coleta dados pessoais de clientes/usuários? Sim
? A empresa utiliza fornecedores que processam dados pessoais (operadores)? Sim
? Nome do responsável/DPO: João Silva
? Email de contato: joao@techcorp.com
? Telefone (opcional): (11) 99999-9999

📁 Documentos serão salvos em: ./compliance-output/techcorp-solucoes-2025-01-15

🔄 Iniciando fluxo de adequação LGPD...

📊 1/8 - Avaliando maturidade LGPD...
🗺️  2/8 - Mapeando fluxo de dados...
⚖️  3/8 - Definindo bases legais...
🔍 4/8 - Gerando DPIA...
📄 5/8 - Gerando Política de Privacidade...
📝 6/8 - Gerando contratos DPA...
🚨 7/8 - Criando plano de resposta a incidentes...
📋 8/8 - Gerando relatório final...
🤖 9/9 - Gerando Protocolo de Compliance (policy.json)...
📦 Criando pacote final...

🎉 Adequação LGPD Concluída!
✅ 9/9 etapas executadas com sucesso

📋 Log de auditoria salvo em: ./compliance-output/techcorp-solucoes-2025-01-15/log-auditoria.json
📁 Todos os documentos estão em: ./compliance-output/techcorp-solucoes-2025-01-15
```

## 🔒 Privacidade e Segurança

### **100% Local**
- ✅ Nenhum dado é enviado para nuvem
- ✅ Processamento via Ollama local
- ✅ Arquivos salvos apenas na sua máquina
- ✅ Sem telemetria ou analytics

### **Auditável**
- ✅ Código open-source no GitHub
- ✅ Log completo de operações
- ✅ Entrada e saída de cada etapa
- ✅ Timestamp de todas as ações

### **Compatível LGPD**
- ✅ Privacy by design
- ✅ Dados processados localmente
- ✅ Princípio da minimização
- ✅ Transparência total

## 🎯 Casos de Uso

### 👥 **Microempresas e MEIs**
```
Situação: "Não entendo LGPD, não tenho advogado"
Solução: Adequação automática em 1 dia, zero custo
Resultado: Documentos prontos para clientes exigentes
```

### 🚀 **Startups**
```
Situação: "Sem orçamento para DPO interno"
Solução: Conformidade mínima para captar investimento
Resultado: Due diligence de compliance resolvida
```

### 💻 **Profissionais de TI**
```
Situação: "Não quero enviar dados para SaaS"
Solução: Tudo local, auditável, open-source
Resultado: Controle total sobre dados sensíveis
```

### 👨‍💼 **Consultores**
```
Situação: "Muito trabalho manual repetitivo"
Solução: Automatizar 80% da documentação
Resultado: Entregar 10x mais rápido para clientes
```

## 🔧 Configuração Avançada

### Modelos de IA Suportados

- **Ollama (local)** – Execução 100% offline usando modelos baixados no seu servidor.
- **Claude Code (Anthropic)** – Utilize sua conta Anthropic com a mesma automação do MCP.
- **Codex (OpenAI)** – Aproveite modelos ChatGPT/Codex sem depender do Ollama.

```bash
# Padrão (recomendado)
ollama pull qwen2.5:3b-instruct

# Alternativas (mais leves)
ollama pull phi3:3.8b-mini-instruct
ollama pull llama3.2:3b-instruct

# Alternativas (mais robustas)
ollama pull qwen2.5:7b-instruct
ollama pull llama3.1:8b-instruct
```

### Personalização

```bash
# Usar modelo específico
node dist/cli.js adequacao --model "phi3:3.8b-mini-instruct"

# Diretório de saída customizado
node dist/cli.js adequacao --output "/caminho/personalizado"

# URL do Ollama customizada
node dist/cli.js adequacao --ollama-url "http://outro-servidor:11434"

# Executar com Claude Code (Anthropic)
export ANTHROPIC_API_KEY="sua-chave"
node dist/cli.js adequacao --provider claude --model "claude-3-5-sonnet-20241022"

# Executar com Codex (OpenAI)
export OPENAI_API_KEY="sua-chave"
node dist/cli.js adequacao --provider codex --model "gpt-4o-mini"
```

## 📊 Benchmarks

| Métrica | Resultado |
|---------|-----------|
| ⏱️ **Tempo Total** | 30-60 minutos |
| 💾 **Tamanho** | <10MB (vs 146MB original) |
| 🧠 **Uso de RAM** | <512MB |
| 📄 **Documentos** | 8 arquivos + ZIP |
| 🎯 **Taxa de Sucesso** | 95%+ |
| 💰 **Custo** | R$ 0 |

## ❓ FAQ

### **P: É válido juridicamente?**
R: Gera documentação base compliant com LGPD. Recomenda-se revisão jurídica para casos específicos.

### **P: Funciona offline?**
R: Sim, quando você usa o provedor Ollama (local). As integrações com Claude Code e Codex requerem conexão com as APIs respectivas.

### **P: Suporta outros países?**
R: Atualmente focado em LGPD (Brasil). GDPR em roadmap.

### **P: Posso customizar os templates?**
R: Sim, todos os templates são editáveis no código fonte.

### **P: E se minha empresa for muito específica?**
R: Sistema gera base sólida. Customize manualmente documentos específicos.

## 🔧 Troubleshooting

### **Erro: "Could not find a declaration file for module 'pdfkit'"**
```bash
# Solução: Instalar dependências
npm install
npm run build
```

### **Erro: "Modelo X não encontrado"**
```bash
# Verificar modelos disponíveis no Ollama
ollama list

# Usar modelo disponível
npm run adequacao -- --model "nome-do-modelo-disponivel"
```

### **Erro: "Ollama não acessível"**
```bash
# Verificar se Ollama está rodando
curl http://localhost:11434/api/tags

# Iniciar Ollama se necessário
ollama serve
```

### **Erro: "timeout of 60000ms exceeded"**
```bash
# O modelo pode estar sendo carregado pela primeira vez
# Aguarde alguns minutos ou use modelo menor

# Modelos mais leves (mais rápidos):
ollama pull qwen2.5:1.5b-instruct
ollama pull phi3:3.8b-mini-instruct

# Usar modelo menor:
npm run adequacao -- --model "qwen2.5:1.5b-instruct"
```

### **Primeira execução demorada**
- O Ollama pode demorar 2-5 minutos para carregar o modelo na primeira vez
- Execuções subsequentes são mais rápidas (modelo fica em cache)
- Modelos menores carregam mais rápido mas podem ter qualidade menor

> 🚀 **Para otimização avançada**, veja: [PERFORMANCE.md](PERFORMANCE.md)

## 🤝 Contribuição

```bash
# Faça um fork
git clone https://github.com/seu-usuario/dpo2u-lgpd-kit.git

# Crie uma branch
git checkout -b feature/nova-funcionalidade

# Commit suas mudanças
git commit -m "feat: adicionar nova funcionalidade"

# Envie para o repositório
git push origin feature/nova-funcionalidade

# Abra um Pull Request
```

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📚 **Documentação**: Este README
- 🐛 **Issues**: [GitHub Issues](https://github.com/fredericosanntana/dpo2u-lgpd-kit/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/fredericosanntana/dpo2u-lgpd-kit/discussions)
- 📧 **Email**: suporte@dpo2u.com.br

## 🏆 Créditos

Desenvolvido por **DPO2U** - Pioneiros em Legal Tech + IA no Brasil

Baseado no projeto original [dpo2u-mcp](https://github.com/fredericosanntana/dpo2u-mcp)

---

**⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!**

*Transformando Compliance com IA* 🤖⚖️