import React from 'react';
import Icon from './ui/Icon';
import QuestionImage from './ui/QuestionImage';
import type { EvaluationCriterion, EvaluationGrading } from '../types';

interface GradingDetailsProps {
  grading: EvaluationGrading;
  // Critérios do modelo: quando informados, mostram a imagem de cada pergunta (miniatura ampliável)
  criteria?: EvaluationCriterion[];
}

// Resumo de acertos + lista de perguntas corrigidas (resposta dada × esperada)
const GradingDetails: React.FC<GradingDetailsProps> = ({ grading, criteria }) => (
  <div className="min-w-0">
    <div className="text-center mb-4 p-4 bg-brand-light rounded-lg">
      <p className="text-sm font-medium text-gray-600">Resultado do teste</p>
      <p className="text-2xl sm:text-3xl font-bold text-brand-primary">
        {grading.correct} de {grading.total} acertos
      </p>
      <p className="text-lg text-gray-600">{grading.percentage}%</p>
    </div>

    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
      {grading.items.map(item => {
        const criterion = criteria?.find(c => c.id === item.criterionId);

        return (
          <li key={item.criterionId} className="flex items-start gap-3 p-3 sm:p-4">
            {item.isCorrect ? (
              <Icon name="circle-check" className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" label="Correta" />
            ) : (
              <Icon name="circle-x" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" label="Incorreta" />
            )}
            <div className="min-w-0 flex-1 text-sm break-words">
              <p className="font-medium text-brand-dark">{item.name}</p>
              {criterion?.imageUrl && (
                <div className="my-2">
                  <QuestionImage
                    compact
                    src={criterion.imageUrl}
                    alt={item.name}
                    options={criterion.type === 'number' ? criterion.options : undefined}
                  />
                </div>
              )}
              <p className="text-gray-600">
                Resposta: <span className="font-medium">{item.given || 'Sem resposta'}</span>
              </p>
              {!item.isCorrect && (
                <p className="text-gray-600">
                  Esperado: <span className="font-medium text-green-700">{item.expected}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

export default GradingDetails;
