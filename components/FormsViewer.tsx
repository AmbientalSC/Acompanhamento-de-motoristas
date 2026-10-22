import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from './ui/Icon';
import type { Evaluation, EvaluationCriterion, EvaluationTemplate } from '../types';
import { getEvaluations, deleteEvaluation, getTemplates } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import Card from './ui/Card';
import GradingDetails from './GradingDetails';
import QuestionImage from './ui/QuestionImage';
import Select from './ui/Select';
import Input from './ui/Input';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';

const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const FormsViewer: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);

  // Função para buscar o nome real do campo - compatível com dados antigos (IDs) e novos (nomes)
  const getFieldName = (fieldKey: string, templateId?: string): string => {
    if (!templateId) return fieldKey;

    const template = templates.find(t => t.id === templateId);
    if (!template || !template.criteriaConfig) return fieldKey;

    // Se o fieldKey já é um nome de campo (dados novos), retorna ele mesmo
    const fieldByName = template.criteriaConfig.find(c => c.name === fieldKey);
    if (fieldByName) return fieldKey;

    // Se é um ID de campo (dados antigos), busca pelo ID e retorna o nome
    const fieldById = template.criteriaConfig.find(c => c.id === fieldKey);
    return fieldById ? fieldById.name : fieldKey;
  };

  // Critério de um campo de `fieldValues`: por id (dados antigos) ou por nome (dados novos).
  // Perguntas com o mesmo nome são ambíguas (as respostas colidem), então por nome só vale se for único.
  const findCriterion = (fieldKey: string, templateId?: string): EvaluationCriterion | undefined => {
    const criteria = templates.find(t => t.id === templateId)?.criteriaConfig ?? [];
    const byId = criteria.find(c => c.id === fieldKey);
    if (byId) return byId;
    const byName = criteria.filter(c => c.name === fieldKey);
    return byName.length === 1 ? byName[0] : undefined;
  };

  // Texto exibido da resposta: em múltipla escolha mostra o texto da alternativa (não o valor gravado)
  const getDisplayValue = (fieldKey: string, value: unknown, templateId?: string): string => {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    const text = String(value);
    const criterion = templates
      .find(t => t.id === templateId)
      ?.criteriaConfig?.find(c => c.name === fieldKey || c.id === fieldKey);
    const option = criterion?.type === 'radio' ? criterion.options?.find(o => o.value === text) : undefined;
    return option?.label || text;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        const [evaluationsData, templatesData] = await Promise.all([
          getEvaluations(),
          getTemplates()
        ]);
        setEvaluations(evaluationsData);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Erro ao carregar formulários:', error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [reloadKey]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await deleteEvaluation(deleteConfirm.id);
      // Atualizar a lista local removendo o item
      setEvaluations(prev => prev.filter(e => e.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      alert('Erro ao excluir formulário. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCardExpansion = (formId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formId)) {
        newSet.delete(formId);
      } else {
        newSet.add(formId);
      }
      return newSet;
    });
  };

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleGeneratePdf = async (form: Evaluation) => {
    setPdfGeneratingId(form.id);
    try {
      await PDFService.generateEvaluationPDF(form);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const handleDeleteClick = (evaluationId: string, templateName: string) => {
    setDeleteConfirm({ id: evaluationId, name: templateName });
  };

  const clearFilters = () => {
    setSelectedTemplate('');
    setSelectedBranch('');
    setSearchTerm('');
  };

  // Filtrar apenas formulários (sem cabeçalho de avaliação)
  const formSubmissions = useMemo(() => {
    return evaluations.filter(e => {
      // Considera como formulário se:
      // 1. averageScore é undefined, null, ou 0
      // 2. OU se o nome do motorista contém "Formulário" (indicando que foi preenchido sem cabeçalho)
      // 3. OU se não tem motorista preenchido
      const isForm = e.averageScore === undefined ||
                     e.averageScore === null ||
                     e.averageScore === 0 ||
                     (e.motorista && e.motorista.includes('Formulário')) ||
                     !e.motorista ||
                     e.motorista.trim() === '';
      return isForm;
    });
  }, [evaluations]);

  // Obter templates únicos dos formulários
  const formTemplates = useMemo(() => {
    const templateNames = [...new Set(formSubmissions.map(e => e.templateName))];
    return templateNames.filter(Boolean);
  }, [formSubmissions]);

  // Obter filiais únicas dos formulários
  const formBranches = useMemo(() => {
    const branchNames = [...new Set(formSubmissions.map(e => e.filial))];
    return branchNames.filter(Boolean);
  }, [formSubmissions]);

  // Aplicar filtros
  const filteredForms = useMemo(() => {
    return formSubmissions.filter(form => {
      const matchesTemplate = !selectedTemplate || form.templateName === selectedTemplate;
      const matchesBranch = !selectedBranch || form.filial === selectedBranch;
      const matchesSearch = !searchTerm ||
        form.templateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.filial?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTemplate && matchesBranch && matchesSearch;
    });
  }, [formSubmissions, selectedTemplate, selectedBranch, searchTerm]);

  // Filtros de seleção ativos (a busca fica sempre visível, então não entra na contagem do bloco colapsável)
  const activeSelectFilters = (selectedTemplate ? 1 : 0) + (selectedBranch ? 1 : 0);
  const hasActiveFilters = activeSelectFilters > 0 || searchTerm !== '';

  if (isLoading) {
    return (
      <div role="status" className="flex h-64 items-center justify-center gap-3 sm:gap-4">
        <Icon name="loader-2" className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-brand-primary" />
        <p className="text-base sm:text-lg text-gray-600">Carregando formulários...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <div role="alert" className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          <Icon name="alert-triangle" className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Não foi possível carregar os formulários</h3>
          <p className="text-gray-600 mt-2">Verifique a conexão e tente novamente.</p>
          <Button onClick={() => setReloadKey(key => key + 1)} className="mt-4">
            <Icon name="refresh" className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (formSubmissions.length === 0) {
    return (
      <Card>
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          <Icon name="alert-triangle" className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Nenhum Formulário Encontrado</h3>
          <p className="text-gray-600 mt-2">
            Ainda não há formulários preenchidos. Formulários são criados sem cabeçalho de avaliação.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtros */}
      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-brand-dark mb-4">Formulários Preenchidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <Input
              label="Buscar"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Modelo, pessoa ou filial"
            />

            {/* Celular: modelo e filial ficam num bloco colapsável; a partir de md entram na mesma grade */}
            <Button
              variant="secondary"
              className="md:hidden w-full"
              onClick={() => setShowFilters(prev => !prev)}
              aria-expanded={showFilters}
              aria-controls="forms-viewer-filters"
            >
              <Icon name="filter" className="h-4 w-4" />
              Filtros{activeSelectFilters > 0 ? ` (${activeSelectFilters})` : ''}
              <Icon name="chevron-down" className={`h-4 w-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            <div
              id="forms-viewer-filters"
              className={`${showFilters ? 'grid' : 'hidden'} grid-cols-1 gap-3 md:contents`}
            >
              <Select
                label="Filtrar por Modelo"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">Todos os modelos</option>
                {formTemplates.map(template => (
                  <option key={template} value={template}>{template}</option>
                ))}
              </Select>

              <Select
                label="Filtrar por Filial"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">Todas as filiais</option>
                {formBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </Select>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600" aria-live="polite">
            Exibindo {filteredForms.length} de {formSubmissions.length} formulários
          </p>
        </div>
      </Card>

      {/* Lista de Formulários */}
      <div className="grid gap-3 sm:gap-4">
        {filteredForms.map((form) => {
          const isExpanded = expandedCards.has(form.id);
          const fieldCount = form.fieldValues ? Object.keys(form.fieldValues).length : 0;
          const formName = form.templateName || 'formulário';

          return (
            <Card key={form.id} className="hover:shadow-md transition-shadow relative group">
              <div className="p-4 sm:p-6">
                {/* Cabeçalho que expande/contrai: o botão ocupa toda a área e a exclusão fica ao lado */}
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleCardExpansion(form.id)}
                      aria-expanded={isExpanded}
                      className="block w-full min-h-11 rounded-brand text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                    >
                      <span className="flex items-start gap-2 text-base sm:text-lg font-semibold text-brand-dark">
                        <Icon name="file-text" className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-primary" />
                        <span className="min-w-0 flex-1 break-words">{form.templateName}</span>
                        <Icon
                          name="chevron-down"
                          className={`mt-1 h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-normal text-gray-600">
                        {form.motorista && (
                          <span className="flex min-w-0 max-w-full items-start gap-1">
                            <Icon name="user" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">{form.motorista}</span>
                          </span>
                        )}
                        {form.filial && (
                          <span className="flex min-w-0 max-w-full items-start gap-1">
                            <Icon name="building" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">{form.filial}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Icon name="calendar" className="h-4 w-4 flex-shrink-0" />
                          {formatDate(form.data)}
                        </span>
                        {form.grading && (
                          <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-primary">
                            {form.grading.correct}/{form.grading.total} acertos ({form.grading.percentage}%)
                          </span>
                        )}
                        <span className="text-xs text-gray-500">ID: {form.id.slice(-8)}</span>
                      </span>
                    </button>
                  </h3>
                  {/* PDF: sempre visível (permite gerar depois, quando não foi gerado ao encerrar a prova) */}
                  <button
                    type="button"
                    onClick={() => handleGeneratePdf(form)}
                    disabled={pdfGeneratingId === form.id}
                    aria-label={`Gerar PDF do formulário ${formName}`}
                    title="Gerar PDF"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-brand-primary transition-colors duration-200 hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-wait disabled:opacity-60 sm:h-9 sm:w-9"
                  >
                    <Icon
                      name={pdfGeneratingId === form.id ? 'loader-2' : 'download'}
                      className={`h-5 w-5 sm:h-4 sm:w-4 ${pdfGeneratingId === form.id ? 'animate-spin' : ''}`}
                    />
                  </button>
                  {/* Excluir: sempre visível no toque; com mouse só aparece no hover/foco do cartão */}
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(form.id, formName)}
                    aria-label={`Excluir formulário ${formName}`}
                    title="Excluir formulário"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 sm:h-9 sm:w-9"
                  >
                    <Icon name="trash" className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {/* Prévia compacta quando minimizado */}
                {!isExpanded && fieldCount > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                      {fieldCount} campos preenchidos
                    </span>
                    <span className="text-gray-500">
                      Toque para ver os detalhes
                    </span>
                  </div>
                )}

                {/* Conteúdo expandido - campos do formulário */}
                {isExpanded && (
                  <>
                    {form.grading && (
                      <div className="mt-4 border-t pt-4">
                        <GradingDetails
                          grading={form.grading}
                          criteria={templates.find(t => t.id === form.templateId)?.criteriaConfig}
                        />
                      </div>
                    )}

                    {/* Exibir campos do formulário */}
                    {fieldCount > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-3">Dados Preenchidos</h4>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(() => {
                            // Ordena os campos conforme o template (criteriaConfig) quando disponível.
                            const entries = Object.entries(form.fieldValues || {});
                            if (entries.length === 0) return null;

                            const template = templates.find(t => t.id === form.templateId);
                            let orderedEntries: [string, any][] = [];

                            if (template && template.criteriaConfig && template.criteriaConfig.length > 0) {
                              const added = new Set<string>();

                              // Para cada critério do template, procura pela chave correspondente (id ou name)
                              for (const crit of template.criteriaConfig) {
                                const byId = entries.find(([k]) => k === crit.id);
                                const byName = entries.find(([k]) => k === crit.name);
                                const found = byId || byName;
                                if (found && !added.has(found[0])) {
                                  orderedEntries.push(found);
                                  added.add(found[0]);
                                }
                              }

                              // Adiciona quaisquer campos restantes que não estavam no template (compatibilidade)
                              for (const e of entries) {
                                if (!added.has(e[0])) {
                                  orderedEntries.push(e);
                                  added.add(e[0]);
                                }
                              }
                            } else {
                              // Sem template, mantém a ordem natural dos fieldValues
                              orderedEntries = entries;
                            }

                            return orderedEntries.map(([fieldKey, value]) => {
                              const criterion = findCriterion(fieldKey, form.templateId);
                              const fieldName = getFieldName(fieldKey, form.templateId);

                              return (
                                <div key={fieldKey} className="min-w-0 rounded-brand bg-gray-50 p-3">
                                  <dt className="mb-1 text-xs font-medium text-gray-600 break-words">
                                    {fieldName}
                                  </dt>
                                  {criterion?.imageUrl && (
                                    <div className="mb-2">
                                      <QuestionImage
                                        compact
                                        src={criterion.imageUrl}
                                        alt={fieldName}
                                        options={criterion.type === 'number' ? criterion.options : undefined}
                                      />
                                    </div>
                                  )}
                                  <dd className="text-sm text-brand-dark break-words whitespace-pre-wrap">
                                    {getDisplayValue(fieldKey, value, form.templateId)}
                                  </dd>
                                </div>
                              );
                            });
                          })()}
                        </dl>
                      </div>
                    )}

                    {/* Considerações finais se houver */}
                    {(form.pros || form.contras || form.consideracoes) && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-3">Observações</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {form.pros && (
                            <div className="min-w-0 rounded-brand bg-green-50 p-3">
                              <p className="mb-1 text-xs font-medium text-green-700">
                                Pontos Positivos
                              </p>
                              <p className="text-sm text-green-800 break-words whitespace-pre-wrap">{form.pros}</p>
                            </div>
                          )}
                          {form.contras && (
                            <div className="min-w-0 rounded-brand bg-red-50 p-3">
                              <p className="mb-1 text-xs font-medium text-red-700">
                                Pontos Negativos
                              </p>
                              <p className="text-sm text-red-800 break-words whitespace-pre-wrap">{form.contras}</p>
                            </div>
                          )}
                          {form.consideracoes && (
                            <div className="min-w-0 rounded-brand bg-brand-light p-3">
                              <p className="mb-1 text-xs font-medium text-brand-primary">
                                Considerações Finais
                              </p>
                              <p className="text-sm text-brand-dark break-words whitespace-pre-wrap">{form.consideracoes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredForms.length === 0 && formSubmissions.length > 0 && (
        <Card>
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <Icon name="search" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhum formulário encontrado</h3>
            <p className="text-gray-600 mt-2">
              Tente ajustar os filtros para encontrar os formulários desejados.
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                <Icon name="x" className="h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Confirmar exclusão"
        message={
          <>
            Tem certeza que deseja excluir o formulário "{deleteConfirm?.name}"?
            <span className="mt-1 block font-medium text-red-600">Esta ação não pode ser desfeita.</span>
          </>
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

export default FormsViewer;
