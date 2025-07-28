
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Users, Building, FileSpreadsheet, Clock, Filter, X } from 'lucide-react';
import type { Evaluation } from '../types';
import { getEvaluations } from '../services/firebaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';

const GeneralDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
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
      const data = await getEvaluations();
      setEvaluations(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Aplicar filtros aos dados
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(evaluation => {
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
  const templates = useMemo(() => {
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

  const analytics = useMemo(() => {
    if (filteredEvaluations.length === 0) return null;

    // KPIs
    const totalEvaluations = filteredEvaluations.length;
    const uniqueDrivers = new Set(filteredEvaluations.map(e => e.motorista)).size;
    const overallAverage = filteredEvaluations.reduce((sum, e) => sum + e.averageScore, 0) / totalEvaluations;

    // Criteria Analysis
    const criteriaStats: { [key: string]: { totalScore: number; count: number } } = {};
    filteredEvaluations.forEach(evaluation => {
      Object.entries(evaluation.scores).forEach(([criterion, score]) => {
        if (!criteriaStats[criterion]) {
          criteriaStats[criterion] = { totalScore: 0, count: 0 };
        }
        criteriaStats[criterion].totalScore += score;
        criteriaStats[criterion].count++;
      });
    });

    const criteriaAverages = Object.entries(criteriaStats).map(([name, data]) => ({
      name,
      Média: parseFloat((data.totalScore / data.count).toFixed(2)),
    })).sort((a, b) => a.Média - b.Média);

    const top5Criteria = [...criteriaAverages].sort((a,b) => b.Média - a.Média).slice(0, 5);
    const bottom5Criteria = criteriaAverages.slice(0, 5);

    // Performance by Branch (Filial)
    const branchStats: { [key: string]: { totalScore: number; count: number } } = {};
    filteredEvaluations.forEach(e => {
        if (!branchStats[e.filial]) branchStats[e.filial] = { totalScore: 0, count: 0 };
        branchStats[e.filial].totalScore += e.averageScore;
        branchStats[e.filial].count++;
    });
    const performanceByBranch = Object.entries(branchStats).map(([name, data]) => ({
        name,
        Média: parseFloat((data.totalScore / data.count).toFixed(2)),
    }));

    // Performance by Shift (Turno)
    const shiftStats: { [key: string]: { totalScore: number; count: number } } = {};
    filteredEvaluations.forEach(e => {
        if (!shiftStats[e.turno]) shiftStats[e.turno] = { totalScore: 0, count: 0 };
        shiftStats[e.turno].totalScore += e.averageScore;
        shiftStats[e.turno].count++;
    });
    const performanceByShift = Object.entries(shiftStats).map(([name, data]) => ({
        name,
        value: parseFloat((data.totalScore / data.count).toFixed(2)),
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
  }, [filteredEvaluations]);
  
  const PIE_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  const renderChart = (title: string, data: any[], barKey: string, fillColor: string, icon: React.ReactNode) => (
    <Card>
        <div className="p-6">
            <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">{icon}{title}</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" domain={[0, 10]} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} interval={0} />
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
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Nenhuma Avaliação Encontrada</h3>
            <p className="text-gray-500 mt-2">Ainda não há dados para analisar. Comece preenchendo o formulário de avaliação.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header com Filtros */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-brand-dark">Dashboard Geral</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters} 
                variant="secondary" 
                className="!py-2 !px-3 text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            )}
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              variant={showFilters ? "primary" : "secondary"}
              className="!py-2 !px-3 text-sm"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-brand-dark mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-brand-primary" />
                Filtros de Análise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </Select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filters.dataInicio}
                    onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filters.dataFim}
                    onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                  />
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Filtros ativos:</strong> 
                    {filters.filial && ` Filial: ${filters.filial}`}
                    {filters.turno && ` Turno: ${filters.turno}`}
                    {filters.templateId && ` Modelo: ${templates.find(t => t.id === filters.templateId)?.name}`}
                    {filters.dataInicio && ` De: ${filters.dataInicio}`}
                    {filters.dataFim && ` Até: ${filters.dataFim}`}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full"><FileSpreadsheet className="h-8 w-8 text-brand-primary" /></div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Total de Avaliações</p>
                    <p className="text-3xl font-bold text-brand-dark">{analytics.totalEvaluations}</p>
                </div>
            </Card>
            <Card className="p-6 flex items-center gap-4">
                 <div className="p-3 bg-blue-100 rounded-full"><Users className="h-8 w-8 text-brand-primary" /></div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Motoristas Avaliados</p>
                    <p className="text-3xl font-bold text-brand-dark">{analytics.uniqueDrivers}</p>
                </div>
            </Card>
            <Card className="p-6 flex items-center gap-4">
                 <div className="p-3 bg-blue-100 rounded-full"><TrendingUp className="h-8 w-8 text-brand-primary" /></div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Média Geral</p>
                    <p className="text-3xl font-bold text-brand-dark">{analytics.overallAverage.toFixed(2)}</p>
                </div>
            </Card>
        </div>

        {/* Criteria Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderChart('Top 5 Critérios (Maiores Médias)', analytics.top5Criteria, 'Média', '#16A34A', <TrendingUp className="text-green-600"/>)}
            {renderChart('Top 5 Critérios (Menores Médias)', analytics.bottom5Criteria, 'Média', '#DC2626', <TrendingDown className="text-red-600"/>)}
        </div>

        {/* Performance by Branch and Shift */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2"><Building className="text-brand-primary" />Desempenho por Filial</h3>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.performanceByBranch} margin={{ top: 5, right: 20, left: 5, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 10]}/>
                                <Tooltip formatter={(value: number) => value.toFixed(2)} contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
                                <Bar dataKey="Média" fill="#1E40AF" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>
             <Card>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2"><Clock className="text-brand-primary" />Desempenho por Turno</h3>
                     <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics.performanceByShift} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value.toFixed(2)}`}>
                                     {analytics.performanceByShift.map((entry, index) => (
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
