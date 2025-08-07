
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Save, Loader2, FileText, Edit, XCircle, Building, Settings, GripVertical, ChevronUp, ChevronDown, Users } from 'lucide-react';
import type { EvaluationTemplate, EvaluationCriterion, User } from '../types';
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate, getBranches, saveBranch, deleteBranch, getUsers, saveUser, updateUser, deleteUser } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

type SubTab = 'models' | 'branches' | 'users';

const TemplateManager: React.FC = () => {
  const { canManageSystem } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('models');
  
  // Estados para modelos
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [criteriaConfig, setCriteriaConfig] = useState<EvaluationCriterion[]>([{ name: '', required: false }]);
  const formRef = useRef<HTMLDivElement>(null);

  // Estados para filiais
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');

  // Estados para usuários
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPosition, setUserPosition] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'manager'>('manager');
  const [userBranches, setUserBranches] = useState<string[]>([]);
  const [userIsActive, setUserIsActive] = useState(true);

  useEffect(() => {
    if (activeSubTab === 'models') {
      loadTemplates();
    } else if (activeSubTab === 'branches') {
      loadBranches();
    } else if (activeSubTab === 'users') {
      loadUsers();
      // Carregar filiais para seleção
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

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setIsLoading(false);
  };

  // Funções para modelos
  const handleCriterionChange = (index: number, field: 'name' | 'required', value: string | boolean) => {
    const updatedCriteria = [...criteriaConfig];
    if (field === 'name') {
      updatedCriteria[index].name = value as string;
    } else {
      updatedCriteria[index].required = value as boolean;
    }
    setCriteriaConfig(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteriaConfig([...criteriaConfig, { name: '', required: false }]);
  };

  const removeCriterion = (index: number) => {
    if (criteriaConfig.length > 1) {
      const updatedCriteria = criteriaConfig.filter((_, i) => i !== index);
      setCriteriaConfig(updatedCriteria);
    }
  };

  const resetForm = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setCriteriaConfig([{ name: '', required: false }]);
  };

  const handleEdit = (template: EvaluationTemplate) => {
    // Definir o estado de edição primeiro
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    
    // Converter criteria antigas para nova estrutura se necessário
    if (template.criteriaConfig && template.criteriaConfig.length > 0) {
      setCriteriaConfig([...template.criteriaConfig]);
    } else if (template.criteria && template.criteria.length > 0) {
      // Compatibilidade com templates antigos
      const convertedCriteria = template.criteria.map(name => ({ name, required: false }));
      setCriteriaConfig(convertedCriteria);
    } else {
      // Fallback para templates vazios
      setCriteriaConfig([{ name: '', required: false }]);
    }
    
    // Scroll para o formulário depois de um pequeno delay
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Funções para reordenar critérios
  const moveCriterionUp = (index: number) => {
    if (index === 0) return;
    const newCriteria = [...criteriaConfig];
    [newCriteria[index], newCriteria[index - 1]] = [newCriteria[index - 1], newCriteria[index]];
    setCriteriaConfig(newCriteria);
  };

  const moveCriterionDown = (index: number) => {
    if (index === criteriaConfig.length - 1) return;
    const newCriteria = [...criteriaConfig];
    [newCriteria[index], newCriteria[index + 1]] = [newCriteria[index + 1], newCriteria[index]];
    setCriteriaConfig(newCriteria);
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
    if (!templateName.trim() || criteriaConfig.some(c => !c.name.trim())) {
      alert('Por favor, preencha o nome do modelo e todos os critérios.');
      return;
    }

    setIsSaving(true);
    const templateData = {
      name: templateName.trim(),
      criteria: criteriaConfig.map(c => c.name.trim()).filter(Boolean), // Compatibilidade
      criteriaConfig: criteriaConfig.map(c => ({ name: c.name.trim(), required: c.required })).filter(c => c.name),
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

  // Funções para usuários
  const resetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserPosition('');
    setUserRole('manager');
    setUserBranches([]);
    setUserIsActive(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword(''); // Não carregar senha existente por segurança
    setUserPosition(user.position);
    setUserRole(user.role);
    setUserBranches([...user.branches]);
    setUserIsActive(user.isActive);
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPosition.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar senha apenas para novos usuários
    if (!editingUserId && !userPassword.trim()) {
      alert('Por favor, defina uma senha para o novo usuário.');
      return;
    }

    if (userRole === 'manager' && userBranches.length === 0) {
      alert('Gestores devem ter pelo menos uma filial associada.');
      return;
    }

    setIsSaving(true);
    const userData = {
      name: userName.trim(),
      email: userEmail.trim(),
      password: userPassword.trim(), // Incluir senha
      position: userPosition.trim(),
      role: userRole,
      branches: userRole === 'admin' ? [] : userBranches, // Admins têm acesso a todas
      isActive: userIsActive,
    };
    
    try {
      if (editingUserId) {
        const updated = await updateUser(editingUserId, userData);
        setUsers(prev => prev.map(u => u.id === editingUserId ? updated : u));
      } else {
        const saved = await saveUser(userData);
        setUsers(prev => [...prev, saved]);
      }
      resetUserForm();
    } catch (error) {
      console.error("Falha ao salvar usuário:", error);
      alert("Falha ao salvar o usuário. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      try {
        await deleteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (error) {
        console.error("Falha ao excluir usuário:", error);
        alert((error as Error).message || "Falha ao excluir o usuário. Tente novamente.");
      }
    }
  };

  const handleBranchToggle = (branch: string) => {
    setUserBranches(prev => 
      prev.includes(branch) 
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const formTitle = editingTemplateId ? 'Editando Modelo' : 'Criar Novo Modelo de Avaliação';
  const saveButtonText = editingTemplateId ? 'Salvar Alterações' : 'Salvar Novo Modelo';
  const userFormTitle = editingUserId ? 'Editando Usuário' : 'Criar Novo Usuário';
  const userSaveButtonText = editingUserId ? 'Salvar Alterações' : 'Salvar Novo Usuário';

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
          {canManageSystem && (
            <SubTabButton tabName="users" label="Usuários" icon={<Users className="h-4 w-4" />} />
          )}
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
                <p className="text-sm text-gray-600 mb-3">Use os botões para reordenar os critérios e marque se são obrigatórios</p>
                <div className="space-y-3">
                  {criteriaConfig.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 text-gray-400">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor={`criterion-${index}`} className="sr-only">{`Critério ${index + 1}`}</label>
                          <input
                            id={`criterion-${index}`}
                            name={`criterion-${index}`}
                            value={criterion.name}
                            onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                            required
                            placeholder="Nome do critério"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            id={`required-${index}`}
                            type="checkbox"
                            checked={criterion.required}
                            onChange={(e) => handleCriterionChange(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                          />
                          <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-700">
                            Campo obrigatório
                          </label>
                        </div>
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
                          disabled={index === criteriaConfig.length - 1}
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
                          disabled={criteriaConfig.length <= 1}
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
                    <li key={template.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold text-gray-800 mb-2">{template.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.criteriaConfig ? (
                              template.criteriaConfig.map((criterion, index) => (
                                <span key={index} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border">
                                  <span className="truncate max-w-[150px]" title={criterion.name}>
                                    {criterion.name}
                                  </span>
                                  {criterion.required && (
                                    <span className="text-red-500 font-bold">*</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {template.criteria.map((criterion, index) => (
                                  <span key={index} className="inline-block text-xs bg-white px-2 py-1 rounded border truncate max-w-[150px]" title={criterion}>
                                    {criterion}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          <Button onClick={() => handleEdit(template)} variant="secondary" className="!py-1 !px-3 text-sm whitespace-nowrap">
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                          </Button>
                           <Button 
                              onClick={() => handleDelete(template.id)} 
                              variant="secondary" 
                              className="!py-1 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200 whitespace-nowrap"
                           >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                          </Button>
                        </div>
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

      {/* Conteúdo da aba Usuários */}
      {activeSubTab === 'users' && canManageSystem && (
        <div className="space-y-6">
          <div ref={formRef} />
          <Card>
            <form onSubmit={handleSubmitUser} className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                {editingUserId ? <Edit className="h-6 w-6 text-brand-primary" /> : <PlusCircle className="h-6 w-6 text-brand-primary" />}
                {userFormTitle}
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Nome Completo" 
                    name="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex: João Silva"
                    required 
                  />
                  
                  <Input 
                    label="Email" 
                    name="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="joao.silva@empresa.com"
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label={editingUserId ? "Nova Senha (deixe vazio para manter)" : "Senha"} 
                    name="userPassword"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Senha do usuário"
                    required={!editingUserId}
                  />
                  
                  <Input 
                    label="Cargo" 
                    name="userPosition"
                    value={userPosition}
                    onChange={(e) => setUserPosition(e.target.value)}
                    placeholder="Ex: Supervisor"
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label="Nível de Acesso"
                    name="userRole"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as 'admin' | 'manager')}
                    required
                  >
                    <option value="manager">Gestor</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </div>
              </div>

              {userRole === 'manager' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Filiais de Acesso</h3>
                  <p className="text-sm text-gray-600 mb-3">Selecione as filiais que este gestor pode acessar</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map(branch => (
                      <label key={branch} className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userBranches.includes(branch)}
                          onChange={() => handleBranchToggle(branch)}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{branch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  id="userIsActive"
                  type="checkbox"
                  checked={userIsActive}
                  onChange={(e) => setUserIsActive(e.target.checked)}
                  className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                />
                <label htmlFor="userIsActive" className="text-sm text-gray-700">
                  Usuário Ativo
                </label>
              </div>
              
              <div className="flex justify-end gap-4">
                {editingUserId && (
                  <Button type="button" onClick={resetUserForm} variant="secondary">
                    <XCircle className="h-5 w-5 mr-2" />
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  {isSaving ? 'Salvando...' : userSaveButtonText}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
                <Users className="h-6 w-6 text-brand-primary" />
                Usuários do Sistema
              </h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                </div>
              ) : users.length > 0 ? (
                <ul className="space-y-3">
                  {users.map(user => (
                    <li key={user.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800">{user.name}</p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : 'Gestor'}
                            </span>
                            {!user.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-600">{user.position}</p>
                          {user.role === 'manager' && user.branches.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {user.branches.map(branch => (
                                <span key={branch} className="inline-block text-xs bg-white px-2 py-1 rounded border">
                                  {branch}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          <Button onClick={() => handleEditUser(user)} variant="secondary" className="!py-1 !px-3 text-sm whitespace-nowrap">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            onClick={() => handleDeleteUser(user.id)} 
                            variant="secondary" 
                            className="!py-1 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200 whitespace-nowrap"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum usuário foi criado ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;