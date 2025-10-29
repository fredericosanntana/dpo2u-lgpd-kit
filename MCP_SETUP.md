# Configuração MCP para Claude Code

Este guia explica como configurar o DPO2U LGPD Kit como um servidor MCP (Model Context Protocol) para usar com Claude Code.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Claude Code ou cliente MCP compatível
- Chave de API da Anthropic (Claude) ou OpenAI (Codex) - opcional para Ollama

## 🚀 Instalação

1. **Clone e prepare o projeto:**
```bash
cd /opt/dpo2u-lgpd-kit
npm install
npm run build
```

2. **Teste o servidor MCP:**
```bash
npm run mcp
```

Se aparecer "🚀 DPO2U LGPD Kit MCP Server rodando...", está funcionando!

## ⚙️ Configuração no Claude Code

### Opção 1: Configuração Automática

Copie o arquivo de configuração para o Claude Code:

```bash
# Para macOS
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Para Linux
cp claude_desktop_config.json ~/.config/claude/claude_desktop_config.json

# Para Windows
cp claude_desktop_config.json %APPDATA%/Claude/claude_desktop_config.json
```

### Opção 2: Configuração Manual

Edite o arquivo `claude_desktop_config.json` do Claude Code e adicione:

```json
{
  "mcpServers": {
    "dpo2u-lgpd-kit": {
      "command": "node",
      "args": [
        "/opt/dpo2u-lgpd-kit/dist/mcp-server.js"
      ],
      "env": {
        "NODE_PATH": "/opt/dpo2u-lgpd-kit/node_modules"
      }
    }
  }
}
```

**Importante:** Ajuste o caminho `/opt/dpo2u-lgpd-kit` para o local onde o projeto está instalado.

## 🛠️ Ferramentas Disponíveis

Após a configuração, Claude Code terá acesso a 3 ferramentas:

### 1. `lgpd_compliance_full`
Executa processo completo de adequação LGPD para uma empresa.

**Parâmetros obrigatórios:**
- `nome`: Nome da empresa
- `setor`: Setor de atuação
- `colaboradores`: Número de colaboradores
- `coletaDados`: Se coleta dados pessoais (true/false)
- `possuiOperadores`: Se possui operadores/fornecedores (true/false)
- `contato`: Objeto com responsável e email

**Parâmetros opcionais:**
- `cnpj`: CNPJ da empresa
- `provider`: Provedor de IA (ollama/claude/codex, padrão: claude)
- `apiKey`: Chave de API (obrigatória para Claude/Codex)
- `outputDir`: Diretório de saída

### 2. `lgpd_check_company_cache`
Verifica se uma empresa já possui dados em cache.

**Parâmetros:**
- `nome`: Nome da empresa
- `cnpj`: CNPJ (opcional)

### 3. `lgpd_maturity_assessment`
Executa apenas avaliação de maturidade LGPD.

**Parâmetros:** Mesmos da adequação completa.

## 💡 Exemplos de Uso

### Verificar cache de empresa:
```
Use a ferramenta lgpd_check_company_cache para verificar se a empresa "TechCorp Ltda" já foi processada.
```

### Adequação completa:
```
Execute adequação LGPD completa para:
- Nome: TechCorp Ltda
- Setor: Tecnologia/Software
- Colaboradores: 50
- Coleta dados: true
- Possui operadores: true
- Responsável: João Silva
- Email: joao@techcorp.com
- Provider: claude
- API Key: sua_chave_anthropic
```

### Apenas avaliação de maturidade:
```
Execute apenas avaliação de maturidade LGPD para a empresa TechCorp Ltda com os mesmos dados acima.
```

## 🔧 Configuração de Provedores de IA

### Ollama (Local, Gratuito)
```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelo
ollama pull qwen2.5:3b-instruct

# Iniciar servidor
ollama serve
```

### Claude (Anthropic)
- Obtenha uma chave de API em: https://console.anthropic.com/
- Use `provider: "claude"` e forneça `apiKey`

### Codex (OpenAI)
- Obtenha uma chave de API em: https://platform.openai.com/
- Use `provider: "codex"` e forneça `apiKey`

## 📁 Estrutura de Saída

Os documentos gerados são salvos em:
- Diretório temporário (se não especificado)
- Diretório personalizado (se especificado)

**Arquivos gerados:**
- `maturidade.pdf` - Avaliação de maturidade
- `maturidade.json` - Dados da avaliação
- `dataflow.csv` - Mapeamento de fluxo de dados
- `bases-legais.csv` - Bases legais por tratamento
- `dpia.pdf` - Avaliação de impacto
- `politica-privacidade.txt` - Política de privacidade
- `dpa-contrato.txt` - Contrato com operadores
- `plano-incidentes.txt` - Plano de resposta a incidentes
- `relatorio-dpo.pdf` - Relatório final do DPO
- `pacote-final.zip` - Todos os documentos empacotados

## 🔍 Resolução de Problemas

### Servidor não inicia
```bash
cd /opt/dpo2u-lgpd-kit
npm run build
node dist/mcp-server.js
```

### Claude Code não reconhece o servidor
1. Verifique o caminho no `claude_desktop_config.json`
2. Reinicie o Claude Code
3. Verifique se o Node.js está no PATH

### Erro de timeout com Ollama
1. Certifique-se que o Ollama está rodando: `ollama serve`
2. Verifique se o modelo está baixado: `ollama list`
3. Baixe o modelo se necessário: `ollama pull qwen2.5:3b-instruct`

### Erro de API key
- Para Claude: Configure `ANTHROPIC_API_KEY` ou forneça via parâmetro
- Para Codex: Configure `OPENAI_API_KEY` ou forneça via parâmetro

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do Claude Code
2. Teste o servidor manualmente: `npm run mcp`
3. Consulte a documentação do MCP: https://modelcontextprotocol.io/

---

✅ **Configuração completa!** Agora Claude Code pode executar adequações LGPD autonomamente através das ferramentas MCP.