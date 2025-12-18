'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

type FormData = {
  nome: string;
  cnpj: string;
  setor: string;
  colaboradores: string;
  coletaDados: boolean;
  possuiOperadores: boolean;
  responsavel: string;
  email: string;
  telefone: string;
  apiKey?: string;
};

export default function Home() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ downloadUrl: string; logs: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Erro ao gerar documentos');
      }

      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            DPO2U LGPD Kit
          </h1>
          <p className="text-slate-400">
            Gere sua documentação de conformidade LGPD completa em minutos com IA.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          {!result && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Nome */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Razão Social</label>
                  <input
                    {...register('nome', { required: 'Nome é obrigatório' })}
                    className={clsx(
                      "w-full px-4 py-2 bg-slate-900/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white",
                      errors.nome ? "border-red-500" : "border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="Sua Empresa Ltda"
                  />
                  {errors.nome && <span className="text-red-400 text-xs">{errors.nome.message}</span>}
                </div>

                {/* CNPJ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">CNPJ</label>
                  <input
                    {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                    className={clsx(
                      "w-full px-4 py-2 bg-slate-900/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white",
                      errors.cnpj ? "border-red-500" : "border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="00.000.000/0001-00"
                  />
                  {errors.cnpj && <span className="text-red-400 text-xs">{errors.cnpj.message}</span>}
                </div>

                {/* Setor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Setor de Atuação</label>
                  <select
                    {...register('setor')}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="Tecnologia/Software">Tecnologia/Software</option>
                    <option value="E-commerce/Varejo">E-commerce/Varejo</option>
                    <option value="Serviços Financeiros">Serviços Financeiros</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Colaboradores */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Colaboradores</label>
                  <select
                    {...register('colaboradores')}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="5">1-10 (Micro)</option>
                    <option value="30">11-49 (Pequena)</option>
                    <option value="150">50-249 (Média)</option>
                    <option value="500">250+ (Grande)</option>
                  </select>
                </div>

                {/* DPO Nome */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Nome do DPO/Responsável</label>
                  <input
                    {...register('responsavel', { required: 'Responsável é obrigatório' })}
                    className={clsx(
                      "w-full px-4 py-2 bg-slate-900/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white",
                      errors.responsavel ? "border-red-500" : "border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="Nome Completo"
                  />
                  {errors.responsavel && <span className="text-red-400 text-xs">{errors.responsavel.message}</span>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email de Contato</label>
                  <input
                    {...register('email', { required: 'Email é obrigatório' })}
                    className={clsx(
                      "w-full px-4 py-2 bg-slate-900/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white",
                      errors.email ? "border-red-500" : "border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="dpo@empresa.com"
                  />
                  {errors.email && <span className="text-red-400 text-xs">{errors.email.message}</span>}
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Telefone (Opcional)</label>
                  <input
                    {...register('telefone')}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register('coletaDados')}
                    className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900/50"
                  />
                  <span className="text-slate-300 text-sm">A empresa coleta dados pessoais de clientes/usuários?</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register('possuiOperadores')}
                    className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900/50"
                  />
                  <span className="text-slate-300 text-sm">A empresa utiliza fornecedores que processam dados (operadores)?</span>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2 pt-4 border-t border-slate-700/50">
                <label className="text-sm font-medium text-emerald-400">Gemini API Key (Opcional)</label>
                <div className="text-xs text-slate-500 mb-1">Se não preenchido, usará a chave do servidor.</div>
                <input
                  {...register('apiKey')}
                  type="password"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-emerald-500/30 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-600"
                  placeholder="AIza..."
                />
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={clsx(
                    "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center",
                    isLoading
                      ? "bg-slate-700 cursor-not-allowed text-slate-400"
                      : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white hover:shadow-emerald-500/20"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Gerando Documentos... (2-3 min)
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Gerar Kit de Adequação
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-200">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-6 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Adequação Concluída!</h3>
                <p className="text-slate-400">
                  Seus documentos foram gerados e validados com sucesso.
                </p>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-lg text-left text-xs font-mono text-slate-400 h-48 overflow-y-auto mb-6 border border-slate-700">
                <pre>{result.logs}</pre>
              </div>

              <a
                href={result.downloadUrl}
                className="inline-flex items-center px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar Pacote Final (.zip)
              </a>

              <button
                onClick={() => setResult(null)}
                className="block w-full mt-4 text-slate-500 hover:text-slate-300 text-sm underline"
              >
                Gerar novo kit
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-slate-500 text-sm">
          &copy; 2025 DPO2U - Powered by Gemini 2.0 Flash
        </div>
      </div>
    </div>
  );
}
