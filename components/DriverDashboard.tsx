
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, BarChartHorizontal, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import type { Evaluation } from '../types';
import { getEvaluations } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import Card from './ui/Card';
import Select from './ui/Select';
import Button from './ui/Button';

const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const DriverDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getEvaluations();
      setEvaluations(data);
      if (data.length > 0) {
        const uniqueDrivers = [...new Set(data.map(e => e.motorista))];
        if (uniqueDrivers.length > 0) {
          setSelectedDriver(data[0].motorista);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const drivers = useMemo(() => {
    return [...new Set(evaluations.map(e => e.motorista))];
  }, [evaluations]);

  const driverEvaluations = useMemo(() => {
    if (!selectedDriver) return [];
    return evaluations.filter(e => e.motorista === selectedDriver);
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
  
  const renderAverageStatus = (score: number) => {
    if (score > 7) {
      return <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-6 w-6" /> <span className="font-bold text-lg">Aprovado ({score.toFixed(2)})</span></div>;
    }
    if (score >= 6) {
      return <div className="flex items-center gap-2 text-yellow-500"><Clock className="h-6 w-6" /> <span className="font-bold text-lg">Reavaliar ({score.toFixed(2)})</span></div>;
    }
    return <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-6 w-6" /> <span className="font-bold text-lg">Reprovado ({score.toFixed(2)})</span></div>;
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          <div className="xl:col-span-1 space-y-4">
            <h3 className="text-xl font-bold text-brand-dark px-1">Avaliações de {selectedDriver}</h3>
            <div className="max-h-[75vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {driverEvaluations.map(evaluation => (
                <Card 
                  key={evaluation.id}
                  onClick={() => setSelectedEvaluation(evaluation)}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedEvaluation?.id === evaluation.id 
                      ? 'border-2 border-brand-primary shadow-xl' 
                      : 'border border-gray-200 hover:shadow-lg hover:border-brand-accent'
                  }`}
                >
                  <div className="p-4">
                      <div className="flex justify-between items-center">
                          <div>
                              <p className="font-semibold text-gray-800">Data: {formatDate(evaluation.data)}</p>
                              <p className="text-sm text-gray-500">VT: {evaluation.vt}</p>
                          </div>
                          <div className="text-right">
                              <span className="font-bold text-lg text-brand-primary">{evaluation.averageScore.toFixed(2)}</span>
                              <p className="text-sm text-gray-500">Média</p>
                          </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Modelo: {evaluation.templateName}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="xl:col-span-2">
            {selectedEvaluation ? (
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

                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-brand-dark mb-4">Notas por Critério</h4>
                    <div className="h-[500px] w-full">
                      <ResponsiveContainer>
                          <BarChart layout="vertical" data={summaryChartData} margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                              <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 12}} interval={0} />
                              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}/>
                              <Legend />
                              <Bar dataKey="Nota" fill="#3B82F6" />
                          </BarChart>
                      </ResponsiveContainer>
                    </div>
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
  );
};

export default DriverDashboard;
