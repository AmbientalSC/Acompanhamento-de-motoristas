
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Loader2, FileText } from 'lucide-react';
import type { Evaluation, EvaluationTemplate } from '../types';
import { saveEvaluation, getTemplates, getBranches } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import RatingSlider from './RatingSlider';
import DynamicField from './ui/DynamicField';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Select from './ui/Select';

const getInitialState = (): Omit<Evaluation, 'id' | 'timestamp' | 'scores' | 'templateId' | 'templateName'> => ({
    matricula: '',
    setor: '',
    turno: '',
    filial: '',
    motorista: '',
    data: new Date().toISOString().split('T')[0],
    vt: '',
    fieldValues: {},
    pros: '',
    contras: '',
    consideracoes: '',
});

const EvaluationForm: React.FC = () => {
  const [formStep, setFormStep] = useState(1); // 1: seleção de modelo, 2: preenchimento
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  const [formData, setFormData] = useState(getInitialState());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSavedEvaluation, setLastSavedEvaluation] = useState<Evaluation | null>(null);

  // Filiais ordenadas alfabeticamente
  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [branches]);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const fetchedTemplates = await getTemplates();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Falha ao carregar modelos:", error);
        alert("Não foi possível carregar os modelos de avaliação.");
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    const loadBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const fetchedBranches = await getBranches();
        setBranches(fetchedBranches);
      } catch (error) {
        console.error("Falha ao carregar filiais:", error);
        alert("Não foi possível carregar as filiais.");
      } finally {
        setIsLoadingBranches(false);
      }
    };

    loadTemplates();
    loadBranches();
  }, []);

  const handleTemplateSelection = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      if (template.criteriaConfig) {
        // Nova estrutura com tipos de campo
        const initialScores: Record<string, number> = {};
        const initialFieldValues: Record<string, any> = {};
        
        template.criteriaConfig.forEach(criterion => {
          if (criterion.type === 'rating') {
            initialScores[criterion.id] = 5;
          } else if (criterion.type === 'checkbox') {
            initialFieldValues[criterion.id] = false;
          } else {
            initialFieldValues[criterion.id] = '';
          }
        });
        
        setScores(initialScores);
        setFieldValues(initialFieldValues);
      } else {
        // Compatibilidade com templates antigos
        const initialScores = template.criteria.reduce((acc, criterion) => {
          acc[criterion] = 5;
          return acc;
        }, {} as Record<string, number>);
        
        setScores(initialScores);
        setFieldValues({});
      }
      
      setFormStep(2);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScoreChange = useCallback((criterion: string, value: number) => {
    setScores(prev => ({ ...prev, [criterion]: value }));
  }, []);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    console.log(`EvaluationForm handleFieldChange [${fieldId}] setting value:`, value);
    console.log('Current fieldValues before change:', fieldValues);
    setFieldValues(prev => {
      const newValues = { ...prev, [fieldId]: value };
      console.log('New fieldValues after change:', newValues);
      return newValues;
    });
  }, [fieldValues]);

  const averageScore = useMemo(() => {
    if (!selectedTemplate) return 0;
    
    // Se o template não inclui cabeçalho, não deve ter averageScore
    if (selectedTemplate.includeHeader === false) return undefined;
    
    let ratingFieldsCount: number;
    if (selectedTemplate.criteriaConfig) {
      // Contar apenas campos do tipo 'rating'
      ratingFieldsCount = selectedTemplate.criteriaConfig.filter(c => c.type === 'rating').length;
    } else {
      // Compatibilidade com templates antigos (todos eram rating)
      ratingFieldsCount = selectedTemplate.criteria.length;
    }
    
    if (ratingFieldsCount === 0) return 0;
    
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const average = total / ratingFieldsCount;
    return isNaN(average) ? 0 : average;
  }, [scores, selectedTemplate]);

  const resetForm = () => {
    setFormData(getInitialState());
    setScores({});
    setFieldValues({});
    setSelectedTemplate(null);
    setFormStep(1);
    setLastSavedEvaluation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setIsSaving(true);
    
    console.log('Iniciando submit do formulário');
    console.log('Template selecionado:', selectedTemplate);
    console.log('Dados do formulário:', formData);
    console.log('Scores:', scores);
    console.log('Field values:', fieldValues);
    
    const evaluationToSave = {
        ...formData,
        scores,
        fieldValues,
        averageScore: selectedTemplate.includeHeader === false ? undefined : averageScore,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        // Para formulários sem cabeçalho, garantir que motorista seja uma string descritiva
        motorista: selectedTemplate.includeHeader === false ? 
                   `Formulário ${selectedTemplate.name}` : 
                   formData.motorista,
    };

    console.log('Dados que serão salvos:', evaluationToSave);

    try {
      await saveEvaluation(evaluationToSave);
      
      // Criar objeto de avaliação completo para o PDF
      const completeEvaluation: Evaluation = {
        id: Date.now().toString(), // ID temporário
        timestamp: Date.now(),
        ...evaluationToSave,
      };
      
      setLastSavedEvaluation(completeEvaluation);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      resetForm();
    } catch (error) {
      console.error("Falha ao salvar avaliação:", error);
      alert("Falha ao salvar a avaliação. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!lastSavedEvaluation) {
      alert('Nenhuma avaliação salva recentemente para gerar PDF.');
      return;
    }

    try {
      await PDFService.generateEvaluationPDF(lastSavedEvaluation);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };
  
  const renderAverageStatus = () => {
    const score = averageScore;
    
    // Se não há score (formulário sem cabeçalho), não renderiza nada
    if (score === undefined || score === null) {
      return null;
    }
    
    let statusText: string;
    let statusColor: string;

    if (score > 7) {
      statusText = 'Aprovado';
      statusColor = 'text-green-600';
    } else if (score >= 6) { 
      statusText = 'Reavaliar';
      statusColor = 'text-yellow-500';
    } else {
      statusText = 'Reprovado';
      statusColor = 'text-red-600';
    }
    return (
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${statusColor}`}>{statusText}</span>
        <span className="text-xl font-medium text-gray-500">({score.toFixed(2)})</span>
      </div>
    );
  };

  if (isLoadingTemplates || isLoadingBranches) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-brand-primary" /><p className="ml-4 text-lg text-gray-600">Carregando dados...</p></div>;
  }

  if (formStep === 1) {
    return (
      <Card>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-brand-dark mb-2">Iniciar Nova Avaliação</h2>
          <p className="text-gray-600 mb-6">Selecione o modelo de formulário que deseja utilizar.</p>
          {templates.length > 0 ? (
            <div className="max-w-md mx-auto">
              <Select
                label="Modelo de Avaliação"
                name="template"
                onChange={(e) => handleTemplateSelection(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Escolha um modelo...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="text-center p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-700">
                <p className="font-bold">Nenhum Modelo Encontrado</p>
                <p>Por favor, crie um modelo na aba "Gerenciar Modelos" antes de iniciar uma avaliação.</p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-brand-dark">Modelo: <span className="text-brand-primary">{selectedTemplate?.name}</span></h2>
            <Button type="button" onClick={() => setFormStep(1)} variant="secondary" className="!py-1 !px-3 text-sm">
                Trocar Modelo
            </Button>
        </div>
        {selectedTemplate?.includeHeader === true && (
          <div className="p-6">
            <h3 className="text-xl font-bold text-brand-dark mb-6">Cabeçalho da Avaliação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Input label="Matrícula" name="matricula" value={formData.matricula} onChange={handleInputChange} />
              <Input label="Motorista" name="motorista" value={formData.motorista} onChange={handleInputChange} required />
              <Input label="Setor Acompanhado" name="setor" value={formData.setor} onChange={handleInputChange} />
              <Input label="VT (Veículo)" name="vt" value={formData.vt} onChange={handleInputChange} required />
              <Select
                label="Turno"
                name="turno"
                value={formData.turno}
                onChange={handleInputChange}
              >
                <option value="">Selecione o turno</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </Select>
              <Select
                label="Filial"
                name="filial"
                value={formData.filial}
                onChange={handleInputChange}
                required
                disabled={isLoadingBranches}
              >
                <option value="">Selecione a filial</option>
                {sortedBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </Select>
              <Input label="Data do Acompanhamento" name="data" type="date" value={formData.data} onChange={handleInputChange} required />
            </div>
          </div>
        )}
      </Card>
      
      {selectedTemplate && ((selectedTemplate.criteriaConfig && selectedTemplate.criteriaConfig.length > 0) || (selectedTemplate.criteria && selectedTemplate.criteria.length > 0)) && (
          <Card className="mt-6">
            <div className="p-6">
              <h3 className="text-xl font-bold text-brand-dark mb-6">Critérios de Avaliação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {selectedTemplate.criteriaConfig ? (
                  selectedTemplate.criteriaConfig.map(criterion => (
                    <DynamicField
                      key={criterion.id}
                      criterion={criterion}
                      value={criterion.type === 'rating' ? (scores[criterion.id] ?? 5) : (fieldValues[criterion.id] ?? (criterion.type === 'checkbox' ? false : ''))}
                      onChange={(value) => {
                        if (criterion.type === 'rating') {
                          handleScoreChange(criterion.id, value);
                        } else {
                          handleFieldChange(criterion.id, value);
                        }
                      }}
                    />
                  ))
                ) : (
                  // Compatibilidade com templates antigos
                  selectedTemplate.criteria.map(criterion => (
                    <RatingSlider
                      key={criterion}
                      label={criterion}
                      value={scores[criterion] ?? 5}
                      onChange={(value) => handleScoreChange(criterion, value)}
                    />
                  ))
                )}
              </div>
            </div>
          </Card>
      )}

      {selectedTemplate?.includeFinalConsiderations === true && (
        <Card className="mt-6">
          <div className="p-6">
            <h3 className="text-xl font-bold text-brand-dark mb-6">Considerações Finais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Textarea label="Prós em relação a condução apresentada?" name="pros" value={formData.pros} onChange={handleInputChange} rows={4} />
              <Textarea label="Contras em relação a condução apresentada?" name="contras" value={formData.contras} onChange={handleInputChange} rows={4} />
              <Textarea label="Considerações finais do instrutor" name="consideracoes" value={formData.consideracoes} onChange={handleInputChange} rows={4} />
            </div>
          </div>
        </Card>
      )}

      {selectedTemplate?.includeHeader === true && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="text-lg font-medium text-gray-600">Média Geral do Motorista:</span>
            {renderAverageStatus()}
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button type="button" onClick={resetForm} variant="secondary" className="w-full md:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          </div>
        </div>
      )}

      {selectedTemplate?.includeHeader === false && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md flex justify-end gap-4">
          <Button type="button" onClick={resetForm} variant="secondary">
            <RotateCcw className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? 'Salvando...' : 'Enviar Formulário'}
          </Button>
        </div>
      )}

      {/* Fallback para templates antigos sem configuração definida */}
      {selectedTemplate && selectedTemplate.includeHeader !== true && selectedTemplate.includeHeader !== false && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md flex justify-end gap-4">
          <Button type="button" onClick={resetForm} variant="secondary">
            <RotateCcw className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white py-3 px-5 rounded-lg shadow-xl animate-bounce">
          <div className="flex items-center gap-2">
            <span>Avaliação salva com sucesso!</span>
            <Button 
              onClick={handleGeneratePDF} 
              variant="secondary" 
              className="!bg-white !text-green-600 hover:!bg-gray-100 !py-1 !px-3 text-sm"
            >
              <FileText className="h-4 w-4 mr-1" />
              Gerar PDF
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};

export default EvaluationForm;
