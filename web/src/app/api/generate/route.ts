import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    try {
        const data = await req.json();

        // Validar dados básicos
        if (!data.nome || !data.cnpj || !data.email) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        const timestamp = Date.now();
        const id = `${data.cnpj.replace(/\D/g, '')}-${timestamp}`;
        const inputPath = path.resolve(process.cwd(), `temp-${id}.json`);

        // O diretório de output deve ser acessível publicamente para download
        // Vamos usar public/downloads
        const publicDownloadDir = path.resolve(process.cwd(), 'public', 'downloads', id);

        // Salvar JSON de entrada
        const empresaData = {
            nome: data.nome,
            cnpj: data.cnpj,
            setor: data.setor,
            colaboradores: parseInt(data.colaboradores),
            coletaDados: data.coletaDados === 'true' || data.coletaDados === true,
            possuiOperadores: data.possuiOperadores === 'true' || data.possuiOperadores === true,
            contato: {
                responsavel: data.responsavel,
                email: data.email,
                telefone: data.telefone
            }
        };

        fs.writeFileSync(inputPath, JSON.stringify(empresaData, null, 2));

        // Executar CLI
        // Assumindo que estamos rodando dentro de ./web, o CLI está em ../dist/cli.js
        const cliPath = path.resolve(process.cwd(), '..', 'dist', 'cli.js');

        if (!fs.existsSync(cliPath)) {
            throw new Error(`CLI não encontrado em: ${cliPath}`);
        }

        // Configuração do ambiente
        const env = { ...process.env };
        // Se apiKey vier do frontend (não recomendado para prod, mas ok para MVP local) ou do env local
        if (data.apiKey) env.GEMINI_API_KEY = data.apiKey;
        // Fallback para env do servidor
        if (!env.GEMINI_API_KEY) {
            // Tentar ler do arquivo .env da raiz se não estiver carregado
            // Mas o Next.js carrega .env local. O CLI precisa da chave.
            // Vamos assumir que o usuário passou ou que o servidor tem.
        }

        const command = `node ${cliPath} adequacao --input ${inputPath} --output ${publicDownloadDir} --provider gemini --model gemini-2.0-flash`;

        console.log(`🚀 Executando comando: ${command}`);

        // Timeout alto pois o processo pode demorar
        const { stdout, stderr } = await execPromise(command, {
            env,
            timeout: 300000 // 5 minutos
        });

        console.log('✅ CLI Output:', stdout);
        if (stderr) console.error('⚠️ CLI Stderr:', stderr);

        // Limpar arquivo temporário
        try {
            fs.unlinkSync(inputPath);
        } catch (e) { }

        // Verificar se o zip foi criado
        const zipPath = path.join(publicDownloadDir, 'pacote-final.zip');
        if (!fs.existsSync(zipPath)) {
            throw new Error('Arquivo ZIP final não foi gerado.');
        }

        const downloadUrl = `/downloads/${id}/pacote-final.zip`;

        return NextResponse.json({
            success: true,
            downloadUrl,
            logs: stdout
        });

    } catch (error) {
        console.error('❌ Erro na API:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro interno no servidor'
        }, { status: 500 });
    }
}
