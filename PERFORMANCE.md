# 🚀 Guia de Performance - DPO2U LGPD Kit

## ⚡ Otimização para Diferentes Máquinas

### 💻 **Computador Lento / Primeiro Uso**
```bash
# Use modelo menor e mais rápido
npm run adequacao -- --model "qwen2.5:1.5b-instruct"

# Ou configure no .env
cp .env.performance .env
```

### 🖥️ **Computador Médio (Recomendado)**
```bash
# Modelo padrão (bom equilíbrio)
npm run adequacao -- --model "qwen2.5:3b-instruct"
```

### 🚀 **Computador Rápido**
```bash
# Modelo maior para melhor qualidade
npm run adequacao -- --model "qwen2.5:7b-instruct"
```

## ⏱️ **Tempos Esperados**

| Modelo | Primeira Carga | Execução | Qualidade |
|--------|----------------|----------|-----------|
| 1.5b-instruct | 30-60s | 1-2min | Boa |
| 3b-instruct | 1-2min | 2-4min | Muito Boa |
| 7b-instruct | 2-5min | 5-10min | Excelente |

## 🔧 **Otimizações**

### **1. Pré-carregar Modelo**
```bash
# Carrega modelo na memória (execute uma vez)
ollama run qwen2.5:3b-instruct "teste"
```

### **2. Manter Ollama Ativo**
```bash
# Deixe Ollama rodando em background
ollama serve &
```

### **3. Usar SSD**
- Models ficam em `~/.ollama/models/`
- SSD acelera carregamento significativamente

### **4. RAM Disponível**
- 1.5b: ~2GB RAM
- 3b: ~4GB RAM
- 7b: ~8GB RAM

## ❓ **Problemas Comuns**

### **"Timeout after 3 minutes"**
```bash
# Solução 1: Modelo menor
npm run adequacao -- --model "qwen2.5:1.5b-instruct"

# Solução 2: Aguardar primeira carga
# (pode demorar 5-10 minutos na primeira vez)
```

### **"Out of memory"**
```bash
# Use modelo menor
ollama pull qwen2.5:1.5b-instruct
npm run adequacao -- --model "qwen2.5:1.5b-instruct"
```

### **CPU 100% durante execução**
- Normal durante geração de IA
- Use modelo menor se necessário

## 📊 **Benchmarks**

### **MacBook Air M2 (8GB)**
- 1.5b: ~2 minutos total
- 3b: ~4 minutos total
- 7b: ~8 minutos total

### **PC Intel i5 (16GB)**
- 1.5b: ~3 minutos total
- 3b: ~6 minutos total
- 7b: ~12 minutos total

### **Raspberry Pi 4 (8GB)**
- 1.5b: ~8 minutos total
- 3b: Não recomendado
- 7b: Não funciona

## 🎯 **Recomendações**

1. **Primeira vez**: Use `qwen2.5:1.5b-instruct`
2. **Uso regular**: Use `qwen2.5:3b-instruct`
3. **Máximo qualidade**: Use `qwen2.5:7b-instruct`
4. **Produção**: Mantenha Ollama sempre rodando

---

💡 **Dica**: A qualidade dos documentos gerados é boa em todos os modelos. Use o menor modelo que funciona bem na sua máquina!