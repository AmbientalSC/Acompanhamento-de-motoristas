
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from './ui/Icon';
import type { Evaluation, EvaluationTemplate } from '../types';
import { getEvaluations, deleteEvaluation, getTemplates } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import { getEvaluationStatus } from '../utils/evaluationUtils';
import { SUBJECT_LABELS, formatHeaderValue, getEvaluationSubject } from '../utils/headerUtils';
import Card from './ui/Card';
import SearchableSelect from './ui/SearchableSelect';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import FormsViewer from './FormsViewer';

type ViewMode = 'evaluations' | 'forms';

// Abaixo de md as notas viram cartões (o gráfico de barras horizontais não cabe); abaixo de lg lista e detalhe ficam empilhados.
const BELOW_MD_QUERY = '(max-width: 767px)';
const BELOW_LG_QUERY = '(max-width: 1023px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const CHART_BAR_COLOR = '#164194';
const CHART_ROW_HEIGHT = 36;
const CHART_MIN_HEIGHT = 240;
const MAX_SCORE = 10;

const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const getMatches = (query: string): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

// Inicializa já com o valor real (sem flash do layout errado na primeira renderização)
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);
    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

interface InfoItemProps {
  label: string;
  value?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
  <div className="min-w-0">
    <span className="text-gray-600">{label}</span>
    <p className="font-medium text-brand-dark break-words">{value}</p>
  </div>
);

const DriverDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('evaluations');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; date: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isBelowMd = useMediaQuery(BELOW_MD_QUERY);
  const isStacked = useMediaQuery(BELOW_LG_QUERY);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [evaluationsData, templatesData] = await Promise.all([
          getEvaluations(),
          getTemplates()
        ]);
        setEvaluations(evaluationsData);
        setTemplates(templatesData);
        if (evaluationsData.length > 0) {
          // Filtrar apenas avaliações verdadeiras para definir o motorista padrão
          const realEvaluations = evaluationsData.filter(e =>
            e.averageScore !== undefined &&
            e.averageScore !== null &&
            e.averageScore > 0 &&
            e.motorista &&
            e.motorista.trim() !== '' &&
            !e.motorista.includes('Formulário')
          );
          const uniqueDrivers = [...new Set(realEvaluations.map(e => e.motorista))];
          if (uniqueDrivers.length > 0) {
            setSelectedDriver(realEvaluations[0].motorista);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteClick = (evaluationId: string, driverName: string, date: string) => {
    setDeleteConfirm({ id: evaluationId, name: driverName, date });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await deleteEvaluation(deleteConfirm.id);
      // Atualizar a lista local removendo o item
      setEvaluations(prev => prev.filter(e => e.id !== deleteConfirm.id));
      // Se a avaliação excluída era a selecionada, limpar a seleção
      if (selectedEvaluation?.id === deleteConfirm.id) {
        setSelectedEvaluation(null);
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      alert('Erro ao excluir avaliação. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const scrollToElement = (element: HTMLElement | null) => {
    element?.scrollIntoView({
      behavior: getMatches(REDUCED_MOTION_QUERY) ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  // Empilhado (celular/tablet): o detalhe fica abaixo da lista, então rola até ele depois do render.
  const handleSelectEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    if (isStacked) {
      requestAnimationFrame(() => scrollToElement(detailRef.current));
    }
  };

  const drivers = useMemo(() => {
    // Filtrar apenas avaliações verdadeiras (com averageScore definido) para o dropdown de motoristas
    const realEvaluations = evaluations.filter(e => {
      // Só considera avaliação verdadeira se:
      // 1. Tem averageScore > 0
      // 2. E motorista preenchido que não seja "Formulário..."
      // 3. E motorista não está vazio
      const isRealEvaluation = e.averageScore !== undefined &&
                               e.averageScore !== null &&
                               e.averageScore > 0 &&
                               e.motorista &&
                               e.motorista.trim() !== '' &&
                               !e.motorista.includes('Formulário');
      return isRealEvaluation;
    });
    return [...new Set(realEvaluations.map(e => e.motorista))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [evaluations]);

  const driverEvaluations = useMemo(() => {
    if (!selectedDriver) return [];
    // Filtrar apenas avaliações verdadeiras para análise de motoristas
    return evaluations.filter(e =>
      e.motorista === selectedDriver &&
      e.averageScore !== undefined &&
      e.averageScore !== null &&
      e.averageScore > 0 &&
      !e.motorista.includes('Formulário')
    );
  }, [evaluations, selectedDriver]);

  useEffect(() => {
    if (driverEvaluations.length > 0) {
      setSelectedEvaluation(driverEvaluations[0]);
    } else {
      setSelectedEvaluation(null);
    }
  }, [driverEvaluations]);

  // Função para mapear IDs de critérios para nomes legíveis
  const getCriterionName = (criterionId: string, templateId: string): string => {
    const template = templates.find(t => t.id === templateId);
    if (template?.criteriaConfig) {
      const criterion = template.criteriaConfig.find(c => c.id === criterionId);
      return criterion?.name || criterionId;
    }
    // Para templates antigos ou se não encontrar, retorna o próprio ID
    return criterionId;
  };

  // Avaliações novas trazem o snapshot do cabeçalho; nas antigas o tipo é deduzido dos campos gravados
  const subject = selectedEvaluation ? getEvaluationSubject(selectedEvaluation) : 'driver';
  const isRhEval = subject === 'employee';
  const isCandidateEval = subject === 'candidate';

  const summaryChartData = useMemo(() => {
    if (!selectedEvaluation?.scores) return [];
    return Object.entries(selectedEvaluation.scores).map(([criterion, score]) => ({
      name: getCriterionName(criterion, selectedEvaluation.templateId),
      Nota: score,
    }));
  }, [selectedEvaluation, templates]);

  const handleGenerateDriverAnalysisPDF = async () => {
    if (driverEvaluations.length === 0) {
      alert('Nenhuma avaliação encontrada para gerar relatório.');
      return;
    }

    try {
      await PDFService.generateDriverAnalysisPDF(driverEvaluations);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handleGenerateEvaluationPDF = async () => {
    if (!selectedEvaluation) {
      alert('Selecione uma avaliação para gerar PDF.');
      return;
    }

    try {
      await PDFService.generateEvaluationPDF(selectedEvaluation);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const renderAverageStatus = (score: number | undefined, scale?: string) => {
    if (score === undefined || score === null) return null;
    const status = getEvaluationStatus(score, scale);
    return <div className={`flex items-center gap-2 ${status.color}`}><Icon name={status.icon} className="h-6 w-6" /> <span className="font-bold text-lg">{status.label} ({score.toFixed(2)})</span></div>;
  };

  const renderStatusBadge = (score: number | undefined, scale?: string) => {
    if (score === undefined || score === null) return null;

    const status = getEvaluationStatus(score, scale);

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
        <Icon name={status.icon} className="h-3 w-3" />
        {status.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div role="status" className="flex h-64 items-center justify-center gap-3 sm:gap-4">
        <Icon name="loader-2" className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-brand-primary" />
        <p className="text-base sm:text-lg text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  if (evaluations.length === 0 && !isLoading) {
    return (
      <Card>
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <Icon name="alert-triangle" className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Nenhuma Avaliação Encontrada</h3>
            <p className="text-gray-600 mt-2">Ainda não há dados para exibir. Comece preenchendo o formulário de avaliação.</p>
        </div>
      </Card>
    );
  }

  const tabClasses = (isActive: boolean) =>
    `flex min-h-11 items-center justify-center gap-2 rounded-brand px-3 py-2 text-center text-base font-semibold ` +
    `transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ` +
    (isActive ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-primary hover:bg-white/60');

  const chartHeight = Math.max(CHART_MIN_HEIGHT, summaryChartData.length * CHART_ROW_HEIGHT);
  const yAxisWidth = isStacked ? 150 : 190;
  const yAxisMaxChars = isStacked ? 20 : 28;

  const backToListButton = (
    <Button
      variant="ghost"
      size="sm"
      className="lg:hidden"
      onClick={() => scrollToElement(listRef.current)}
    >
      <Icon name="arrow-left" className="h-4 w-4" />
      Voltar à lista
    </Button>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Abas principais: controle segmentado em 2 colunas no celular, sem rolagem horizontal */}
      <div
        role="group"
        aria-label="Tipo de visualização"
        className="grid grid-cols-2 gap-1 rounded-lg bg-brand-light p-1 sm:inline-grid sm:grid-cols-[repeat(2,auto)]"
      >
        <button
          type="button"
          onClick={() => setViewMode('evaluations')}
          aria-pressed={viewMode === 'evaluations'}
          className={tabClasses(viewMode === 'evaluations')}
        >
          <Icon name="chart-bar" className="h-5 w-5" />
          <span className="sm:hidden">Por motorista</span>
          <span className="hidden sm:inline">Análise por Motorista</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('forms')}
          aria-pressed={viewMode === 'forms'}
          className={tabClasses(viewMode === 'forms')}
        >
          <Icon name="clipboard-list" className="h-5 w-5" />
          <span className="sm:hidden">Formulários</span>
          <span className="hidden sm:inline">Formulários Preenchidos</span>
        </button>
      </div>

      {/* Conteúdo baseado na aba selecionada */}
      {viewMode === 'forms' ? (
        <FormsViewer />
      ) : (
        <div className="space-y-4 sm:space-y-6">
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="min-w-0 sm:flex-1 sm:max-w-md">
              <h2 className="text-lg sm:text-xl font-bold text-brand-dark mb-3 sm:mb-4">Filtro de Visualização</h2>
              <SearchableSelect
                label="Selecione o Motorista"
                options={drivers}
                value={selectedDriver}
                onChange={setSelectedDriver}
                placeholder="Digite para buscar um motorista"
                emptyMessage="Nenhum motorista encontrado"
              />
            </div>
            {selectedDriver && driverEvaluations.length > 0 && (
              <Button
                onClick={handleGenerateDriverAnalysisPDF}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <Icon name="file-text" className="h-4 w-4" />
                Gerar Relatório Completo
              </Button>
            )}
          </div>
        </div>
      </Card>

      {selectedDriver && driverEvaluations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          <div ref={listRef} className="lg:col-span-1 space-y-3 sm:space-y-4 scroll-mt-[calc(6rem+env(safe-area-inset-top))]">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark px-1 break-words">Avaliações de {selectedDriver}</h3>
            {/* Rolagem interna só em telas largas (xl+); abaixo disso a página inteira rola */}
            <div className="space-y-3 xl:max-h-[75vh] xl:overflow-y-auto xl:pr-2 custom-scrollbar">
              {driverEvaluations.map(evaluation => {
                const isSelected = selectedEvaluation?.id === evaluation.id;

                return (
                  <Card
                    key={evaluation.id}
                    className={`border-2 transition-shadow duration-200 ${
                      isSelected
                        ? 'border-brand-primary shadow-lg sm:shadow-lg'
                        : 'border-gray-200 hover:shadow-md hover:border-brand-primary/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectEvaluation(evaluation)}
                      aria-pressed={isSelected}
                      className="block w-full min-w-0 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-brand-dark">Data: {formatDate(evaluation.data)}</span>
                          {evaluation.vt ? (
                            <span className="block text-sm text-gray-600 break-words">VT: {evaluation.vt}</span>
                          ) : evaluation.funcao ? (
                            <span className="block text-sm text-gray-600 break-words">Função: {evaluation.funcao}</span>
                          ) : null}
                          <span className="mt-2 block">
                            {renderStatusBadge(evaluation.averageScore, evaluation.ratingScale)}
                          </span>
                        </span>
                        <span className="flex-shrink-0 text-right">
                          <span className="block text-lg font-bold text-brand-primary">{evaluation.averageScore?.toFixed(2) || '0.00'}</span>
                          <span className="block text-sm text-gray-600">Média</span>
                        </span>
                      </span>
                    </button>
                    {/* Linha fixa do cartão: modelo à esquerda, exclusão sempre visível à direita */}
                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 py-1 pl-4 pr-2">
                      <p className="min-w-0 flex-1 text-xs text-gray-600 line-clamp-2 break-words">Modelo: {evaluation.templateName}</p>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(evaluation.id, evaluation.motorista, evaluation.data)}
                        aria-label={`Excluir avaliação de ${formatDate(evaluation.data)}`}
                        title="Excluir avaliação"
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:h-9 sm:w-9"
                      >
                        <Icon name="trash" className="h-5 w-5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div ref={detailRef} className="lg:col-span-2 min-w-0 scroll-mt-[calc(6rem+env(safe-area-inset-top))]">{selectedEvaluation ? (
              <Card>
                <div className="p-4 sm:p-6">
                  <div className="mb-3 lg:hidden">{backToListButton}</div>

                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-brand-dark break-words">Detalhes da Avaliação ({formatDate(selectedEvaluation.data)})</h3>
                        <p className="text-sm text-gray-600 break-words">Usando modelo: {selectedEvaluation.templateName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {renderAverageStatus(selectedEvaluation.averageScore, selectedEvaluation.ratingScale)}
                      <Button
                        onClick={handleGenerateEvaluationPDF}
                        variant="secondary"
                        size="sm"
                      >
                        <Icon name="file-text" className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {/* Informações do Cabeçalho da Avaliação */}
                  <div className="mb-6 bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Informações da Avaliação</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {selectedEvaluation.headerSnapshot ? (
                        selectedEvaluation.headerSnapshot.fields.map(field => (
                          <InfoItem
                            key={field.id}
                            label={`${field.label}:`}
                            value={formatHeaderValue(field.type, field.value) || '-'}
                          />
                        ))
                      ) : (
                        <>
                          <InfoItem
                            label={`${SUBJECT_LABELS[subject]}:`}
                            value={selectedEvaluation.motorista}
                          />
                          {isCandidateEval ? (
                            <InfoItem label="Telefone:" value={selectedEvaluation.telefone} />
                          ) : (
                            <InfoItem label="Filial:" value={selectedEvaluation.filial} />
                          )}
                          {isCandidateEval ? null : isRhEval ? (
                            <>
                              <InfoItem label="Função:" value={selectedEvaluation.funcao || '-'} />
                              <InfoItem label="Turno Principal:" value={selectedEvaluation.turnoPrincipal || '-'} />
                              <InfoItem label="Equipe/Setor:" value={selectedEvaluation.equipeSetor || '-'} />
                            </>
                          ) : (
                            <>
                              <InfoItem label="Turno:" value={selectedEvaluation.turno} />
                              <InfoItem label="Setor:" value={selectedEvaluation.setor} />
                              {selectedEvaluation.matricula && (
                                <InfoItem label="Matrícula:" value={selectedEvaluation.matricula} />
                              )}
                              {selectedEvaluation.vt && (
                                <InfoItem label="Viatura:" value={selectedEvaluation.vt} />
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 sm:mb-8">
                    <h4 className="text-base sm:text-lg font-semibold text-brand-dark mb-3 sm:mb-4">Notas por Critério</h4>

                    {/* Cartões abaixo de md: o gráfico horizontal não tem espaço para os nomes dos critérios */}
                    {isBelowMd ? (
                      <ul className="space-y-3">
                        {summaryChartData.map((item, index) => (
                          <li key={index} className="rounded-lg bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 flex-1 text-sm font-medium text-gray-800 line-clamp-2 break-words">
                                {item.name}
                              </p>
                              <span className="flex-shrink-0 text-sm font-semibold text-brand-dark">
                                {item.Nota.toFixed(1)}
                              </span>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-gray-200" aria-hidden="true">
                              <div
                                className="h-2 rounded-full bg-brand-primary"
                                style={{ width: `${Math.min(100, Math.max(0, (item.Nota / MAX_SCORE) * 100))}%` }}
                              ></div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      /* Gráfico: altura proporcional ao número de critérios */
                      <div className="w-full" style={{ height: chartHeight }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              layout="vertical"
                              data={summaryChartData}
                              margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  type="number"
                                  domain={[0, 10]}
                                  ticks={[0, 2, 4, 6, 8, 10]}
                                  fontSize={12}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={yAxisWidth}
                                  tick={{
                                    fontSize: 11,
                                    textAnchor: 'end'
                                  }}
                                  interval={0}
                                  tickFormatter={(value: string) =>
                                    value.length > yAxisMaxChars ? value.substring(0, yAxisMaxChars - 3) + '...' : value
                                  }
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                                  labelFormatter={(label) => `Critério: ${label}`}
                                  formatter={(value: number) => [`${value.toFixed(1)}`, 'Nota']}
                                />
                                <Bar dataKey="Nota" fill={CHART_BAR_COLOR} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-brand-dark mb-3 sm:mb-4">Comentários do Instrutor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div className="min-w-0 bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Prós</h5>
                        <p className="text-gray-600 break-words whitespace-pre-wrap">{selectedEvaluation.pros || 'Nenhum pró registrado.'}</p>
                      </div>
                       <div className="min-w-0 bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Contras</h5>
                        <p className="text-gray-600 break-words whitespace-pre-wrap">{selectedEvaluation.contras || 'Nenhum contra registrado.'}</p>
                      </div>
                       <div className="min-w-0 bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Considerações Finais</h5>
                        <p className="text-gray-600 break-words whitespace-pre-wrap">{selectedEvaluation.consideracoes || 'Nenhuma consideração registrada.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 lg:hidden">{backToListButton}</div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-6 sm:p-8 h-full flex flex-col items-center justify-center text-center">
                  <Icon name="chart-bar" className="h-12 w-12 sm:h-16 sm:w-16 text-brand-primary mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Selecione uma Avaliação</h3>
                  <p className="text-gray-600 mt-2">Toque em uma das avaliações da lista para ver os detalhes completos.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : selectedDriver ? (
        <Card>
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <Icon name="alert-triangle" className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Nenhuma avaliação encontrada</h3>
              <p className="text-gray-600 mt-2 break-words">Não há dados de avaliação para o motorista {selectedDriver}.</p>
          </div>
        </Card>
      ) : null }
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Confirmar exclusão"
        message={
          deleteConfirm && (
            <>
              Tem certeza que deseja excluir a avaliação de <strong>{deleteConfirm.name}</strong> do dia <strong>{formatDate(deleteConfirm.date)}</strong>?
              <span className="mt-1 block font-medium text-red-600">Esta ação não pode ser desfeita.</span>
            </>
          )
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default DriverDashboard;
