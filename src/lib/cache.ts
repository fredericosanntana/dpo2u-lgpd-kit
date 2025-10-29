import fs from 'fs';
import path from 'path';
import { Empresa } from '../types/index.js';
import { sanitizeFileName } from './validator.js';

export interface CachedCompany {
  empresa: Empresa;
  outputDir: string;
  lastExecution: string;
  completed: boolean;
}

export class CompanyCache {
  private cacheDir: string;

  constructor(baseOutputDir: string = './compliance-output') {
    this.cacheDir = path.join(baseOutputDir, '.cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Busca empresas já processadas
   */
  findExistingCompanies(): CachedCompany[] {
    try {
      const cacheFile = path.join(this.cacheDir, 'companies.json');
      if (!fs.existsSync(cacheFile)) {
        return [];
      }

      const data = fs.readFileSync(cacheFile, 'utf-8');
      return JSON.parse(data) || [];
    } catch (error) {
      console.warn('⚠️  Erro ao ler cache de empresas:', error);
      return [];
    }
  }

  /**
   * Busca empresa por CNPJ ou nome similar
   */
  findSimilarCompany(nome: string, cnpj?: string): CachedCompany | null {
    const companies = this.findExistingCompanies();

    // Busca exata por CNPJ
    if (cnpj) {
      const exactMatch = companies.find(c => c.empresa.cnpj === cnpj);
      if (exactMatch) return exactMatch;
    }

    // Busca por nome similar
    const normalizedName = this.normalizeName(nome);
    const similarMatch = companies.find(c =>
      this.normalizeName(c.empresa.nome) === normalizedName
    );

    return similarMatch || null;
  }

  /**
   * Salva dados da empresa no cache
   */
  saveCompany(empresa: Empresa, outputDir: string, completed: boolean = false): void {
    try {
      const companies = this.findExistingCompanies();

      // Remove entrada anterior se existir
      const filtered = companies.filter(c =>
        c.empresa.cnpj !== empresa.cnpj &&
        this.normalizeName(c.empresa.nome) !== this.normalizeName(empresa.nome)
      );

      // Adiciona nova entrada
      filtered.push({
        empresa,
        outputDir,
        lastExecution: new Date().toISOString(),
        completed
      });

      const cacheFile = path.join(this.cacheDir, 'companies.json');
      fs.writeFileSync(cacheFile, JSON.stringify(filtered, null, 2));

    } catch (error) {
      console.warn('⚠️  Erro ao salvar cache:', error);
    }
  }

  /**
   * Marca empresa como concluída
   */
  markCompleted(empresa: Empresa): void {
    try {
      const companies = this.findExistingCompanies();
      const company = companies.find(c => c.empresa.cnpj === empresa.cnpj);

      if (company) {
        company.completed = true;
        company.lastExecution = new Date().toISOString();

        const cacheFile = path.join(this.cacheDir, 'companies.json');
        fs.writeFileSync(cacheFile, JSON.stringify(companies, null, 2));
      }
    } catch (error) {
      console.warn('⚠️  Erro ao atualizar cache:', error);
    }
  }

  /**
   * Verifica se diretório de saída existe e tem arquivos
   */
  validateOutputDir(outputDir: string): boolean {
    try {
      if (!fs.existsSync(outputDir)) return false;

      const files = fs.readdirSync(outputDir);
      const importantFiles = ['empresa.json', 'log-auditoria.json'];

      return importantFiles.every(file => files.includes(file));
    } catch {
      return false;
    }
  }

  /**
   * Lista arquivos gerados na execução anterior
   */
  listGeneratedFiles(outputDir: string): string[] {
    try {
      if (!fs.existsSync(outputDir)) return [];

      return fs.readdirSync(outputDir)
        .filter(file => !file.startsWith('.'))
        .sort();
    } catch {
      return [];
    }
  }

  private normalizeName(nome: string): string {
    return nome.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Gera nome de diretório baseado nos dados da empresa
   */
  generateOutputDir(empresa: Empresa, baseDir: string = './compliance-output'): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(baseDir, `${sanitizeFileName(empresa.nome)}-${timestamp}`);
  }
}