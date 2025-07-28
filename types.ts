
// Representa um modelo de formulário de avaliação customizável.
export interface EvaluationTemplate {
  id: string;
  name: string;
  criteria: string[];
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
