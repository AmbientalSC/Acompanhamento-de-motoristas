import React from 'react';
import { CheckCircle2, FileText, PlusCircle } from 'lucide-react';
import type { Evaluation } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import GradingDetails from './GradingDetails';

interface EvaluationResultProps {
  evaluation: Evaluation;
  onGeneratePDF: () => void;
  onNewEvaluation: () => void;
}

const EvaluationResult: React.FC<EvaluationResultProps> = ({ evaluation, onGeneratePDF, onNewEvaluation }) => (
  <Card>
    <div className="p-6 sm:p-8 space-y-6">
      <div className="text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-brand-dark">Avaliação salva com sucesso!</h2>
        <p className="text-gray-600 mt-1">Modelo: {evaluation.templateName}</p>
      </div>

      {evaluation.grading && <GradingDetails grading={evaluation.grading} />}

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button type="button" onClick={onGeneratePDF} variant="secondary">
          <FileText className="h-4 w-4 mr-2" />
          Gerar PDF
        </Button>
        <Button type="button" onClick={onNewEvaluation}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova avaliação
        </Button>
      </div>
    </div>
  </Card>
);

export default EvaluationResult;
