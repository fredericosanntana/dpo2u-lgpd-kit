export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validação básica dos dígitos verificadores
  let soma = 0;
  let peso = 2;

  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cnpj[12]) !== digito1) return false;

  soma = 0;
  peso = 2;

  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cnpj[13]) === digito2;
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Tenta extrair e parsear JSON de uma string que pode conter markdown
 */
export function extractJson<T = any>(text: string): T | null {
  try {
    // Tenta encontrar bloco JSON em markdown
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // Tenta encontrar qualquer estrutura parecida com JSON (objeto ou array)
    const objectMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch && objectMatch[0]) {
      return JSON.parse(objectMatch[0]);
    }

    // Tenta parsear o texto inteiro
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}