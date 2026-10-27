
// Tipos de campo disponíveis
export type FieldType = 'rating' | 'rating-5' | 'text' | 'number' | 'radio' | 'date' | 'checkbox';

// Opção para campos do tipo rádio
export interface RadioOption {
  label: string;
  value: string;
}

// Representa um critério de avaliação com configurações expandidas
export interface EvaluationCriterion {
  id: string; // Identificador único para o campo
  name: string; // Nome/label do campo
  required: boolean; // Se é obrigatório
  type: FieldType; // Tipo do campo
  options?: RadioOption[]; // Opções para campos de rádio (ou legenda da lista suspensa em campos numéricos)
  placeholder?: string; // Placeholder para campos de texto
  description?: string; // Descrição/ajuda do campo
  imageUrl?: string; // URL da imagem exibida junto à pergunta ('' = sem imagem)
  imagePath?: string; // Caminho da imagem no Storage (usado para apagar)
  correctAnswer?: string; // Resposta correta (gabarito) para campos text, number e radio ('' = sem gabarito)
}

// Item corrigido de uma avaliação com gabarito
export interface GradingItem {
  criterionId: string;
  name: string;
  given: string; // Resposta dada (texto legível)
  expected: string; // Resposta esperada (texto legível)
  isCorrect: boolean;
}

// Resultado da correção, gravado junto da avaliação (snapshot do gabarito)
export interface EvaluationGrading {
  correct: number;
  total: number;
  percentage: number; // 0-100
  items: GradingItem[];
}

// Tipos de usuário no sistema
export type UserRole = 'admin' | 'manager';

// Representa um usuário do sistema
export interface User {
  id: string;
  authUID?: string;
  name: string;
  email: string;
  role: UserRole;
  position: string; // cargo
  branches: string[]; // filiais que pode acessar
  canAccessMN10?: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

// Quem é identificado pelo cabeçalho: define os rótulos ("Motorista", "Colaborador", "Candidato") e o título do PDF
export type HeaderSubject = 'driver' | 'employee' | 'candidate';

// Papel de um campo do cabeçalho: os papéis fixos alimentam os campos da avaliação usados pelos
// dashboards e pelo PDF (ex.: `branch` → `filial`); `custom` fica só no snapshot do cabeçalho.
export type HeaderFieldRole =
  | 'person'
  | 'date'
  | 'branch'
  | 'shift'
  | 'vehicle'
  | 'registration'
  | 'sector'
  | 'function'
  | 'team'
  | 'phone'
  | 'custom';

// `branch` = lista das filiais cadastradas; `select` = opções do próprio campo
export type HeaderFieldType = 'text' | 'number' | 'date' | 'phone' | 'select' | 'branch';

export interface HeaderField {
  id: string;
  label: string;
  role: HeaderFieldRole;
  type: HeaderFieldType; // definido pelo papel; só é escolhido livremente em `custom`
  options: string[]; // usado apenas pelo tipo `select`
  required: boolean;
}

// Cabeçalho reutilizável, criado pelos administradores (coleção `headers`)
export interface EvaluationHeader {
  id: string;
  name: string;
  subject: HeaderSubject;
  computesAverage: boolean; // calcula média geral quando o modelo tem campos de nota
  fields: HeaderField[];
}

// Cópia do cabeçalho preenchido, gravada na avaliação (editar o cabeçalho depois não altera avaliações antigas)
export interface EvaluationHeaderSnapshot {
  headerId: string;
  name: string;
  subject: HeaderSubject;
  fields: Array<Pick<HeaderField, 'id' | 'label' | 'role' | 'type'> & { value: string }>;
}

// Representa um modelo de formulário de avaliação customizável.
export interface EvaluationTemplate {
  id: string;
  name: string;
  criteria: string[]; // Mantido para compatibilidade com dados existentes
  criteriaConfig?: EvaluationCriterion[]; // Nova estrutura com configurações
  includeHeader?: boolean; // Se deve incluir cabeçalho de avaliação (motorista, filial, etc)
  headerId?: string; // Cabeçalho da coleção `headers` (tem prioridade sobre `headerType`)
  headerType?: 'evaluation' | 'rh' | 'candidate'; // Legado: id de um dos cabeçalhos padrão
  includeFinalConsiderations?: boolean; // Se deve incluir campo de considerações finais
  isFormOnly?: boolean; // Se é apenas um formulário (sem avaliação)
}

// Representa uma avaliação individual, agora vinculada a um modelo.
export interface Evaluation {
  id: string;
  matricula: string;
  setor: string;
  turno: string;
  filial: string;
  motorista: string;
  data: string; // YYYY-MM-DD
  vt: string;
  timestamp: number; // Unix timestamp
  templateId: string; // ID do modelo usado
  templateName: string; // Nome do modelo usado
  scores: Record<string, number>; // Scores dinâmicos baseados nos critérios do modelo
  fieldValues?: Record<string, any>; // Valores dos campos customizados (texto, data, radio, etc)
  averageScore?: number; // Opcional - undefined para formulários sem cabeçalho
  ratingScale?: '1-5' | '0-10'; // Escala usada pelo template (1-5 ou 0-10)
  nomeColaborador?: string; // Nome do colaborador (cabeçalho RH)
  funcao?: string; // Função/cargo (cabeçalho RH)
  turnoPrincipal?: string; // Turno principal (cabeçalho RH)
  equipeSetor?: string; // Equipe/setor (cabeçalho RH)
  telefone?: string; // Telefone do candidato (cabeçalho de candidato; o nome fica em `motorista`)
  headerSnapshot?: EvaluationHeaderSnapshot; // Ausente nas avaliações gravadas antes dos cabeçalhos editáveis
  grading?: EvaluationGrading; // Resultado da correção (apenas modelos com gabarito)
  pros: string;
  contras: string;
  consideracoes: string;
}

export type MN10FormStatus = 'draft' | 'published' | 'closed';

export type MN10QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'date'
  | 'phone'
  | 'boolean'
  | 'file_upload';

export type MN10QuestionVisibility = 'public' | 'internal';

export interface MN10QuestionOption {
  id: string;
  label: string;
}

export interface MN10UploadConfig {
  allowedTypes: Array<'image' | 'pdf'>;
  maxSizeMB: number;
  maxFiles?: number;
}

export interface MN10Question {
  id: string;
  title: string;
  type: MN10QuestionType;
  required: boolean;
  visibility?: MN10QuestionVisibility;
  helpText?: string;
  options?: MN10QuestionOption[];
  order: number;
  uploadConfig?: MN10UploadConfig;
}

export interface MN10Form {
  id: string;
  title: string;
  description?: string;
  status: MN10FormStatus;
  publicId: string;
  questions: MN10Question[];
  responseTitleQuestionId?: string;
  responseCount: number;
  createdByUid: string;
  createdByEmail: string;
  createdAt: number;
  updatedAt: number;
}

export type MN10AnswerValue = string | string[] | boolean | null;

export interface MN10ResponseAttachment {
  questionId: string;
  fileName: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAt: number;
}

export interface MN10Response {
  id: string;
  formId: string;
  publicId: string;
  answers: Record<string, MN10AnswerValue>;
  internalAnswers?: Record<string, MN10AnswerValue>;
  attachments: MN10ResponseAttachment[];
  questionSnapshot?: MN10Question[];
  submittedAt: number;
  internalUpdatedAt?: number;
  userAgent?: string;
}
