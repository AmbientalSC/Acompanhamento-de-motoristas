import type {
  Evaluation,
  EvaluationHeader,
  EvaluationHeaderSnapshot,
  EvaluationTemplate,
  HeaderField,
  HeaderFieldRole,
  HeaderFieldType,
  HeaderSubject,
} from '../types';
import { isoDateToMasked } from './mn10FieldUtils';
import { normalizePersonName } from './nameUtils';

export const SUBJECT_LABELS: Record<HeaderSubject, string> = {
  driver: 'Motorista',
  employee: 'Colaborador',
  candidate: 'Candidato',
};

export const SHIFT_OPTIONS = ['Manhã', 'Tarde', 'Noite'];

// Telefone com DDD no formato da máscara de `applyPhoneMask`: (48)999999999 ou (48)99999999
export const PHONE_PATTERN = '\\(\\d{2}\\)\\d{8,9}';

interface RoleConfig {
  label: string;
  // Tipo fixo do papel; ausente = o administrador escolhe (campo livre)
  type?: HeaderFieldType;
  defaultOptions?: string[];
}

export const HEADER_ROLES: Record<HeaderFieldRole, RoleConfig> = {
  person: { label: 'Nome da pessoa', type: 'text' },
  date: { label: 'Data', type: 'date' },
  branch: { label: 'Filial', type: 'branch' },
  shift: { label: 'Turno', type: 'select', defaultOptions: SHIFT_OPTIONS },
  vehicle: { label: 'Veículo (VT)', type: 'text' },
  registration: { label: 'Matrícula', type: 'text' },
  sector: { label: 'Setor', type: 'text' },
  function: { label: 'Função', type: 'text' },
  team: { label: 'Equipe', type: 'text' },
  phone: { label: 'Telefone', type: 'phone' },
  custom: { label: 'Campo livre' },
};

export const HEADER_ROLE_ORDER: HeaderFieldRole[] = [
  'person',
  'date',
  'branch',
  'shift',
  'vehicle',
  'registration',
  'sector',
  'function',
  'team',
  'phone',
  'custom',
];

// Papéis que todo cabeçalho precisa ter (os dashboards agrupam por pessoa e ordenam por data)
export const REQUIRED_ROLES: HeaderFieldRole[] = ['person', 'date'];

export const CUSTOM_FIELD_TYPES: HeaderFieldType[] = ['text', 'number', 'date', 'select'];

export const HEADER_FIELD_TYPE_LABELS: Record<HeaderFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  phone: 'Telefone',
  select: 'Lista de opções',
  branch: 'Lista de filiais',
};

export const createHeaderField = (role: HeaderFieldRole, id: string): HeaderField => {
  const config = HEADER_ROLES[role];
  return {
    id,
    label: role === 'custom' ? '' : config.label,
    role,
    type: config.type ?? 'text',
    options: config.defaultOptions ?? [],
    required: REQUIRED_ROLES.includes(role),
  };
};

const defaultField = (id: string, label: string, role: HeaderFieldRole, required: boolean): HeaderField => ({
  ...createHeaderField(role, id),
  label,
  required,
});

// Os três cabeçalhos que existiam fixos no código. Os ids coincidem com o `headerType` legado dos modelos,
// então modelos antigos continuam resolvendo para eles; também servem de reserva se a coleção não puder ser lida.
export const DEFAULT_HEADERS: EvaluationHeader[] = [
  {
    id: 'evaluation',
    name: 'Avaliação de Motorista',
    subject: 'driver',
    computesAverage: true,
    fields: [
      defaultField('matricula', 'Matrícula', 'registration', false),
      defaultField('motorista', 'Motorista', 'person', true),
      defaultField('setor', 'Setor Acompanhado', 'sector', false),
      defaultField('vt', 'VT (Veículo)', 'vehicle', true),
      defaultField('turno', 'Turno', 'shift', false),
      defaultField('filial', 'Filial', 'branch', true),
      defaultField('data', 'Data do Acompanhamento', 'date', true),
    ],
  },
  {
    id: 'rh',
    name: 'RH',
    subject: 'employee',
    computesAverage: true,
    fields: [
      defaultField('nomeColaborador', 'Nome do Colaborador', 'person', true),
      defaultField('funcao', 'Função', 'function', false),
      defaultField('turnoPrincipal', 'Turno Principal', 'shift', false),
      defaultField('equipeSetor', 'Equipe/Setor', 'team', false),
      defaultField('filial', 'Filial', 'branch', true),
      defaultField('data', 'Data', 'date', true),
    ],
  },
  {
    id: 'candidate',
    name: 'Candidato',
    subject: 'candidate',
    computesAverage: true,
    fields: [
      defaultField('data', 'Data', 'date', true),
      defaultField('nome', 'Nome do Candidato', 'person', true),
      defaultField('telefone', 'Telefone', 'phone', true),
    ],
  },
];

export const isDefaultHeaderId = (id: string): boolean => DEFAULT_HEADERS.some(header => header.id === id);

// Cabeçalhos gravados + os padrão que ainda não existem na coleção, em ordem alfabética
export const withDefaultHeaders = (stored: EvaluationHeader[]): EvaluationHeader[] =>
  [...stored, ...DEFAULT_HEADERS.filter(def => !stored.some(header => header.id === def.id))]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

