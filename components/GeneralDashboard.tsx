
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Users, Building, FileSpreadsheet, Clock, Filter, X } from 'lucide-react';
import type { Evaluation, EvaluationTemplate } from '../types';
import { getEvaluations, getTemplates } from '../services/firebaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';

const GeneralDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados dos filtros
  const [filters, setFilters] = useState({
    filial: '',
    turno: '',
    templateId: '',
    dataInicio: '',
    dataFim: ''
  });

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
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aplicar filtros aos dados
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(evaluation => {
      // Excluir formulários puros (sem averageScore) - só incluir avaliações reais
      if (evaluation.averageScore === undefined || evaluation.averageScore === null) return false;
      
      // Filtro por filial
      if (filters.filial && evaluation.filial !== filters.filial) return false;
      
      // Filtro por turno
      if (filters.turno && evaluation.turno !== filters.turno) return false;
      
      // Filtro por modelo de checklist
      if (filters.templateId && evaluation.templateId !== filters.templateId) return false;
      
      // Filtro por intervalo de data
      if (filters.dataInicio && evaluation.data < filters.dataInicio) return false;
      if (filters.dataFim && evaluation.data > filters.dataFim) return false;
      
      return true;
    });
  }, [evaluations, filters]);

  // Opções para os filtros
  const filiais = useMemo(() => [...new Set(evaluations.map(e => e.filial))], [evaluations]);
  const turnos = useMemo(() => [...new Set(evaluations.map(e => e.turno))], [evaluations]);
  const templateOptions = useMemo(() => {
    const uniqueTemplates = evaluations.reduce((acc, e) => {
      acc[e.templateId] = e.templateName;
      return acc;
    }, {} as Record<string, string>);
    return Object.entries(uniqueTemplates).map(([id, name]) => ({ id, name }));
  }, [evaluations]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      filial: '',
      turno: '',
      templateId: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

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

  const analytics = useMemo(() => {
    if (filteredEvaluations.length === 0) return null;

    // KPIs
    const totalEvaluations = filteredEvaluations.length;
    const uniqueDrivers = new Set(filteredEvaluations.map(e => e.motorista)).size;
    const overallAverage = filteredEvaluations.reduce((sum, e) => sum + (e.averageScore || 0), 0) / totalEvaluations;

    // Criteria Analysis
    const criteriaStats: { [key: string]: { totalScore: number; count: number; templateId: string } } = {};
    filteredEvaluations.forEach(evaluation => {
      Object.entries(evaluation.scores).forEach(([criterion, score]) => {
        if (!criteriaStats[criterion]) {
          criteriaStats[criterion] = { totalScore: 0, count: 0, templateId: evaluation.templateId };
        }
        criteriaStats[criterion].totalScore += score;
        criteriaStats[criterion].count++;
      });
    });

    // Top 5 e Bottom 5 critérios - agora com nomes corretos
    const criteriaAverages = Object.entries(criteriaStats).map(([criterion, stats]) => ({
      name: getCriterionName(criterion, stats.templateId),
      Média: stats.totalScore / stats.count
    })).sort((a, b) => b.Média - a.Média);

    const top5Criteria = criteriaAverages.slice(0, 5);
    const bottom5Criteria = criteriaAverages.slice(-5).reverse();

    // Performance by Branch
    const branchStats: { [key: string]: { totalScore: number; count: number } } = {};
    filteredEvaluations.forEach(evaluation => {
      if (!branchStats[evaluation.filial]) {
        branchStats[evaluation.filial] = { totalScore: 0, count: 0 };
      }
      branchStats[evaluation.filial].totalScore += (evaluation.averageScore || 0);
      branchStats[evaluation.filial].count++;
    });

    const performanceByBranch = Object.entries(branchStats).map(([branch, stats]) => ({
      name: branch,
      Média: stats.totalScore / stats.count
    }));

    // Performance by Shift
    const shiftStats: { [key: string]: { totalScore: number; count: number } } = {};
    filteredEvaluations.forEach(evaluation => {
      if (!shiftStats[evaluation.turno]) {
        shiftStats[evaluation.turno] = { totalScore: 0, count: 0 };
      }
      shiftStats[evaluation.turno].totalScore += (evaluation.averageScore || 0);
      shiftStats[evaluation.turno].count++;
    });

    const performanceByShift = Object.entries(shiftStats).map(([shift, stats]) => ({
      name: shift,
      value: stats.totalScore / stats.count
    }));

    return {
      totalEvaluations,
      uniqueDrivers,
      overallAverage,
      top5Criteria,
      bottom5Criteria,
      performanceByBranch,
      performanceByShift,
    };
  }, [filteredEvaluations, templates]);
  
  const PIE_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  const renderChart = (title: string, data: any[], barKey: string, fillColor: string, icon: React.ReactNode) => (
    <Card>
        <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-brand-dark mb-3 sm:mb-4 flex items-center gap-2">{icon}{title}</h3>
            <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" domain={[0, 10]} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} interval={0} />
                        <Tooltip formatter={(value: number) => value.toFixed(2)} contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
                        <Bar dataKey={barKey} fill={fillColor} background={{ fill: '#eee' }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        <p className="ml-4 text-lg text-gray-600">Analisando dados...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Nenhuma Avaliação Encontrada</h3>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Ainda não há dados para analisar. Comece preenchendo o formulário de avaliação.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header com Filtros */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-dark">Dashboard Geral</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters} 
                variant="secondary" 
                className="!py-2 !px-3 text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Limpar Filtros</span>
                <span className="sm:hidden">Limpar</span>
              </Button>
            )}
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              variant={showFilters ? "primary" : "secondary"}
              className="!py-2 !px-3 text-xs sm:text-sm"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Filtros</span>
              <span className="sm:hidden">Filtros</span>
            </Button>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-brand-dark mb-3 sm:mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-brand-primary" />
                Filtros de Análise
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <Select
                  label="Filial"
                  value={filters.filial}
                  onChange={(e) => handleFilterChange('filial', e.target.value)}
                >
                  <option value="">Todas as filiais</option>
                  {filiais.map(filial => (
                    <option key={filial} value={filial}>{filial}</option>
                  ))}
                </Select>

                <Select
                  label="Turno"
                  value={filters.turno}
                  onChange={(e) => handleFilterChange('turno', e.target.value)}
                >
                  <option value="">Todos os turnos</option>
                  {turnos.map(turno => (
                    <option key={turno} value={turno}>{turno}</option>
                  ))}
                </Select>

                <Select
                  label="Modelo de Checklist"
                  value={filters.templateId}
                  onChange={(e) => handleFilterChange('templateId', e.target.value)}
                >
                  <option value="">Todos os modelos</option>
                  {templateOptions.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </Select>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filters.dataInicio}
                    onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                    className="block w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filters.dataFim}
                    onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                    className="block w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent text-xs sm:text-sm"
                  />
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-3 sm:mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs sm:text-sm text-blue-700">
                    <strong>Filtros ativos:</strong> 
                    {filters.filial && ` Filial: ${filters.filial}`}
                    {filters.turno && ` Turno: ${filters.turno}`}
                    {filters.templateId && ` Modelo: ${templateOptions.find(t => t.id === filters.templateId)?.name}`}
                    {filters.dataInicio && ` De: ${filters.dataInicio}`}
                    {filters.dataFim && ` Até: ${filters.dataFim}`}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <FileSpreadsheet className="h-6 w-6 sm:h-8 sm:w-8 text-brand-primary" />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Total de Avaliações</p>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-dark">{analytics.totalEvaluations}</p>
                </div>
            </Card>
            <Card className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                 <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                   <Users className="h-6 w-6 sm:h-8 sm:w-8 text-brand-primary" />
                 </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Motoristas Avaliados</p>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-dark">{analytics.uniqueDrivers}</p>
                </div>
            </Card>
            <Card className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                 <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                   <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-brand-primary" />
                 </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Média Geral</p>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-dark">{analytics.overallAverage.toFixed(2)}</p>
                </div>
            </Card>
        </div>

        {/* Criteria Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {renderChart('Top 5 Critérios (Maiores Médias)', analytics.top5Criteria, 'Média', '#16A34A', <TrendingUp className="text-green-600"/>)}
            {renderChart('Top 5 Critérios (Menores Médias)', analytics.bottom5Criteria, 'Média', '#DC2626', <TrendingDown className="text-red-600"/>)}
        </div>

        {/* Performance by Branch and Shift */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
                <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-brand-dark mb-3 sm:mb-4 flex items-center gap-2">
                      <Building className="text-brand-primary" />
                      Desempenho por Filial
                    </h3>
                    <div className="h-64 sm:h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.performanceByBranch} margin={{ top: 5, right: 20, left: 5, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 10]}/>
                                <Tooltip formatter={(value: number) => value.toFixed(2)} contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
                                <Bar dataKey="Média" fill="#1E40AF" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>
             <Card>
                <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-brand-dark mb-3 sm:mb-4 flex items-center gap-2">
                      <Clock className="text-brand-primary" />
                      Desempenho por Turno
                    </h3>
                     <div className="h-64 sm:h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics.performanceByShift} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${(value || 0).toFixed(2)}`}>
                                     {analytics.performanceByShift.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
};

export default GeneralDashboard;
