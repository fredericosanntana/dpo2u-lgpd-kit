import fs from 'fs';
import path from 'path';
import { AuditLog } from '../types/index.js';

export class Logger {
  private logs: AuditLog[] = [];
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  log(etapa: string, sucesso: boolean, entrada: any, saida?: any, erro?: string): void {
    const logEntry: AuditLog = {
      timestamp: new Date().toISOString(),
      etapa,
      sucesso,
      entrada,
      saida,
      erro
    };

    this.logs.push(logEntry);
    console.log(`[${logEntry.timestamp}] ${etapa}: ${sucesso ? '✅' : '❌'}`);

    if (erro) {
      console.error(`Erro: ${erro}`);
    }
  }

  save(): string {
    const logFile = path.join(this.outputDir, 'log-auditoria.json');
    fs.writeFileSync(logFile, JSON.stringify(this.logs, null, 2));
    return logFile;
  }

  getSummary(): { total: number; sucessos: number; erros: number } {
    return {
      total: this.logs.length,
      sucessos: this.logs.filter(l => l.sucesso).length,
      erros: this.logs.filter(l => !l.sucesso).length
    };
  }
}