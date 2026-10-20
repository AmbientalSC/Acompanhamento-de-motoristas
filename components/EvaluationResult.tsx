import React, { useEffect, useRef } from 'react';
import Icon from './ui/Icon';
import type { Evaluation } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import GradingDetails from './GradingDetails';

interface EvaluationResultProps {
  evaluation: Evaluation;
  onGeneratePDF: () => void;
  onNewEvaluation: () => void;
  // Falha ao gerar o PDF: exibida junto aos botões (banner inline, sem diálogo do navegador)
  errorMessage?: string | null;
}

const EvaluationResult: React.FC<EvaluationResultProps> = ({ evaluation, onGeneratePDF, onNewEvaluation, errorMessage }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Ao salvar, o botão da barra fixa some: volta ao topo e foca o título para o resultado não ficar fora da tela
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Card>
      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center">
          <Icon name="circle-check" className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-brand-dark break-words focus:outline-none"
          >
            Avaliação salva com sucesso!
          </h2>
          <p className="text-gray-600 mt-1 break-words">Modelo: {evaluation.templateName}</p>
        </div>

        {evaluation.grading && <GradingDetails grading={evaluation.grading} />}

        <div className="space-y-3">
          {errorMessage && (
            <div role="alert" className="flex items-start gap-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <Icon name="alert-circle" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="min-w-0 break-words">{errorMessage}</span>
            </div>
          )}

          {/* No celular: botões empilhados em largura total, ação principal no topo */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
            <Button type="button" onClick={onGeneratePDF} variant="secondary" className="w-full sm:w-auto">
              <Icon name="file-text" className="h-4 w-4" />
              Gerar PDF
            </Button>
            <Button type="button" onClick={onNewEvaluation} className="w-full sm:w-auto">
              <Icon name="circle-plus" className="h-4 w-4" />
              Nova avaliação
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EvaluationResult;
