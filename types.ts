
// Tipos de campo disponíveis
export type FieldType = 'rating' | 'text' | 'radio' | 'date' | 'checkbox';

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
  options?: RadioOption[]; // Opções para campos de rádio
  placeholder?: string; // Placeholder para campos de texto
  description?: string; // Descrição/ajuda do campo
}

// Tipos de usuário no sistema
export type UserRole = 'admin' | 'manager';

// Representa um usuário do sistema
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position: string; // cargo
  branches: string[]; // filiais que pode acessar
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

// Representa um modelo de formulário de avaliação customizável.
export interface EvaluationTemplate {
  id: string;
  name: string;
  criteria: string[]; // Mantido para compatibilidade com dados existentes
  criteriaConfig?: EvaluationCriterion[]; // Nova estrutura com configurações
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
  fieldValues: Record<string, any>; // Valores dos campos customizados (texto, data, radio, etc)
  averageScore: number;
  pros: string;
  contras: string;
  consideracoes: string;
}
