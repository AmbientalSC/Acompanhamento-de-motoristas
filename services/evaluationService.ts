
import type { Evaluation, EvaluationTemplate } from '../types';
import { EVALUATION_CRITERIA } from '../constants';

// --- BANCO DE DADOS DE MODELOS (TEMPLATES) ---
let mockTemplates: EvaluationTemplate[] = [];
export const DEFAULT_TEMPLATE_ID = 'default-template-1';

// Cria um modelo padrão inicial usando os critérios originais.
const defaultTemplate: EvaluationTemplate = {
  id: DEFAULT_TEMPLATE_ID,
  name: 'Avaliação Padrão',
  criteria: [...EVALUATION_CRITERIA],
};
mockTemplates.push(defaultTemplate);

/**
 * Simula a busca de todos os modelos.
 */
export const getTemplates = async (): Promise<EvaluationTemplate[]> => {
  console.log("Buscando todos os modelos...");
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockTemplates];
};

/**
 * Simula o salvamento de um novo modelo.
 */
export const saveTemplate = async (templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
  console.log("Salvando novo modelo:", templateData);
  await new Promise(resolve => setTimeout(resolve, 500));
  const newTemplate: EvaluationTemplate = {
    ...templateData,
    id: `template-${Date.now()}`,
  };
  mockTemplates.push(newTemplate);
  console.log("Modelos após salvar:", mockTemplates);
  return newTemplate;
};

/**
 * Simula a atualização de um modelo existente.
 */
export const updateTemplate = async (templateId: string, templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
    console.log(`Atualizando modelo ${templateId}:`, templateData);
    await new Promise(resolve => setTimeout(resolve, 500));
    const templateIndex = mockTemplates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
        throw new Error("Modelo não encontrado");
    }
    const updatedTemplate = { ...templateData, id: templateId };
    mockTemplates[templateIndex] = updatedTemplate;

    // Atualiza o nome do modelo em todas as avaliações que o utilizam
    mockDatabase.forEach((evaluation, index) => {
        if (evaluation.templateId === templateId) {
            mockDatabase[index].templateName = updatedTemplate.name;
        }
    });

    return updatedTemplate;
};

/**
 * Simula a exclusão de um modelo.
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
    console.log(`Excluindo modelo ${templateId}`);
    if (templateId === DEFAULT_TEMPLATE_ID) {
        throw new Error("O modelo padrão não pode ser excluído.");
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    mockTemplates = mockTemplates.filter(t => t.id !== templateId);
};


// --- BANCO DE DADOS DE AVALIAÇÕES ---
let mockDatabase: Evaluation[] = [];

// Helper para criar um objeto de scores a partir do modelo padrão.
const createInitialScores = (): Record<string, number> => {
  return defaultTemplate.criteria.reduce((acc, criterion) => {
    acc[criterion] = 5;
    return acc;
  }, {} as Record<string, number>);
};

// Dados de exemplo, agora com referência ao modelo padrão.
const initialData: Omit<Evaluation, 'id' | 'timestamp' | 'templateId' | 'templateName'>[] = [
    {
      matricula: "101", setor: "Norte", turno: "Manhã", filial: "Central", motorista: "João Silva", data: "2024-07-15", vt: "VT-001", 
      scores: { ...createInitialScores(), "Checklist": 8, "Cinto de Segurança": 10, "Aceleração": 7 }, averageScore: 8.33,
      pros: "Excelente atenção aos procedimentos de segurança.", contras: "Aceleração um pouco brusca em alguns momentos.", consideracoes: "Motorista promissor, precisa de pequeno ajuste."
    },
    {
      matricula: "101", setor: "Norte", turno: "Manhã", filial: "Central", motorista: "João Silva", data: "2024-07-22", vt: "VT-001",
      scores: { ...createInitialScores(), "Checklist": 9, "Cinto de Segurança": 10, "Aceleração": 8 }, averageScore: 9.00,
      pros: "Melhora notável na suavidade da aceleração.", contras: "Ainda pode melhorar em manobras de ré.", consideracoes: "Progresso excelente."
    },
    {
      matricula: "202", setor: "Sul", turno: "Tarde", filial: "Unidade Sul", motorista: "Maria Oliveira", data: "2024-07-18", vt: "VT-005",
      scores: { ...createInitialScores(), "Freio Motor": 6, "Postura Preventiva e Defensiva no transito": 7, "Troca de Marcha": 9 }, averageScore: 7.33,
      pros: "Ótima troca de marchas, muito suave.", contras: "Uso do freio motor pode ser mais frequente.", consideracoes: "Bom desempenho geral."
    },
];

initialData.forEach(item => {
    const timestamp = new Date(item.data).getTime();
    mockDatabase.push({
        ...item,
        id: `mock-${timestamp}-${Math.random()}`,
        timestamp,
        templateId: DEFAULT_TEMPLATE_ID,
        templateName: defaultTemplate.name,
    });
});

/**
 * Simula o salvamento de uma avaliação.
 */
export const saveEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'timestamp'>): Promise<void> => {
  console.log("Salvando avaliação:", evaluationData);
  await new Promise(resolve => setTimeout(resolve, 500)); 

  const newEvaluation: Evaluation = {
    ...evaluationData,
    id: `mock-${Date.now()}`,
    timestamp: new Date(evaluationData.data).getTime() || Date.now(),
  };

  mockDatabase.push(newEvaluation);
  console.log("Banco de dados após salvar:", mockDatabase);
};

/**
 * Simula a busca de todas as avaliações.
 */
export const getEvaluations = async (): Promise<Evaluation[]> => {
  console.log("Buscando todas as avaliações...");
  await new Promise(resolve => setTimeout(resolve, 500));
  // Retorna uma cópia ordenada da mais recente para a mais antiga.
  return [...mockDatabase].sort((a, b) => b.timestamp - a.timestamp);
};