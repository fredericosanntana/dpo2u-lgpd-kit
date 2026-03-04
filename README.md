# DPO2U LGPD Kit

**Open-source LGPD compliance toolkit** — generate the 8 essential privacy documents locally using AI, with zero cloud dependency. Optionally integrates with the DPO2U Web3 protocol for on-chain attestations.

## What It Does

The LGPD Kit solves a specific problem: LGPD compliance documentation is expensive (R$50k+ with traditional consultants) and slow. This tool generates a complete compliance package in under 1 hour, 100% locally, for free.

### Two Operating Modes

| Mode | Target | How It Works |
|------|--------|-------------|
| **CLI (B2C)** | SMEs and startups | Interactive wizard generates 8 PDF/TXT documents locally via Ollama |
| **Protocol Engine (B2B)** | AI agents and integrations | Generates structured `policy.json` (schema `dpo2u/lgpd/v1`) for on-chain attestation via Midnight Network |

## Generated Documents

| Document | File | Description |
|----------|------|-------------|
| Maturity Assessment | `maturidade.pdf` | Score 0-100 across 23 categorized questions |
| Data Inventory | `inventario.csv` | Complete data flow mapping |
| Legal Bases | `bases-legais.csv` | LGPD Art. 7 legal basis per activity |
| DPIA | `dpia.pdf` | Data Protection Impact Assessment |
| Privacy Policy | `politica-privacidade.txt` | Ready for publication |
| DPA Contract | `contrato-dpa.txt` | Data Processing Agreement template |
| Incident Response Plan | `plano-incidente.txt` | Breach response procedures |
| DPO Report | `relatorio-dpo.pdf` | Evidence package and next steps |
| Compliance Protocol | `policy.json` | Schema v1 with references to all documents above |

**Final output**: `pacote-final.zip` with all documents + audit log.

## Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Ollama (local LLM)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5:3b-instruct
ollama serve
```

### Install and Run

```bash
git clone https://github.com/fredericosanntana/dpo2u-lgpd-kit.git
cd dpo2u-lgpd-kit
npm install
npm run build
npm run adequacao    # Start the compliance wizard
```

The wizard collects company information (name, sector, size, data categories), then generates all 8 documents using local AI inference.

## LLM Providers

| Provider | Privacy | Setup |
|----------|---------|-------|
| **Ollama** (default) | 100% local, offline capable | `ollama pull qwen2.5:3b-instruct` |
| **Claude** (Anthropic) | Cloud API | `export ANTHROPIC_API_KEY=...` + `--provider claude` |
| **OpenAI/Codex** | Cloud API | `export OPENAI_API_KEY=...` + `--provider codex` |

```bash
# Use a specific model
npm run adequacao -- --model "qwen2.5:7b-instruct"

# Use Claude
npm run adequacao -- --provider claude --model "claude-3-5-sonnet-20241022"

# Custom output directory
npm run adequacao -- --output "/path/to/output"
```

## Smart Caching

The system caches company profiles to avoid re-entering data:

```bash
npm run cache        # View saved companies
```

On subsequent runs, choose to reuse an existing profile, add a new company, or clear the cache.

## Performance

| Metric | Value |
|--------|-------|
| Total time | 30-60 minutes |
| Output size | <10MB |
| RAM usage | <512MB |
| Documents generated | 8 + ZIP package |
| Success rate | 95%+ |
| Cost | Free |

## Privacy and Security

- **100% local processing** when using Ollama — no data leaves your machine
- **Full audit log** of every operation with timestamps
- **Open-source** — inspect every line of code
- **Privacy by design** — the tool that generates privacy documents is itself privacy-preserving

## LGPD Context

The [LGPD (Lei Geral de Protecao de Dados)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) is Brazil's data protection regulation, equivalent to the EU's GDPR. It requires organizations to maintain documentation covering data inventories, legal bases for processing, privacy policies, DPIAs, and incident response plans. This tool automates the generation of that documentation package.

## Contributing

```bash
git clone https://github.com/fredericosanntana/dpo2u-lgpd-kit.git
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: description"
git push origin feature/your-feature
# Open a Pull Request
```

## License

MIT
