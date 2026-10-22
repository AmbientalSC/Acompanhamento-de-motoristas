
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Icon from './ui/Icon';
import type { Evaluation, EvaluationTemplate } from '../types';
import { saveEvaluation, getTemplates, getBranches } from '../services/firebaseService';
import { PDFService, describeMissingPdfImages } from '../services/pdfService';
import { gradeEvaluation } from '../utils/gradingUtils';
import { normalizePersonName } from '../utils/nameUtils';
import { applyPhoneMask } from '../utils/mn10FieldUtils';
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
    telefone: '',
});

// Só os cabeçalhos de avaliação e de RH calculam média geral (candidato e formulário sem cabeçalho não)
const hasAverageHeader = (template: EvaluationTemplate | null | undefined): boolean =>
  template?.headerType === 'evaluation' || template?.headerType === 'rh';

// Telefone com DDD no formato da máscara de `applyPhoneMask`: (48)999999999 ou (48)99999999
const PHONE_PATTERN = '\\(\\d{2}\\)\\d{8,9}';

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

// Mensagem de erro inline (role="alert": leitores de tela anunciam quando aparece)
const ErrorBanner: React.FC<{ message: string; className?: string }> = ({ message, className = '' }) => (
  <div role="alert" className={`flex items-start gap-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}>
    <Icon name="alert-circle" className="mt-0.5 h-5 w-5 flex-shrink-0" />
    <span className="min-w-0 break-words">{message}</span>
  </div>
);

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
  // Mensagens de erro exibidas inline (banners), sem diálogos do navegador
  const [loadFailed, setLoadFailed] = useState({ templates: false, branches: false });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
        setLoadFailed(prev => ({ ...prev, templates: true }));
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
        setLoadFailed(prev => ({ ...prev, branches: true }));
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
      setSubmitError(null);
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

    // Só cabeçalhos de avaliação e de RH têm averageScore
    if (!hasAverageHeader(selectedTemplate)) return undefined;

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
    setSubmitError(null);
    setPdfError(null);
    setSelectedTemplate(null);
    setFormStep(1);
    setLastSavedEvaluation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSubmitError(null);

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
    const isCandidateHeader = selectedTemplate.headerType === 'candidate';

    // O telefone só é gravado nas avaliações de candidato (o nome do candidato fica em `motorista`)
    const { telefone, ...formFields } = formData;

    const evaluationToSave: any = {
        ...formFields,
        scores,
        fieldValues: fieldValuesWithNames,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        motorista: !hasHeader ? 
                   `Formulário ${selectedTemplate.name}` : 
                   (isRhHeader ? normalizePersonName(formData.nomeColaborador || '') : normalizePersonName(formData.motorista)),
    };

    if (isRhHeader) {
      evaluationToSave.nomeColaborador = normalizePersonName(formData.nomeColaborador || '');
      evaluationToSave.funcao = formData.funcao || '';
      evaluationToSave.turnoPrincipal = formData.turnoPrincipal || '';
      evaluationToSave.equipeSetor = formData.equipeSetor || '';
    }

    if (isCandidateHeader) {
      evaluationToSave.telefone = (telefone || '').trim();
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
      setSubmitError('Falha ao salvar a avaliação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setPdfError(null);

    if (!lastSavedEvaluation) {
      setPdfError('Nenhuma avaliação salva recentemente para gerar PDF.');
      return;
    }

    try {
      const { missingImages } = await PDFService.generateEvaluationPDF(lastSavedEvaluation);
      if (missingImages > 0) setPdfError(describeMissingPdfImages(missingImages));
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setPdfError('Erro ao gerar PDF. Tente novamente.');
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
      return <span className="text-xl font-medium text-gray-500" aria-label="Sem média ainda">—</span>;
    }

    let statusText: string;
    let statusColor: string;

    if (isPureRating5) {
      if (score >= 3) {
        statusText = 'Aprovado';
        statusColor = 'text-green-700';
      } else {
        statusText = 'Reprovado';
        statusColor = 'text-red-600';
      }
    } else {
      if (score > 7) {
        statusText = 'Aprovado';
        statusColor = 'text-green-700';
      } else if (score >= 6) {
        statusText = 'Reavaliar';
        statusColor = 'text-yellow-600';
      } else {
        statusText = 'Reprovado';
        statusColor = 'text-red-600';
      }
    }
    return (
      <div className="flex items-baseline gap-2">
        <span className={`text-xl sm:text-3xl font-bold ${statusColor}`}>{statusText}</span>
        <span className="text-base sm:text-xl font-medium text-gray-600">({score.toFixed(2)})</span>
      </div>
    );
  };

  if (isLoadingTemplates || isLoadingBranches) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 h-64">
        <Icon name="loader-2" className="h-12 w-12 animate-spin text-brand-primary" />
        <p className="text-base sm:text-lg text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  const loadErrorMessage = [
    loadFailed.templates && 'Não foi possível carregar os modelos de avaliação.',
    loadFailed.branches && 'Não foi possível carregar as filiais.',
  ].filter(Boolean).join(' ');

  if (formStep === 3 && lastSavedEvaluation) {
    return (
      <EvaluationResult
        evaluation={lastSavedEvaluation}
        onGeneratePDF={handleGeneratePDF}
        onNewEvaluation={resetForm}
        errorMessage={pdfError}
      />
    );
  }

  if (formStep === 1) {
    return (
      <div className="space-y-4">
        {loadErrorMessage && <ErrorBanner message={loadErrorMessage} />}
        <Card>
          <div className="p-4 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark mb-2">Iniciar Nova Avaliação</h2>
            <p className="text-gray-600 mb-6">Selecione o modelo de formulário que deseja utilizar.</p>
            {templates.length > 0 ? (
              <div className="max-w-md mx-auto text-left">
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
              <div role="status" className="text-left p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-800 break-words">
                  <p className="font-bold">Nenhum Modelo Encontrado</p>
                  <p>Por favor, crie um modelo na aba "Gerenciar Modelos" antes de iniciar uma avaliação.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const showsAverage = hasAverageHeader(selectedTemplate);

  // Rótulo do botão de envio conforme o tipo do modelo (mantém os textos de cada barra original)
  const submitLabel = showsAverage
    ? 'Salvar Avaliação'
    : selectedTemplate?.headerType === 'candidate' || selectedTemplate?.includeHeader === false
      ? 'Enviar Formulário'
      : 'Salvar';

  // Erro de envio, ou resumo dos campos de nota obrigatórios pendentes (some conforme o usuário responde)
  const pendingRatingCount = Object.keys(errors).length;
  const actionBarError = submitError
    ?? (pendingRatingCount > 0
      ? `Responda ${pendingRatingCount === 1 ? 'o campo de nota obrigatório pendente' : `os ${pendingRatingCount} campos de nota obrigatórios pendentes`} antes de salvar.`
      : null);

  return (
    <form onSubmit={handleSubmit}>
      {loadErrorMessage && <ErrorBanner message={loadErrorMessage} className="mb-4" />}
      <Card>
        <div className="p-4 bg-brand-gray border-b border-gray-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="min-w-0 flex-1 basis-48 break-words text-base sm:text-lg font-semibold text-brand-dark">Modelo: <span className="text-brand-primary">{selectedTemplate?.name}</span></h2>
            <Button type="button" onClick={() => setFormStep(1)} variant="secondary" size="sm" className="flex-shrink-0">
                Trocar Modelo
            </Button>
        </div>
        {selectedTemplate?.headerType === 'evaluation' && (
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">Cabeçalho da Avaliação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Input label="Matrícula" name="matricula" autoComplete="off" value={formData.matricula} onChange={handleInputChange} />
              <Input label="Motorista" name="motorista" autoComplete="off" autoCapitalize="characters" className="uppercase" value={formData.motorista} onChange={handleInputChange} required />
              <Input label="Setor Acompanhado" name="setor" autoComplete="off" value={formData.setor} onChange={handleInputChange} />
              <Input label="VT (Veículo)" name="vt" autoComplete="off" value={formData.vt} onChange={handleInputChange} required />
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
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">Cabeçalho de RH</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Input label="Nome do Colaborador" name="nomeColaborador" autoComplete="off" autoCapitalize="characters" className="uppercase" value={formData.nomeColaborador || ''} onChange={handleInputChange} required />
              <Input label="Função" name="funcao" autoComplete="off" value={formData.funcao || ''} onChange={handleInputChange} />
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
              <Input label="Equipe/Setor" name="equipeSetor" autoComplete="off" value={formData.equipeSetor || ''} onChange={handleInputChange} />
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
        {selectedTemplate?.headerType === 'candidate' && (
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">Cabeçalho do Candidato</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Input label="Data" name="data" type="date" value={formData.data} onChange={handleInputChange} required />
              <Input label="Nome do Candidato" name="motorista" autoComplete="off" autoCapitalize="characters" className="uppercase" value={formData.motorista} onChange={handleInputChange} required />
              <Input
                label="Telefone"
                name="telefone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="(xx)xxxxxxxxx"
                pattern={PHONE_PATTERN}
                title="Telefone com DDD, no formato (48)999999999"
                value={formData.telefone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: applyPhoneMask(e.target.value) }))}
                required
              />
            </div>
          </div>
        )}
      </Card>
      
      {selectedTemplate && ((selectedTemplate.criteriaConfig && selectedTemplate.criteriaConfig.length > 0) || (selectedTemplate.criteria && selectedTemplate.criteria.length > 0)) && (
          <Card className="mt-4 sm:mt-6">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">Critérios de Avaliação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-5 sm:gap-y-6">
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
        <Card className="mt-4 sm:mt-6">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">Considerações Finais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Textarea label="Prós em relação a condução apresentada?" name="pros" value={formData.pros} onChange={handleInputChange} rows={4} />
              <Textarea label="Contras em relação a condução apresentada?" name="contras" value={formData.contras} onChange={handleInputChange} rows={4} />
              <Textarea label="Considerações finais do instrutor" name="consideracoes" value={formData.consideracoes} onChange={handleInputChange} rows={4} />
            </div>
          </div>
        </Card>
      )}

      {/* Barra de ação única (modelos com cabeçalho, só formulário ou legados).
          No celular fica colada acima da navegação inferior do App; a média ao vivo e os erros ficam sempre visíveis. */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] [@media(max-height:32rem)]:static sm:static z-20 mt-4 sm:mt-6 -mx-4 sm:mx-0 px-4 py-3 sm:p-4 bg-white border-t border-gray-200 sm:border-t-0 sm:rounded-lg shadow-[0_-2px_8px_rgba(0,0,0,0.08)] sm:shadow-md">
        {actionBarError && <ErrorBanner message={actionBarError} className="mb-3" />}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {showsAverage && (
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-x-3 gap-y-1 min-w-0">
              <span className="text-sm sm:text-lg font-medium text-gray-600">
                <span className="sm:hidden">Média geral:</span>
                <span className="hidden sm:inline">
                  {selectedTemplate?.headerType === 'rh' ? 'Média Geral do Colaborador:' : 'Média Geral do Motorista:'}
                </span>
              </span>
              {renderAverageStatus()}
            </div>
          )}

          {/* No celular os dois botões ficam lado a lado (barra baixa); Salvar ocupa o espaço restante */}
          <div className="flex gap-3 sm:ml-auto">
            <Button type="button" onClick={resetForm} variant="secondary" className="flex-none">
              <Icon name="rotate" className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="device-floppy" className="h-4 w-4" />}
              {isSaving ? 'Salvando...' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EvaluationForm;
