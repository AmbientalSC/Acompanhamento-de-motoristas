
// Representa um critério de avaliação com configurações
export interface EvaluationCriterion {
  name: string;
  required: boolean;
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
  averageScore: number;
  pros: string;
  contras: string;
  consideracoes: string;
}
