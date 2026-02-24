/**
 * Integração Compliance Engine + Lighthouse
 * Gera DPIA e faz upload automático
 */

import { generateDPIA } from './dpia-generator.js';
import { generateAudit } from './audit-generator.js';
// Mocks para Sprint 1 - O pacote @dpo2u/lighthouse-client não está presente na compilação atual.
const uploadDPIA = async (a: any, b: any) => ({ cid: 'mock-cid', key: 'mock', iv: 'mock', authTag: 'mock', originalHash: 'mock', size: 100 });
const uploadAudit = uploadDPIA;
const registerDPIAOnChain = async (a: any, b: any, c: any) => ({ txHash: 'mock-tx', metadataKey: 'mock-key' });
import { logger } from './logger.js';
import { DPIAInput, DPIAResult, AuditInput, AuditResult } from './types/index.js';

export interface DPIAWithStorageResult extends DPIAResult {
  storage?: {
    cid: string;
    ipfsUrl: string;
    key: string;
    iv: string;
    authTag: string;
    originalHash: string;
    txHash?: string;
    metadataKey?: string;
  };
}

export interface AuditWithStorageResult extends AuditResult {
  storage?: {
    cid: string;
    ipfsUrl: string;
    key: string;
    iv: string;
    authTag: string;
    originalHash: string;
    txHash?: string;
    metadataKey?: string;
  };
}

/**
 * Gera DPIA e faz upload para Lighthouse
 */
export async function generateAndStoreDPIA(
  input: DPIAInput,
  uploadToStorage = true,
  registerOnChain = false
): Promise<DPIAWithStorageResult> {
  logger.info('Generating DPIA with storage', {
    company: input.company,
    upload: uploadToStorage,
    blockchain: registerOnChain,
  });

  // Gera DPIA
  const result = await generateDPIA(input);

  const finalResult: DPIAWithStorageResult = { ...result };

  // Upload para Lighthouse (se solicitado)
  if (uploadToStorage) {
    logger.info('Uploading DPIA to Lighthouse...');

    const uploadResult = await uploadDPIA(result.dpia, input.company);

    finalResult.storage = {
      cid: uploadResult.cid,
      ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.cid}`,
      key: uploadResult.key,
      iv: uploadResult.iv,
      authTag: uploadResult.authTag,
      originalHash: uploadResult.originalHash,
    };

    logger.info('DPIA uploaded to Lighthouse', {
      cid: uploadResult.cid,
      size: uploadResult.size,
    });

    // Registro na blockchain (se solicitado)
    if (registerOnChain) {
      try {
        logger.info('Registering DPIA on blockchain...');

        const txResult = await registerDPIAOnChain(
          uploadResult.cid,
          uploadResult.originalHash,
          input.company
        );

        finalResult.storage.txHash = txResult.txHash;
        finalResult.storage.metadataKey = txResult.metadataKey;

        logger.info('DPIA registered on blockchain', {
          txHash: txResult.txHash,
          metadataKey: txResult.metadataKey,
        });
      } catch (error) {
        logger.warn('Failed to register on blockchain (continuing without it):', error);
        // Não falha se blockchain falhar
      }
    }
  }

  return finalResult;
}

/**
 * Gera Auditoria e faz upload para Lighthouse
 */
export async function generateAndStoreAudit(
  input: AuditInput,
  uploadToStorage = true,
  registerOnChain = false
): Promise<AuditWithStorageResult> {
  logger.info('Generating audit with storage', {
    company: input.company,
    upload: uploadToStorage,
    blockchain: registerOnChain,
  });

  // Gera auditoria
  const result = await generateAudit(input);

  const finalResult: AuditWithStorageResult = { ...result };

  // Upload para Lighthouse (se solicitado)
  if (uploadToStorage) {
    logger.info('Uploading audit to Lighthouse...');

    const uploadResult = await uploadAudit(result.audit, input.company);

    finalResult.storage = {
      cid: uploadResult.cid,
      ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.cid}`,
      key: uploadResult.key,
      iv: uploadResult.iv,
      authTag: uploadResult.authTag,
      originalHash: uploadResult.originalHash,
    };

    logger.info('Audit uploaded to Lighthouse', {
      cid: uploadResult.cid,
      size: uploadResult.size,
    });

    // Registro na blockchain (se solicitado)
    if (registerOnChain) {
      try {
        logger.info('Registering audit on blockchain...');

        const txResult = await registerDPIAOnChain(
          uploadResult.cid,
          uploadResult.originalHash,
          input.company
        );

        finalResult.storage.txHash = txResult.txHash;
        finalResult.storage.metadataKey = txResult.metadataKey;

        logger.info('Audit registered on blockchain', {
          txHash: txResult.txHash,
          metadataKey: txResult.metadataKey,
        });
      } catch (error) {
        logger.warn('Failed to register on blockchain (continuing without it):', error);
        // Não falha se blockchain falha
      }
    }
  }

  return finalResult;
}
