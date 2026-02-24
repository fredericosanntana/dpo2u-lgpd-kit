/**
 * Cliente LEANN - Wrapper Python para busca semântica
 */

import { spawn } from 'child_process';
import { LEANNResult, logger } from './index.js';

const LEANN_INDEX = process.env.LEANN_INDEX_NAME || 'dpo2u-knowledge';
const LEANN_PYTHON = process.env.LEANN_PYTHON_PATH || '/usr/bin/python3';
const LEANN_SCRIPT = process.env.LEANN_SCRIPT_PATH || '/root/DPO2U/.claude/skills/leann-search.py';

export interface LEANNQueryParams {
  query: string;
  topK?: number;
  complexity?: number;
  showMetadata?: boolean;
}

/**
 * Busca no índice LEANN via Python subprocess
 */
export async function searchLEANN(params: LEANNQueryParams): Promise<LEANNResult[]> {
  const startTime = Date.now();
  const topK = Math.min(params.topK || 10, 20);
  const complexity = Math.max(16, Math.min(params.complexity || 32, 128));

  logger.info(`Querying LEANN: "${params.query}" (topK=${topK}, complexity=${complexity})`);

  return new Promise((resolve, reject) => {
    // Tenta usar skill LEANN se disponível via MCP
    // Fallback para Python subprocess
    const args = [
      LEANN_SCRIPT,
      '--index', LEANN_INDEX,
      '--query', params.query,
      '--top-k', topK.toString(),
      '--complexity', complexity.toString(),
      '--format', 'json',
    ];

    if (params.showMetadata) {
      args.push('--show-metadata');
    }

    const pythonProcess = spawn(LEANN_PYTHON, args);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      const executionTime = Date.now() - startTime;

      if (code !== 0) {
        logger.error(`LEANN query failed (code ${code}):`, stderr);
        // Retorna array vazio em vez de reject para não bloquear o fluxo
        resolve([]);
        return;
      }

      try {
        const results = JSON.parse(stdout);
        const parsedResults = Array.isArray(results)
          ? results.map((r: any) => ({
              content: r.content || r.text || '',
              score: r.score || r.similarity || 0,
              metadata: params.showMetadata ? {
                file: r.metadata?.file || r.file,
                tags: r.metadata?.tags || r.tags || [],
              } : undefined,
            }))
          : [];

        logger.info(`LEANN query completed: ${parsedResults.length} results in ${executionTime}ms`);
        resolve(parsedResults);
      } catch (error) {
        logger.error('Failed to parse LEANN output:', error, stdout);
        resolve([]);
      }
    });

    pythonProcess.on('error', (error) => {
      logger.error('Failed to spawn LEANN process:', error);
      // Resolve array vazio em vez de reject
      resolve([]);
    });
  });
}

/**
 * Busca contexto relevante para DPIA
 */
export async function getDPIAContext(activity: string, dataTypes: string[]): Promise<LEANNResult[]> {
  const queries = [
    `DPIA ${activity}`,
    `avaliação de impacto ${activity}`,
    `risco privacidade ${dataTypes.join(' ')}`,
    'bases legais LGPD',
    'medidas de segurança LGPD',
  ];

  const results: LEANNResult[] = [];

  for (const query of queries) {
    const queryResults = await searchLEANN({
      query,
      topK: 5,
      complexity: 32,
      showMetadata: true,
    });
    results.push(...queryResults);
  }

  // Deduplica por conteúdo
  const unique = results.filter((v, i, a) =>
    a.findIndex(t => t.content === v.content) === i
  );

  // Retorna top 15 mais relevantes
  return unique
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

/**
 * Busca contexto relevante para auditoria
 */
export async function getAuditContext(framework: string, scope: string): Promise<LEANNResult[]> {
  const queries = [
    `auditoria ${framework}`,
    `checklist ${framework}`,
    `conformidade ${scope}`,
    'controles de segurança',
    'governança privacidade',
  ];

  const results: LEANNResult[] = [];

  for (const query of queries) {
    const queryResults = await searchLEANN({
      query,
      topK: 5,
      complexity: 32,
      showMetadata: true,
    });
    results.push(...queryResults);
  }

  // Deduplica e ordena
  const unique = results.filter((v, i, a) =>
    a.findIndex(t => t.content === v.content) === i
  );

  return unique
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
