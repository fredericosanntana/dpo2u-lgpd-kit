// MOCK FETCH PARA E2E TEST PASSAR SEM LLM LOCAL (Ollama/Proxy offline)
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url.includes('chat/completions')) {
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: "[CONTEÚDO GERADO PELO MOCK DO E2E - TEST SUCCESSFUL]" },
          finish_reason: "stop"
        }],
        usage: { total_tokens: 42 }
      })
    };
  }
  return originalFetch(url, options);
};

import { generate_lgpd_kit } from './dist/lgpd-kit-generator.js';

async function run() {
  console.log('--- Iniciando Teste do LGPD Kit (Novo Schema v1) ---');
  try {
    const result = await generate_lgpd_kit({
      company_id: "cnpj:12.345.678/0001-90",
      name: "Acme Tech Solutions",
      processingActivity: "Gestão do banco de dados de clientes SaaS",
      dataTypes: ["nome", "email", "cpf", "cartão de crédito"],
      dataSubjects: ["clientes"],
      purpose: "Faturamento e prestação de serviço",
      dpo_contact: "dpo@acmetech.com"
    });

    console.log('\n✅ POLICY JSON GERADO:\n');
    console.log(JSON.stringify(result.policy_json, null, 2));

    console.log('\n📄 DOCUMENTOS GERADOS:\n');
    result.documents.forEach(doc => {
      console.log(`Tipo: ${doc.type}`);
      console.log(`Preview: ${doc.content.substring(0, 500)}...\n`);
    });

  } catch (error) {
    console.error('Falha no teste:', error);
  }
}

run();
