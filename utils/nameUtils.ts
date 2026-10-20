// Trecho que identifica o "motorista" gerado para formulários sem cabeçalho (ex.: "Formulário Teste de Volante").
// Esses valores não são nomes de pessoas e ficam como estão.
export const FORM_PLACEHOLDER_MARK = 'Formulário';

// Nome de pessoa padronizado: sem espaços sobrando e em letras maiúsculas (acentos preservados).
export const normalizePersonName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');

// Nome de motorista/colaborador de uma avaliação: padroniza, exceto o texto gerado para formulários.
export const normalizeEvaluationName = (name: string | undefined): string => {
  const value = name ?? '';
  return value.includes(FORM_PLACEHOLDER_MARK) ? value.trim() : normalizePersonName(value);
};

// Chave de busca: maiúsculas e sem acentos, para "joao" encontrar "JOÃO".
export const normalizeForSearch = (value: string): string =>
  normalizePersonName(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
