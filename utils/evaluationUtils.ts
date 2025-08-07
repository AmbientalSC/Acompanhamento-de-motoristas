// Utilitários para avaliação de motoristas

export interface EvaluationStatus {
  status: 'approved' | 'review' | 'rejected';
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

/**
 * Determina o status de aprovação baseado na nota
 * @param score Nota da avaliação (0-10)
 * @returns Objeto com informações do status
 */
export const getEvaluationStatus = (score: number): EvaluationStatus => {
  if (score > 7) {
    return {
      status: 'approved',
      label: 'Aprovado',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: 'CheckCircle'
    };
  }
  
  if (score >= 6) {
    return {
      status: 'review',
      label: 'Reavaliar',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: 'Clock'
    };
  }
  
  return {
    status: 'rejected',
    label: 'Reprovado',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'AlertCircle'
  };
};

/**
 * Formata a exibição do status com a nota
 * @param score Nota da avaliação
 * @returns String formatada para exibição
 */
export const formatStatusWithScore = (score: number): string => {
  const status = getEvaluationStatus(score);
  return `${status.label} (${score.toFixed(2)})`;
};
