
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Save, Loader2, FileText, Edit, XCircle, Building, Settings, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { EvaluationTemplate } from '../types';
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate, getBranches, saveBranch, deleteBranch } from '../services/firebaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

type SubTab = 'models' | 'branches';

const TemplateManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('models');
  
  // Estados para modelos
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [criteria, setCriteria] = useState<string[]>(['']);
  const formRef = useRef<HTMLDivElement>(null);

  // Estados para filiais
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');

  useEffect(() => {
    if (activeSubTab === 'models') {
      loadTemplates();
    } else if (activeSubTab === 'branches') {
      loadBranches();
    }
  }, [activeSubTab]);
  
  const loadTemplates = async () => {
    setIsLoading(true);
    const fetchedTemplates = await getTemplates();
    setTemplates(fetchedTemplates);
    setIsLoading(false);
  };

  const loadBranches = async () => {
    setIsLoading(true);
    const fetchedBranches = await getBranches();
    setBranches(fetchedBranches);
    setIsLoading(false);
  };

  // Funções para modelos
  const handleCriterionChange = (index: number, value: string) => {
    const updatedCriteria = [...criteria];
    updatedCriteria[index] = value;
    setCriteria(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteria([...criteria, '']);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      const updatedCriteria = criteria.filter((_, i) => i !== index);
      setCriteria(updatedCriteria);
    }
  };

  const resetForm = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setCriteria(['']);
  };

  const handleEdit = (template: EvaluationTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setCriteria(template.criteria);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.')) {
        try {
            await deleteTemplate(templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (error) {
            console.error("Falha ao excluir modelo:", error);
            alert((error as Error).message || "Falha ao excluir o modelo. Tente novamente.");
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || criteria.some(c => !c.trim())) {
      alert('Por favor, preencha o nome do modelo e todos os critérios.');
      return;
    }

    setIsSaving(true);
    const templateData = {
      name: templateName.trim(),
      criteria: criteria.map(c => c.trim()).filter(Boolean),
    };
    
    try {
      if (editingTemplateId) {
        const updated = await updateTemplate(editingTemplateId, templateData);
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? updated : t));
      } else {
        const saved = await saveTemplate(templateData);
        setTemplates(prev => [...prev, saved]);
      }
      resetForm();
    } catch (error) {
      console.error("Falha ao salvar modelo:", error);
      alert("Falha ao salvar o modelo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Funções para filiais
  const handleAddBranch = async () => {
    if (newBranch.trim() && !branches.includes(newBranch.trim())) {
      try {
        await saveBranch(newBranch.trim());
        setBranches(prev => [...prev, newBranch.trim()]);
        setNewBranch('');
      } catch (error) {
        console.error('Erro ao adicionar filial:', error);
        alert('Erro ao adicionar filial. Tente novamente.');
      }
    }
  };

  const handleEditBranch = (branch: string) => {
    setEditingBranch(branch);
    setEditingBranchName(branch);
  };

  const handleSaveBranchEdit = () => {
    if (editingBranch && editingBranchName.trim()) {
      setBranches(prev => prev.map(b => b === editingBranch ? editingBranchName.trim() : b));
      setEditingBranch(null);
      setEditingBranchName('');
    }
  };

  const handleDeleteBranch = async (branch: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a filial "${branch}"?`)) {
      try {
        await deleteBranch(branch);
        setBranches(prev => prev.filter(b => b !== branch));
      } catch (error) {
        console.error('Erro ao excluir filial:', error);
        alert('Erro ao excluir filial. Tente novamente.');
      }
    }
  };

  // Funções para reordenar critérios
  const moveCriterionUp = (index: number) => {
    if (index === 0) return;
    const newCriteria = [...criteria];
    [newCriteria[index], newCriteria[index - 1]] = [newCriteria[index - 1], newCriteria[index]];
    setCriteria(newCriteria);
  };

  const moveCriterionDown = (index: number) => {
    if (index === criteria.length - 1) return;
    const newCriteria = [...criteria];
    [newCriteria[index], newCriteria[index + 1]] = [newCriteria[index + 1], newCriteria[index]];
    setCriteria(newCriteria);
  };

  const formTitle = editingTemplateId ? 'Editando Modelo' : 'Criar Novo Modelo de Avaliação';
  const saveButtonText = editingTemplateId ? 'Salvar Alterações' : 'Salvar Novo Modelo';

  const SubTabButton: React.FC<{ tabName: SubTab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveSubTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent ${
        activeSubTab === tabName
          ? 'bg-brand-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header com sub-abas */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand-primary" />
          Gerenciar Sistema
        </h2>
        <div className="flex gap-2">
          <SubTabButton tabName="models" label="Modelos" icon={<FileText className="h-4 w-4" />} />
          <SubTabButton tabName="branches" label="Filiais" icon={<Building className="h-4 w-4" />} />
        </div>
      </div>

      {/* Conteúdo da aba Modelos */}
      {activeSubTab === 'models' && (
        <div className="space-y-8">
          <div ref={formRef} />
          <Card>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                {editingTemplateId ? <Edit className="h-6 w-6 text-brand-primary" /> : <PlusCircle className="h-6 w-6 text-brand-primary" />}
                {formTitle}
              </h2>
              
              <Input 
                label="Nome do Modelo" 
                name="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Avaliação de Veículo Leve"
                required 
              />
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Critérios de Avaliação</h3>
                <p className="text-sm text-gray-600 mb-3">Use os botões para reordenar os critérios</p>
                <div className="space-y-3">
                  {criteria.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 text-gray-400">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-grow">
                        <label htmlFor={`criterion-${index}`} className="sr-only">{`Critério ${index + 1}`}</label>
                        <input
                          id={`criterion-${index}`}
                          name={`criterion-${index}`}
                          value={criterion}
                          onChange={(e) => handleCriterionChange(index, e.target.value)}
                          required
                          placeholder="Nome do critério"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          type="button" 
                          onClick={() => moveCriterionUp(index)}
                          disabled={index === 0}
                          className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Mover para cima"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveCriterionDown(index)}
                          disabled={index === criteria.length - 1}
                          className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Mover para baixo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => removeCriterion(index)}
                          className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remover critério"
                          disabled={criteria.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" onClick={addCriterion} variant="secondary" className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar Critério
                </Button>
              </div>
              
              <div className="flex justify-end gap-4">
                {editingTemplateId && (
                    <Button type="button" onClick={resetForm} variant="secondary">
                        <XCircle className="h-5 w-5 mr-2" />
                        Cancelar Edição
                    </Button>
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  {isSaving ? 'Salvando...' : saveButtonText}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
                <FileText className="h-6 w-6 text-brand-primary" />
                Modelos Existentes
              </h2>
              {isLoading ? (
                 <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                 </div>
              ) : templates.length > 0 ? (
                <ul className="space-y-3">
                  {templates.map(template => (
                    <li key={template.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-grow">
                        <p className="font-semibold text-gray-800">{template.name}</p>
                        <p className="text-sm text-gray-500 mt-1 max-w-xl truncate">
                          {template.criteria.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        <Button onClick={() => handleEdit(template)} variant="secondary" className="!py-1 !px-3 text-sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                        </Button>
                         <Button 
                            onClick={() => handleDelete(template.id)} 
                            variant="secondary" 
                            className="!py-1 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200"
                         >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum modelo customizado foi criado ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Conteúdo da aba Filiais */}
      {activeSubTab === 'branches' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
                <PlusCircle className="h-6 w-6 text-brand-primary" />
                Adicionar Nova Filial
              </h2>
              <div className="flex gap-3">
                <div className="flex-grow">
                  <Input
                    label="Nome da Filial"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="Ex: Unidade Leste"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBranch()}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddBranch} disabled={!newBranch.trim()}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
                <Building className="h-6 w-6 text-brand-primary" />
                Filiais Existentes
              </h2>
              {branches.length > 0 ? (
                <ul className="space-y-3">
                  {branches.map(branch => (
                    <li key={branch} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                      <div className="flex-grow">
                        {editingBranch === branch ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingBranchName}
                              onChange={(e) => setEditingBranchName(e.target.value)}
                              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveBranchEdit()}
                            />
                            <Button onClick={handleSaveBranchEdit} variant="secondary" className="!py-1 !px-3 text-sm">
                              <Save className="h-4 w-4 mr-1" />
                              Salvar
                            </Button>
                            <Button onClick={() => setEditingBranch(null)} variant="secondary" className="!py-1 !px-3 text-sm">
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <p className="font-semibold text-gray-800">{branch}</p>
                        )}
                      </div>
                      {editingBranch !== branch && (
                        <div className="flex items-center gap-2">
                          <Button onClick={() => handleEditBranch(branch)} variant="secondary" className="!py-1 !px-3 text-sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            onClick={() => handleDeleteBranch(branch)} 
                            variant="secondary" 
                            className="!py-1 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhuma filial foi criada ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;