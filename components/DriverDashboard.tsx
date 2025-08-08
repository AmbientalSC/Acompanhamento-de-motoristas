
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, BarChartHorizontal, CheckCircle, AlertCircle, Clock, FileText, ClipboardList, Trash2 } from 'lucide-react';
import type { Evaluation } from '../types';
import { getEvaluations, deleteEvaluation } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import { getEvaluationStatus } from '../utils/evaluationUtils';
import Card from './ui/Card';
import Select from './ui/Select';
import Button from './ui/Button';
import FormsViewer from './FormsViewer';

type ViewMode = 'evaluations' | 'forms';

const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Hook personalizado para detectar mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

// Hook para detectar telas extra pequenas
const useIsExtraSmall = () => {
  const [isExtraSmall, setIsExtraSmall] = useState(false);

  useEffect(() => {
    const checkIsExtraSmall = () => {
      setIsExtraSmall(window.innerWidth < 480);
    };

    checkIsExtraSmall();
    window.addEventListener('resize', checkIsExtraSmall);
    return () => window.removeEventListener('resize', checkIsExtraSmall);
  }, []);

  return isExtraSmall;
};

const DriverDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('evaluations');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; date: string } | null>(null);
  const isMobile = useIsMobile();
  const isExtraSmall = useIsExtraSmall();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getEvaluations();
      setEvaluations(data);
      if (data.length > 0) {
        // Filtrar apenas avaliações verdadeiras para definir o motorista padrão
        const realEvaluations = data.filter(e => 
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
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleDeleteClick = (evaluationId: string, driverName: string, date: string) => {
    setDeleteConfirm({ id: evaluationId, name: driverName, date });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
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
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
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
    return [...new Set(realEvaluations.map(e => e.motorista))];
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

  const summaryChartData = useMemo(() => {
    if (!selectedEvaluation?.scores) return [];
    return Object.entries(selectedEvaluation.scores).map(([criterion, score]) => ({
      name: criterion,
      Nota: score,
    }));
  }, [selectedEvaluation]);

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
  
  const renderAverageStatus = (score: number | undefined) => {
    if (score === undefined || score === null) return null;
    
    if (score > 7) {
      return <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-6 w-6" /> <span className="font-bold text-lg">Aprovado ({score.toFixed(2)})</span></div>;
    }
    if (score >= 6) {
      return <div className="flex items-center gap-2 text-yellow-500"><Clock className="h-6 w-6" /> <span className="font-bold text-lg">Reavaliar ({score.toFixed(2)})</span></div>;
    }
    return <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-6 w-6" /> <span className="font-bold text-lg">Reprovado ({score.toFixed(2)})</span></div>;
  };

  const renderStatusBadge = (score: number | undefined) => {
    if (score === undefined || score === null) return null;
    
    const status = getEvaluationStatus(score);
    const IconComponent = status.icon === 'CheckCircle' ? CheckCircle : 
                         status.icon === 'Clock' ? Clock : AlertCircle;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
        <IconComponent className="h-3 w-3" />
        {status.label}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        <p className="ml-4 text-lg text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  if (evaluations.length === 0 && !isLoading) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Nenhuma Avaliação Encontrada</h3>
            <p className="text-gray-500 mt-2">Ainda não há dados para exibir. Comece preenchendo o formulário de avaliação.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abas principais */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('evaluations')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'evaluations'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChartHorizontal className="h-4 w-4 mr-2 inline" />
            Análise por Motorista
          </button>
          <button
            onClick={() => setViewMode('forms')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'forms'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardList className="h-4 w-4 mr-2 inline" />
            Formulários Preenchidos
          </button>
        </nav>
      </div>

      {/* Conteúdo baseado na aba selecionada */}
      {viewMode === 'forms' ? (
        <FormsViewer />
      ) : (
        <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-brand-dark mb-4">Filtro de Visualização</h2>
              <Select
                label="Selecione o Motorista"
                value={selectedDriver}
                onChange={e => setSelectedDriver(e.target.value)}
              >
                <option value="" disabled>Selecione um motorista</option>
                {drivers.map(driver => (
                  <option key={driver} value={driver}>{driver}</option>
                ))}
              </Select>
            </div>
            {selectedDriver && driverEvaluations.length > 0 && (
              <Button
                onClick={handleGenerateDriverAnalysisPDF}
                variant="secondary"
                className="!py-2 !px-4 text-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Relatório Completo
              </Button>
            )}
          </div>
        </div>
      </Card>

      {selectedDriver && driverEvaluations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xl font-bold text-brand-dark px-1">Avaliações de {selectedDriver}</h3>
            <div className="max-h-[75vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {driverEvaluations.map(evaluation => (
                <Card 
                  key={evaluation.id}
                  onClick={() => setSelectedEvaluation(evaluation)}
                  className={`cursor-pointer transition-all duration-200 relative group ${
                    selectedEvaluation?.id === evaluation.id 
                      ? 'border-2 border-brand-primary shadow-xl' 
                      : 'border border-gray-200 hover:shadow-lg hover:border-brand-accent'
                  }`}
                >
                  <div className="p-4">
                      <div className="flex justify-between items-start">
                          <div className="flex-1">
                              <p className="font-semibold text-gray-800">Data: {formatDate(evaluation.data)}</p>
                              <p className="text-sm text-gray-500">VT: {evaluation.vt}</p>
                              <div className="mt-2">
                                {renderStatusBadge(evaluation.averageScore)}
                              </div>
                          </div>
                          <div className="text-right relative">
                              <span className="font-bold text-lg text-brand-primary">{evaluation.averageScore?.toFixed(2) || '0.00'}</span>
                              <p className="text-sm text-gray-500">Média</p>
                              {/* Botão de excluir - posicionado abaixo da nota */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Evita trigger do click do card
                                  handleDeleteClick(evaluation.id, evaluation.motorista, evaluation.data);
                                }}
                                className="absolute -bottom-8 right-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                title="Excluir avaliação"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                          </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Modelo: {evaluation.templateName}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-2">{selectedEvaluation ? (
              <Card>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-brand-dark">Detalhes da Avaliação ({formatDate(selectedEvaluation.data)})</h3>
                        <p className="text-sm text-gray-500">Usando modelo: {selectedEvaluation.templateName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {renderAverageStatus(selectedEvaluation.averageScore)}
                      <Button
                        onClick={handleGenerateEvaluationPDF}
                        variant="secondary"
                        className="!py-2 !px-3 text-sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {/* Informações do Cabeçalho da Avaliação */}
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Informações da Avaliação</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Motorista:</span>
                        <p className="font-medium text-gray-900">{selectedEvaluation.motorista}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Filial:</span>
                        <p className="font-medium text-gray-900">{selectedEvaluation.filial}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Turno:</span>
                        <p className="font-medium text-gray-900">{selectedEvaluation.turno}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Setor:</span>
                        <p className="font-medium text-gray-900">{selectedEvaluation.setor}</p>
                      </div>
                      {selectedEvaluation.matricula && (
                        <div>
                          <span className="text-gray-600">Matrícula:</span>
                          <p className="font-medium text-gray-900">{selectedEvaluation.matricula}</p>
                        </div>
                      )}
                      {selectedEvaluation.vt && (
                        <div>
                          <span className="text-gray-600">Viatura:</span>
                          <p className="font-medium text-gray-900">{selectedEvaluation.vt}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-brand-dark mb-4">Notas por Critério</h4>
                    
                    {/* Visualização em Cards para mobile muito pequeno */}
                    {isExtraSmall ? (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {summaryChartData.map((item, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-medium text-gray-700 truncate" title={item.name}>
                                {item.name}
                              </h5>
                            </div>
                            <div className="ml-3 flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${(item.Nota / 10) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                                {item.Nota.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Gráfico normal para desktop e mobile maior */
                      <div className="w-full h-[600px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              layout="vertical" 
                              data={summaryChartData} 
                              margin={{ 
                                top: 20, 
                                right: 30, 
                                left: isMobile ? 150 : 200, 
                                bottom: 20 
                              }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  type="number" 
                                  domain={[0, 10]} 
                                  ticks={[0, 2, 4, 6, 8, 10]}
                                  fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis 
                                  type="category" 
                                  dataKey="name" 
                                  width={isMobile ? 150 : 200}
                                  tick={{
                                    fontSize: isMobile ? 8 : 11, 
                                    textAnchor: 'end'
                                  }} 
                                  interval={0}
                                  tickFormatter={(value: string) => {
                                    // Truncar texto para caber sem scroll
                                    if (isMobile) {
                                      if (value.length > 18) {
                                        return value.substring(0, 15) + '...';
                                      }
                                    } else {
                                      if (value.length > 25) {
                                        return value.substring(0, 22) + '...';
                                      }
                                    }
                                    return value;
                                  }}
                                />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                                  labelFormatter={(label) => `Critério: ${label}`}
                                  formatter={(value: number) => [`${value.toFixed(1)}`, 'Nota']}
                                />
                                <Legend />
                                <Bar dataKey="Nota" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-brand-dark mb-4">Comentários do Instrutor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Prós</h5>
                        <p className="text-gray-600">{selectedEvaluation.pros || 'Nenhum pró registrado.'}</p>
                      </div>
                       <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Contras</h5>
                        <p className="text-gray-600">{selectedEvaluation.contras || 'Nenhum contra registrado.'}</p>
                      </div>
                       <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-800 mb-1">Considerações Finais</h5>
                        <p className="text-gray-600">{selectedEvaluation.consideracoes || 'Nenhuma consideração registrada.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-8 h-full flex flex-col items-center justify-center text-center">
                  <BarChartHorizontal className="h-16 w-16 text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700">Selecione uma Avaliação</h3>
                  <p className="text-gray-500 mt-2">Clique em uma das avaliações na lista à esquerda para ver os detalhes completos.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : selectedDriver ? (
        <Card>
          <div className="p-8 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">Nenhuma avaliação encontrada</h3>
              <p className="text-gray-500 mt-2">Não há dados de avaliação para o motorista {selectedDriver}.</p>
          </div>
        </Card>
      ) : null }
        </div>
      )}

      {/* Popup de confirmação personalizado */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a avaliação de <strong>{deleteConfirm.name}</strong> do dia <strong>{formatDate(deleteConfirm.date)}</strong>?
              <br />
              <span className="text-sm text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
