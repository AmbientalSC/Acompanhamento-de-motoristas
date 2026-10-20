
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import type { Evaluation, EvaluationTemplate } from '../types';
import { saveEvaluation, getTemplates, getBranches } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import { gradeEvaluation } from '../utils/gradingUtils';
import RatingSlider from './RatingSlider';
import DynamicField from './ui/DynamicField';
import EvaluationResult from './EvaluationResult';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Select from './ui/Select';

const getInitialState = (): Omit<Evaluation, 'id' | 'timestamp' | 'scores' | 'templateId' | 'templateName'> & { nomeColaborador?: string; funcao?: string; turnoPrincipal?: string; equipeSetor?: string } => ({
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
    nomeColaborador: '',
    funcao: '',
    turnoPrincipal: '',
    equipeSetor: '',
});

const isRatingType = (type: string | undefined): boolean => type === 'rating' || type === 'rating-5';

// Campos de nota obrigatórios que ficaram sem resposta (chave = id do critério)
const getMissingRatingErrors = (
  template: EvaluationTemplate,
  scores: Record<string, number>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  template.criteriaConfig?.forEach(criterion => {
    if (criterion.required && isRatingType(criterion.type) && scores[criterion.id] === undefined) {
      errors[criterion.id] = 'Selecione uma nota para este campo.';
    }
  });
  return errors;
};

