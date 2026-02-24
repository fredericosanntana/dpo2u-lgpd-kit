import {
    CompanyProfile,
    LGPDKitResult,
    LGPDV1Schema,
    DocumentRef,
    RiskLevel
} from './types/index.js';
import { generateDPIA } from './dpia-generator.js';
import { logger } from './logger.js';
import { generateContent, SYSTEM_PROMPTS } from './llm-client.js';

/**
 * Função principal para gerar o LGPD Kit (policy.json + documentos de suporte)
 */
export async function generate_lgpd_kit(profile: CompanyProfile): Promise<LGPDKitResult> {
    logger.info(`Generating LGPD Kit for ${profile.company_id}`);

    // Passo 1: Gerar os Documentos de Suporte (ex: DPIA)
    // O DPIA generator existente requer os parâmetros em formato DPIAInput
    const dpiaResult = await generateDPIA({
        company: profile.name,
        cnpj: profile.company_id,
        processingActivity: profile.processingActivity,
        dataTypes: profile.dataTypes,
        dataSubjects: profile.dataSubjects,
        purpose: profile.purpose
    });

    // Passo 2: Construir as propriedades dinâmicas do Schema v1 usando regras de negócio / LLM
    // Vamos usar um LLM prompt rápido e estrito para analisar a retenção de dados e permissões estruturais 
    // baseadas na natureza do processamento.

    const schemaPrompt = `
Você é um analisador estrito JSON.
Analise o seguinte perfil de empresa LGPD e retorne APENAS um objeto JSON.

Perfil:
Empresa: ${profile.name}
Atividade: ${profile.processingActivity}
Dados: ${profile.dataTypes.join(', ')}

Retorne um JSON contendo ESTRITAMENTE estas chaves, inferindo valores adequados da LGPD:
{
  "retention_days": (número inteiro. Ex: 365, ou 1825 se fiscal),
  "consent_mechanism": (string padronizada, ex: "opt-in-explicito", "base-legal-contrato", "legitimo-interesse"),
  "dpo_contact": (string, use "${profile.dpo_contact || 'dpo@' + profile.company_id.replace(/[^a-zA-Z0-9]/g, '') + '.com.br'}")
}
`;

    let policyData = {
        retention_days: 365,
        consent_mechanism: "opt-in-explicito",
        dpo_contact: profile.dpo_contact || "dpo@empresa.com.br"
    };

    try {
        const response = await generateContent(SYSTEM_PROMPTS.DPIA, schemaPrompt, 2);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            policyData.retention_days = parsed.retention_days || policyData.retention_days;
            policyData.consent_mechanism = parsed.consent_mechanism || policyData.consent_mechanism;
            policyData.dpo_contact = parsed.dpo_contact || policyData.dpo_contact;
        }
    } catch (err) {
        logger.warn('Failed to parse specific policy JSON, using fallback defaults.', err);
    }

    // Passo 3: Montar o schema dpo2u/lgpd/v1
    const policy_json: LGPDV1Schema = {
        schema_version: 'dpo2u/lgpd/v1',
        company_id: profile.company_id,
        generated_at: new Date().toISOString(),
        policy: {
            retention_days: policyData.retention_days,
            data_categories: profile.dataTypes,
            consent_mechanism: policyData.consent_mechanism,
            dpo_contact: policyData.dpo_contact,
            last_review: new Date().toISOString().split('T')[0]
        },
        documents: [
            {
                type: 'dpia',
                cid: null // Será preenchido na próxima flag quando fizer upload pro Lighthouse
            }
        ]
    };

    return {
        policy_json,
        documents: [
            {
                type: 'dpia',
                content: dpiaResult.dpia
            }
        ]
    };
}
