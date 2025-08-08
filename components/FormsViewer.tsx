import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertTriangle, FileText, Calendar, User, Building, Search, Trash2 } from 'lucide-react';
import type { Evaluation } from '../types';
import { getEvaluations, deleteEvaluation } from '../services/firebaseService';
import Card from './ui/Card';
import Select from './ui/Select';
import Input from './ui/Input';

const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const FormsViewer: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getEvaluations();
      setEvaluations(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteEvaluation(deleteConfirm.id);
      // Atualizar a lista local removendo o item
      setEvaluations(prev => prev.filter(e => e.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      alert('Erro ao excluir formulário. Tente novamente.');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleDeleteClick = (evaluationId: string, templateName: string) => {
    setDeleteConfirm({ id: evaluationId, name: templateName });
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        <p className="ml-4 text-lg text-gray-600">Carregando formulários...</p>
      </div>
    );
  }

  if (formSubmissions.length === 0) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">Nenhum Formulário Encontrado</h3>
          <p className="text-gray-500 mt-2">
            Ainda não há formulários preenchidos. Formulários são criados sem cabeçalho de avaliação.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Formulários Preenchidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Input
              label="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por modelo, pessoa ou filial..."
              className="!mt-0"
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Exibindo {filteredForms.length} de {formSubmissions.length} formulários
          </div>
        </div>
      </Card>

      {/* Lista de Formulários */}
      <div className="grid gap-4">
        {filteredForms.map((form) => (
          <Card key={form.id} className="hover:shadow-md transition-shadow relative group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-primary" />
                    {form.templateName}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {form.motorista && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {form.motorista}
                      </span>
                    )}
                    {form.filial && (
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {form.filial}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(form.data)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-500">
                    ID: {form.id.slice(-8)}
                  </div>
                  {/* Botão de excluir - aparece apenas no hover */}
                  <button
                    onClick={() => handleDeleteClick(form.id, form.templateName || 'formulário')}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Excluir formulário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Exibir campos do formulário */}
              {form.fieldValues && Object.keys(form.fieldValues).length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Dados Preenchidos:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(form.fieldValues).map(([fieldName, value]) => (
                      <div key={fieldName} className="bg-gray-50 p-3 rounded">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {fieldName}
                        </label>
                        <div className="text-sm text-gray-800">
                          {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Considerações finais se houver */}
              {(form.pros || form.contras || form.consideracoes) && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Observações:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {form.pros && (
                      <div className="bg-green-50 p-3 rounded">
                        <label className="block text-xs font-medium text-green-700 mb-1">
                          Pontos Positivos
                        </label>
                        <div className="text-sm text-green-800">{form.pros}</div>
                      </div>
                    )}
                    {form.contras && (
                      <div className="bg-red-50 p-3 rounded">
                        <label className="block text-xs font-medium text-red-700 mb-1">
                          Pontos Negativos
                        </label>
                        <div className="text-sm text-red-800">{form.contras}</div>
                      </div>
                    )}
                    {form.consideracoes && (
                      <div className="bg-blue-50 p-3 rounded">
                        <label className="block text-xs font-medium text-blue-700 mb-1">
                          Considerações Finais
                        </label>
                        <div className="text-sm text-blue-800">{form.consideracoes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredForms.length === 0 && formSubmissions.length > 0 && (
        <Card>
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhum formulário encontrado</h3>
            <p className="text-gray-500 mt-2">
              Tente ajustar os filtros para encontrar os formulários desejados.
            </p>
          </div>
        </Card>
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
              Tem certeza que deseja excluir o formulário "{deleteConfirm.name}"?
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

export default FormsViewer;
