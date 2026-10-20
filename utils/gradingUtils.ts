import type {
  EvaluationCriterion,
  EvaluationGrading,
  EvaluationTemplate,
  FieldType,
  GradingItem,
} from '../types';

// Tipos de campo que aceitam gabarito
const GRADABLE_TYPES: FieldType[] = ['text', 'number', 'radio'];

export const supportsAnswerKey = (type: FieldType | undefined): boolean =>
  type !== undefined && GRADABLE_TYPES.includes(type);

export const hasAnswerKey = (criterion: EvaluationCriterion): boolean =>
  supportsAnswerKey(criterion.type) &&
  typeof criterion.correctAnswer === 'string' &&
  criterion.correctAnswer.trim().length > 0;

const toAnswerString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

// Aceita vírgula ou ponto como separador decimal (pt-BR)
const parseNumber = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const isCorrectAnswer = (criterion: EvaluationCriterion, given: string, expected: string): boolean => {
  if (given.length === 0) return false;

  switch (criterion.type) {
    case 'number': {
      const givenNumber = parseNumber(given);
      const expectedNumber = parseNumber(expected);
      return givenNumber !== null && givenNumber === expectedNumber;
    }
    case 'radio':
      return given === expected;
    default:
      return normalizeText(given) === normalizeText(expected);
  }
};

// Texto legível da resposta: converte o valor da opção no rótulo (radio) ou
// acrescenta o rótulo da legenda ao número (number).
export const describeAnswer = (criterion: EvaluationCriterion, value: string): string => {
  if (value.length === 0) return '';
  const option = criterion.options?.find(item => item.value.trim() === value);
  if (!option || !option.label) return value;
  return criterion.type === 'radio' ? option.label : `${value} – ${option.label}`;
};

/**
 * Corrige as respostas de um formulário com base no gabarito do modelo.
 * Pergunta sem resposta conta como erro. Retorna `undefined` quando o modelo
 * não tem nenhuma pergunta com gabarito.
 *
 * @param fieldValues respostas indexadas pelo **id** do critério
 */
export const gradeEvaluation = (
  template: EvaluationTemplate,
  fieldValues: Record<string, unknown>
): EvaluationGrading | undefined => {
  const gradable = (template.criteriaConfig ?? []).filter(hasAnswerKey);
  if (gradable.length === 0) return undefined;

  const items: GradingItem[] = gradable.map(criterion => {
    const given = toAnswerString(fieldValues[criterion.id]);
    const expected = (criterion.correctAnswer ?? '').trim();

    return {
      criterionId: criterion.id,
      name: criterion.name,
      given: describeAnswer(criterion, given),
      expected: describeAnswer(criterion, expected),
      isCorrect: isCorrectAnswer(criterion, given, expected),
    };
  });

  const correct = items.filter(item => item.isCorrect).length;

  return {
    correct,
    total: items.length,
    percentage: Math.round((correct / items.length) * 100),
    items,
  };
};