// `headerId` tem prioridade; `headerType` (legado) aponta para um cabeçalho padrão. Sem nenhum dos dois = sem cabeçalho.
export const getTemplateHeaderId = (template: EvaluationTemplate): string | null =>
  template.headerId || template.headerType || null;

export const resolveTemplateHeader = (
  template: EvaluationTemplate | null | undefined,
  headers: EvaluationHeader[]
): EvaluationHeader | null => {
  const id = template ? getTemplateHeaderId(template) : null;
  if (!id) return null;
  return headers.find(header => header.id === id) ?? DEFAULT_HEADERS.find(header => header.id === id) ?? null;
};

const isRatingType = (type: string | undefined): boolean => type === 'rating' || type === 'rating-5';

// Modelos legados (`criteria`) só têm notas
export const templateHasRatings = (template: EvaluationTemplate): boolean =>
  template.criteriaConfig
    ? template.criteriaConfig.some(criterion => isRatingType(criterion.type))
    : template.criteria.length > 0;

// Média geral só existe se o cabeçalho calcula média e o modelo tem campos de nota
export const headerComputesAverage = (
  header: EvaluationHeader | null,
  template: EvaluationTemplate | null
): boolean => !!header?.computesAverage && !!template && templateHasRatings(template);

const today = (): string => new Date().toISOString().split('T')[0];

export const getInitialHeaderValues = (header: EvaluationHeader | null): Record<string, string> =>
  Object.fromEntries((header?.fields ?? []).map(field => [field.id, field.type === 'date' ? today() : '']));

// Campos fixos da avaliação preenchidos pelos papéis do cabeçalho
export type HeaderLegacyFields = Partial<
  Pick<
    Evaluation,
    | 'motorista'
    | 'data'
    | 'filial'
    | 'turno'
    | 'vt'
    | 'matricula'
    | 'setor'
    | 'funcao'
    | 'equipeSetor'
    | 'telefone'
    | 'nomeColaborador'
    | 'turnoPrincipal'
  >
>;

const roleToLegacyFields = (role: HeaderFieldRole, value: string, subject: HeaderSubject): HeaderLegacyFields => {
  const isEmployee = subject === 'employee';
  switch (role) {
    // Colaborador também grava `nomeColaborador`/`turnoPrincipal`, que o PDF e os relatórios de RH leem
    case 'person': return isEmployee ? { motorista: value, nomeColaborador: value } : { motorista: value };
    case 'shift': return isEmployee ? { turno: value, turnoPrincipal: value } : { turno: value };
    case 'date': return { data: value };
    case 'branch': return { filial: value };
    case 'vehicle': return { vt: value };
    case 'registration': return { matricula: value };
    case 'sector': return { setor: value };
    case 'function': return { funcao: value };
    case 'team': return { equipeSetor: value };
    case 'phone': return { telefone: value };
    case 'custom': return {};
  }
};

export interface HeaderPayload {
  fields: HeaderLegacyFields;
  snapshot: EvaluationHeaderSnapshot;
}

export const buildHeaderPayload = (header: EvaluationHeader, values: Record<string, string>): HeaderPayload => {
  const snapshotFields = header.fields.map(field => {
    const raw = (values[field.id] ?? '').trim();
    const value = field.role === 'person' ? normalizePersonName(raw) : raw;
    return { id: field.id, label: field.label, role: field.role, type: field.type, value };
  });

  const fields = snapshotFields.reduce<HeaderLegacyFields>(
    (acc, field) => ({ ...acc, ...roleToLegacyFields(field.role, field.value, header.subject) }),
    {}
  );

  return {
    fields,
    snapshot: { headerId: header.id, name: header.name, subject: header.subject, fields: snapshotFields },
  };
};

// Avaliações antigas não têm snapshot: telefone = candidato, nomeColaborador = RH (mesma dedução do PDF)
export const getEvaluationSubject = (evaluation: Evaluation): HeaderSubject => {
  if (evaluation.headerSnapshot) return evaluation.headerSnapshot.subject;
  if (evaluation.telefone) return 'candidate';
  return evaluation.nomeColaborador ? 'employee' : 'driver';
};

export const formatHeaderValue = (type: HeaderFieldType, value: string): string =>
  type === 'date' ? isoDateToMasked(value) || value : value;

// Primeira mensagem de erro do cabeçalho, ou null se estiver válido
export const validateHeader = (header: Omit<EvaluationHeader, 'id'>): string | null => {
  if (!header.name.trim()) return 'Informe o nome do cabeçalho.';
  if (header.fields.some(field => !field.label.trim())) return 'Preencha o rótulo de todos os campos.';

  for (const role of REQUIRED_ROLES) {
    if (!header.fields.some(field => field.role === role)) {
      return `O cabeçalho precisa de um campo com o papel "${HEADER_ROLES[role].label}".`;
    }
  }

  const fixedRoles = header.fields.map(field => field.role).filter(role => role !== 'custom');
  const repeated = fixedRoles.find((role, index) => fixedRoles.indexOf(role) !== index);
  if (repeated) return `Só pode haver um campo com o papel "${HEADER_ROLES[repeated].label}".`;

  const emptySelect = header.fields.find(
    field => field.type === 'select' && !field.options.some(option => option.trim())
  );
  if (emptySelect) return `Campo "${emptySelect.label.trim()}": informe ao menos uma opção.`;

  return null;
};