const EvaluationForm: React.FC = () => {
  const [formStep, setFormStep] = useState(1); // 1: seleção de modelo, 2: preenchimento, 3: resultado
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  const [formData, setFormData] = useState(getInitialState());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
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
        // Nova estrutura com tipos de campo. Notas (rating/rating-5) iniciam sem valor:
        // a ausência da chave em `scores` significa "sem nota".
        const initialFieldValues: Record<string, any> = {};

        template.criteriaConfig.forEach(criterion => {
          if (isRatingType(criterion.type)) {
            return;
          }
          initialFieldValues[criterion.id] = criterion.type === 'checkbox' ? false : '';
        });

        setFieldValues(initialFieldValues);
      } else {
        // Compatibilidade com templates antigos (todos os critérios são notas)
        setFieldValues({});
      }

      setScores({});
      setErrors({});
      setFormStep(2);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearError = useCallback((fieldId: string) => {
    setErrors(prev => {
      if (!(fieldId in prev)) return prev;
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // `null` = nota desmarcada: remove a chave em vez de gravar um valor
  const handleScoreChange = useCallback((criterion: string, value: number | null) => {
    setScores(prev => {
      if (value === null) {
        const { [criterion]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [criterion]: value };
    });
    clearError(criterion);
  }, [clearError]);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  // Média apenas das notas respondidas; sem nenhuma nota respondida não há média.
  const averageScore = useMemo(() => {
    if (!selectedTemplate) return 0;

    // Se o template não tem cabeçalho, não deve ter averageScore
    if (!selectedTemplate.headerType) return undefined;

    const answeredScores = Object.values(scores);
    if (answeredScores.length === 0) return undefined;

    const total = answeredScores.reduce((sum, score) => sum + score, 0);
    return total / answeredScores.length;
  }, [scores, selectedTemplate]);

  const resetForm = () => {
    setFormData(getInitialState());
    setScores({});
    setFieldValues({});
    setErrors({});
    setSelectedTemplate(null);
    setFormStep(1);
    setLastSavedEvaluation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const missingRatings = getMissingRatingErrors(selectedTemplate, scores);
    const firstMissingId = Object.keys(missingRatings)[0];
    if (firstMissingId) {
      setErrors(missingRatings);
      document.getElementById(`field-${firstMissingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSaving(true);

    // Correção pelo gabarito: usa as respostas ainda indexadas pelo id do critério
    const grading = gradeEvaluation(selectedTemplate, fieldValues);

    // Converter IDs dos campos em nomes legíveis para salvar no Firebase
    const fieldValuesWithNames: Record<string, any> = {};
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      const criterion = selectedTemplate.criteriaConfig?.find(c => c.id === fieldId);
      const fieldName = criterion ? criterion.name : fieldId;
      fieldValuesWithNames[fieldName] = value;
    });
    
    const hasHeader = selectedTemplate.headerType !== undefined;
    const isRhHeader = selectedTemplate.headerType === 'rh';
    
    const evaluationToSave: any = {
        ...formData,
        scores,
        fieldValues: fieldValuesWithNames,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        motorista: !hasHeader ? 
                   `Formulário ${selectedTemplate.name}` : 
                   (isRhHeader ? formData.nomeColaborador || '' : formData.motorista),
    };

    if (isRhHeader) {
      evaluationToSave.nomeColaborador = formData.nomeColaborador || '';
      evaluationToSave.funcao = formData.funcao || '';
      evaluationToSave.turnoPrincipal = formData.turnoPrincipal || '';
      evaluationToSave.equipeSetor = formData.equipeSetor || '';
    }

    // Só adicionar averageScore se o template incluir cabeçalho E houver notas respondidas
    if (hasHeader && averageScore !== undefined && averageScore !== null) {
      evaluationToSave.averageScore = averageScore;
    }

    if (grading) {
      evaluationToSave.grading = grading;
    }

    // Propagar a escala do template para uso nos dashboards
    if (isPureRating5) {
      evaluationToSave.ratingScale = '1-5';
    } else {
      evaluationToSave.ratingScale = '0-10';
    }

    try {
      const savedId = await saveEvaluation(evaluationToSave);

      // Criar objeto de avaliação completo para a tela de resultado e o PDF
      const completeEvaluation: Evaluation = {
        ...evaluationToSave,
        id: savedId,
        timestamp: Date.now(),
      };

      setLastSavedEvaluation(completeEvaluation);
      setFormStep(3);
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
  
  // Determina se o template usa apenas escala 1-5 (para thresholds adaptativos)
  const isPureRating5 = useMemo(() => {
    if (!selectedTemplate?.criteriaConfig) return false;
    const ratingFields = selectedTemplate.criteriaConfig.filter(
      c => c.type === 'rating' || c.type === 'rating-5'
    );
    return ratingFields.length > 0 && ratingFields.every(c => c.type === 'rating-5');
  }, [selectedTemplate]);

  const renderAverageStatus = () => {
    const score = averageScore;
    
    // Sem notas respondidas não há média para classificar
    if (score === undefined || score === null) {
      return <span className="text-xl font-medium text-gray-400">—</span>;
    }
    
    let statusText: string;
    let statusColor: string;

    if (isPureRating5) {
      if (score >= 3) {
        statusText = 'Aprovado';
        statusColor = 'text-green-600';
      } else {
        statusText = 'Reprovado';
        statusColor = 'text-red-600';
      }
    } else {
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

  if (formStep === 3 && lastSavedEvaluation) {
    return (
      <EvaluationResult
        evaluation={lastSavedEvaluation}
        onGeneratePDF={handleGeneratePDF}
        onNewEvaluation={resetForm}
      />
    );
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
        {selectedTemplate?.headerType === 'evaluation' && (
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
        {selectedTemplate?.headerType === 'rh' && (
          <div className="p-6">
            <h3 className="text-xl font-bold text-brand-dark mb-6">Cabeçalho de RH</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input label="Nome do Colaborador" name="nomeColaborador" value={formData.nomeColaborador || ''} onChange={handleInputChange} required />
              <Input label="Função" name="funcao" value={formData.funcao || ''} onChange={handleInputChange} />
              <Select
                label="Turno Principal"
                name="turnoPrincipal"
                value={formData.turnoPrincipal || ''}
                onChange={handleInputChange}
              >
                <option value="">Selecione o turno</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </Select>
              <Input label="Equipe/Setor" name="equipeSetor" value={formData.equipeSetor || ''} onChange={handleInputChange} />
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
              <Input label="Data" name="data" type="date" value={formData.data} onChange={handleInputChange} required />
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
                  selectedTemplate.criteriaConfig.map(criterion => {
                    const fieldValue = isRatingType(criterion.type)
                      ? scores[criterion.id]
                      : (fieldValues[criterion.id] ?? (criterion.type === 'checkbox' ? false : ''));

                    return (
                      <DynamicField
                        key={criterion.id}
                        criterion={criterion}
                        value={fieldValue}
                        error={errors[criterion.id]}
                        onChange={(value) => {
                          if (isRatingType(criterion.type)) {
                            handleScoreChange(criterion.id, value);
                          } else {
                            handleFieldChange(criterion.id, value);
                          }
                        }}
                      />
                    );
                  })
                ) : (
                  // Compatibilidade com templates antigos
                  selectedTemplate.criteria.map(criterion => (
                    <RatingSlider
                      key={criterion}
                      label={criterion}
                      value={scores[criterion]}
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

      {(selectedTemplate?.headerType === 'evaluation' || selectedTemplate?.headerType === 'rh') && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="text-lg font-medium text-gray-600">
              {selectedTemplate.headerType === 'rh' ? 'Média Geral do Colaborador:' : 'Média Geral do Motorista:'}
            </span>
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

      {selectedTemplate && !selectedTemplate.headerType && selectedTemplate.includeHeader === false && (
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
      {selectedTemplate && !selectedTemplate.headerType && selectedTemplate.includeHeader !== true && selectedTemplate.includeHeader !== false && (
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

    </form>
  );
};

export default EvaluationForm;
