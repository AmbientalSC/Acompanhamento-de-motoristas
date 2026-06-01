
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Save, Loader2, FileText, Edit, XCircle, Building, Settings, GripVertical, ChevronUp, ChevronDown, Users, Download } from 'lucide-react';
import type { EvaluationTemplate, EvaluationCriterion, User, FieldType } from '../types';
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate, getBranches, saveBranch, deleteBranch, getUsers, saveUser, updateUser, deleteUser } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { exampleTemplates } from '../data/exampleTemplates';

type SubTab = 'models' | 'branches' | 'users' | 'forms';

const TemplateManager: React.FC = () => {
  const { canManageSystem } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('models');
  
  // Estados para modelos
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [criteriaConfig, setCriteriaConfig] = useState<EvaluationCriterion[]>([{ 
    id: Date.now().toString(), 
    name: '', 
    required: false, 
    type: 'rating' 
  }]);
  const [headerType, setHeaderType] = useState<'evaluation' | 'rh' | undefined>('evaluation');
  const [includeFinalConsiderations, setIncludeFinalConsiderations] = useState(true);
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
  const [userCanAccessMN10, setUserCanAccessMN10] = useState(false);
  const [userIsActive, setUserIsActive] = useState(true);

  useEffect(() => {
    if (activeSubTab === 'models' || activeSubTab === 'forms') {
      loadTemplates();
    } else if (activeSubTab === 'branches') {
      loadBranches();
    } else if (activeSubTab === 'users') {
      loadUsers();
      // Carregar filiais para seleção
      loadBranches();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (userRole === 'admin') {
      setUserCanAccessMN10(true);
    }
  }, [userRole]);
  
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
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleCriterionChange = (index: number, field: keyof EvaluationCriterion, value: any) => {
    const updatedCriteria = [...criteriaConfig];
    updatedCriteria[index] = { ...updatedCriteria[index], [field]: value };
    
    // Se mudou para tipo radio e não tem opções, inicializar
    if (field === 'type' && value === 'radio' && !updatedCriteria[index].options) {
      updatedCriteria[index].options = [{ label: '', value: '' }];
    }
    
    // Se mudou para outro tipo que não radio, limpar opções
    if (field === 'type' && value !== 'radio') {
      updatedCriteria[index].options = undefined;
    }
    
    setCriteriaConfig(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteriaConfig([...criteriaConfig, { 
      id: generateId(),
      name: '', 
      required: false, 
      type: 'rating' 
    }]);
  };

  const removeCriterion = (index: number) => {
    if (criteriaConfig.length > 1) {
      const updatedCriteria = criteriaConfig.filter((_, i) => i !== index);
      setCriteriaConfig(updatedCriteria);
    }
  };

  const addRadioOption = (criterionIndex: number) => {
    const updatedCriteria = [...criteriaConfig];
    if (!updatedCriteria[criterionIndex].options) {
      updatedCriteria[criterionIndex].options = [];
    }
    updatedCriteria[criterionIndex].options!.push({ label: '', value: '' });
    setCriteriaConfig(updatedCriteria);
  };

  const removeRadioOption = (criterionIndex: number, optionIndex: number) => {
    const updatedCriteria = [...criteriaConfig];
    if (updatedCriteria[criterionIndex].options && updatedCriteria[criterionIndex].options!.length > 1) {
      updatedCriteria[criterionIndex].options!.splice(optionIndex, 1);
      setCriteriaConfig(updatedCriteria);
    }
  };

  const handleRadioOptionChange = (criterionIndex: number, optionIndex: number, field: 'label' | 'value', value: string) => {
    const updatedCriteria = [...criteriaConfig];
    if (!updatedCriteria[criterionIndex].options) {
      updatedCriteria[criterionIndex].options = [];
    }
    updatedCriteria[criterionIndex].options![optionIndex][field] = value;
    setCriteriaConfig(updatedCriteria);
  };

  const resetForm = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setCriteriaConfig([{ 
      id: generateId(),
      name: '', 
      required: false, 
      type: 'rating' 
    }]);
    setHeaderType('evaluation');
    setIncludeFinalConsiderations(true);
  };

  const handleEdit = (template: EvaluationTemplate) => {
    // Definir o estado de edição primeiro
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    
    // Carregar configurações do template
    // Deriva headerType: novo campo tem prioridade, senão usa includeHeader como fallback
    if (template.headerType) {
      setHeaderType(template.headerType);
    } else if (template.includeHeader === false) {
      setHeaderType(undefined);
    } else {
      setHeaderType('evaluation');
    }
    setIncludeFinalConsiderations(template.includeFinalConsiderations === true);
    
    // Converter criteria antigas para nova estrutura se necessário
    if (template.criteriaConfig && template.criteriaConfig.length > 0) {
      // Garantir que todos os critérios tenham IDs e tipos
      const updatedCriteria = template.criteriaConfig.map(criterion => ({
        ...criterion,
        id: criterion.id || generateId(),
        type: criterion.type || 'rating'
      }));
      setCriteriaConfig(updatedCriteria);
    } else if (template.criteria && template.criteria.length > 0) {
      // Compatibilidade com templates antigos
      const convertedCriteria = template.criteria.map(name => ({ 
        id: generateId(),
        name, 
        required: false, 
        type: 'rating' as const 
      }));
      setCriteriaConfig(convertedCriteria);
    } else {
      // Fallback para templates vazios
      setCriteriaConfig([{ 
        id: generateId(),
        name: '', 
        required: false, 
        type: 'rating' 
      }]);
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
    const hasHeader = headerType !== undefined;
    const templateData = {
      name: templateName.trim(),
      criteria: criteriaConfig.map(c => c.name.trim()).filter(Boolean), // Compatibilidade
      criteriaConfig: criteriaConfig.map(c => ({
        id: c.id || generateId(),
        name: c.name.trim(),
        required: c.required,
        type: c.type || 'rating',
        options: c.options || [],
        placeholder: c.placeholder || '',
        description: c.description || ''
      })).filter(c => c.name),
      includeHeader: hasHeader,
      headerType,
      includeFinalConsiderations,
      isFormOnly: !hasHeader,
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

  const importExampleTemplates = async () => {
    if (window.confirm('Deseja importar os modelos de exemplo? Isso criará novos modelos de formulário prontos para uso.')) {
      setIsSaving(true);
      try {
        const importedTemplates: EvaluationTemplate[] = [];
        for (const template of exampleTemplates) {
          const saved = await saveTemplate(template);
          importedTemplates.push(saved);
        }
        setTemplates(prev => [...prev, ...importedTemplates]);
        alert(`${importedTemplates.length} modelos de exemplo foram importados com sucesso!`);
      } catch (error) {
        console.error("Falha ao importar modelos:", error);
        alert("Falha ao importar os modelos de exemplo. Tente novamente.");
      } finally {
        setIsSaving(false);
      }
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
    setUserCanAccessMN10(false);
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
    setUserCanAccessMN10(user.role === 'admin' ? true : user.canAccessMN10 === true);
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
      canAccessMN10: userRole === 'admin' ? true : userCanAccessMN10,
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
      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent whitespace-nowrap min-w-0 ${
        activeSubTab === tabName
          ? 'bg-brand-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header com sub-abas */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand-primary" />
          Gerenciar Sistema
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <SubTabButton tabName="models" label="Modelos" icon={<FileText className="h-4 w-4" />} />
          <SubTabButton tabName="forms" label="Formulários" icon={<FileText className="h-4 w-4" />} />
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

              {/* Configurações do Template */}
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Configurações do Formulário</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Tipo de Cabeçalho</p>
                    <div className="space-y-2">
                      <label className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                        headerType === undefined
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === undefined}
                          onChange={() => setHeaderType(undefined)}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-accent mt-0.5"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-700">Sem cabeçalho</span>
                          <span className="block text-xs text-gray-500">
                            Apenas os campos do formulário, sem dados de identificação. Ideal para pesquisas e formulários simples.
                          </span>
                        </div>
                      </label>
                      <label className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                        headerType === 'evaluation'
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === 'evaluation'}
                          onChange={() => setHeaderType('evaluation')}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-accent mt-0.5"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-700">Cabeçalho de Avaliação</span>
                          <span className="block text-xs text-gray-500">
                            Campos: Matrícula, Motorista, Setor, Turno, Filial, VT, Data e Média Geral.
                          </span>
                        </div>
                      </label>
                      <label className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                        headerType === 'rh'
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === 'rh'}
                          onChange={() => setHeaderType('rh')}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-accent mt-0.5"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-700">Cabeçalho de RH</span>
                          <span className="block text-xs text-gray-500">
                            Campos: Nome do Colaborador, Função, Turno Principal, Equipe/Setor, Filial, Data e Média Geral.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="includeFinalConsiderations"
                      type="checkbox"
                      checked={includeFinalConsiderations}
                      onChange={(e) => setIncludeFinalConsiderations(e.target.checked)}
                      className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                    />
                    <label htmlFor="includeFinalConsiderations" className="ml-2 block text-sm text-gray-700">
                      <span className="font-medium">Incluir campo de considerações finais</span>
                      <span className="block text-xs text-gray-500">
                        Campo para observações, pontos positivos e melhorias.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Campos do Formulário</h3>
                <p className="text-sm text-gray-600 mb-3">Configure os campos que aparecerão no formulário de avaliação</p>
                <div className="space-y-4">
                  {criteriaConfig.map((criterion, index) => (
                    <div key={criterion.id || index} className="p-4 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 text-gray-400 mt-1">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-grow space-y-4">
                          {/* Nome do Campo */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Nome do Campo"
                              value={criterion.name}
                              onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                              placeholder="Ex: Estado do veículo"
                              required
                            />
                            <Select
                              label="Tipo do Campo"
                              value={criterion.type || 'rating'}
                              onChange={(e) => handleCriterionChange(index, 'type', e.target.value as FieldType)}
                              required
                            >
                              <option value="rating">Avaliação (1-10)</option>
                              <option value="rating-5">Avaliação (1-5)</option>
                              <option value="text">Texto</option>
                              <option value="radio">Múltipla Escolha</option>
                              <option value="date">Data</option>
                              <option value="checkbox">Checkbox</option>
                            </Select>
                          </div>

                          {/* Configurações específicas por tipo */}
                          {(criterion.type === 'text' || criterion.type === 'date') && (
                            <Input
                              label="Placeholder"
                              value={criterion.placeholder || ''}
                              onChange={(e) => handleCriterionChange(index, 'placeholder', e.target.value)}
                              placeholder="Texto de exemplo para o usuário"
                            />
                          )}

                          {criterion.type === 'radio' && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Opções de Múltipla Escolha</h4>
                              <div className="space-y-2">
                                {(criterion.options || [{ label: '', value: '' }]).map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <Input
                                      label={`Opção ${optionIndex + 1} - Texto`}
                                      value={option.label}
                                      onChange={(e) => handleRadioOptionChange(index, optionIndex, 'label', e.target.value)}
                                      placeholder="Ex: Excelente"
                                      className="flex-1"
                                    />
                                    <Input
                                      label={`Opção ${optionIndex + 1} - Valor`}
                                      value={option.value}
                                      onChange={(e) => handleRadioOptionChange(index, optionIndex, 'value', e.target.value)}
                                      placeholder="Ex: excelente"
                                      className="flex-1"
                                    />
                                    <div className="flex items-end">
                                      <Button
                                        type="button"
                                        onClick={() => removeRadioOption(index, optionIndex)}
                                        variant="secondary"
                                        className="!py-2 !px-3 !bg-red-100 !text-red-700 hover:!bg-red-200"
                                        disabled={(criterion.options?.length || 0) <= 1}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  onClick={() => addRadioOption(index)}
                                  variant="secondary"
                                  className="!py-1 !px-3 text-sm"
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Adicionar Opção
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Descrição/Ajuda */}
                          <Input
                            label="Descrição (opcional)"
                            value={criterion.description || ''}
                            onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                            placeholder="Texto de ajuda para orientar o avaliador"
                          />

                          {/* Campo obrigatório */}
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
                        
                        {/* Botões de ação */}
                        <div className="flex flex-col items-center gap-1">
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
                            aria-label="Remover campo"
                            disabled={criteriaConfig.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-4">
                  <Button type="button" onClick={addCriterion} variant="secondary">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Campo
                  </Button>
                  <Button 
                    type="button" 
                    onClick={importExampleTemplates} 
                    variant="secondary"
                    className="!bg-blue-100 !text-blue-700 hover:!bg-blue-200"
                    disabled={isSaving}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Importar Modelos de Exemplo
                  </Button>
                </div>
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
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-800">{template.name}</p>
                            {template.headerType ? (
                              <>
                                {template.headerType === 'evaluation' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Avaliação
                                  </span>
                                )}
                                {template.headerType === 'rh' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    RH
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {template.includeHeader === false && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Formulário
                                  </span>
                                )}
                                {template.includeHeader === true && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Avaliação
                                  </span>
                                )}
                              </>
                            )}
                            {template.headerType === undefined && template.includeHeader !== true && template.includeHeader !== false && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Formulário
                              </span>
                            )}
                          </div>
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

                <div className="flex items-center gap-3">
                  <input
                    id="userCanAccessMN10"
                    type="checkbox"
                    checked={userRole === 'admin' ? true : userCanAccessMN10}
                    onChange={(e) => setUserCanAccessMN10(e.target.checked)}
                    disabled={userRole === 'admin'}
                    className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                  />
                  <label htmlFor="userCanAccessMN10" className="text-sm text-gray-700">
                    Acesso ao MN10 {userRole === 'admin' ? '(sempre habilitado para admin)' : ''}
                  </label>
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
                            {(user.role === 'admin' || user.canAccessMN10) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                MN10
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

      {/* Conteúdo da aba Formulários */}
      {activeSubTab === 'forms' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
                <FileText className="h-6 w-6 text-brand-primary" />
                Formulários Simples
              </h2>
              <p className="text-gray-600 mb-4">
                Formulários sem cabeçalho de avaliação - ideais para coleta de dados, pesquisas e relatórios simples.
              </p>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                </div>
              ) : templates.filter(t => !t.headerType && t.includeHeader === false).length > 0 ? (
                <ul className="space-y-3">
                  {templates.filter(t => !t.headerType && t.includeHeader === false).map(template => (
                    <li key={template.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-800">{template.name}</p>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Formulário
                            </span>
                          </div>
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
                                  <span className="text-gray-400 uppercase text-xs">
                                    {criterion.type === 'rating' ? 'AVAL' :
                                     criterion.type === 'rating-5' ? 'AVAL 1-5' :
                                     criterion.type === 'text' ? 'TEXTO' :
                                     criterion.type === 'radio' ? 'OPÇÃO' :
                                     criterion.type === 'date' ? 'DATA' :
                                     criterion.type === 'checkbox' ? 'CHECK' : ''}
                                  </span>
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
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nenhum formulário simples foi criado ainda.</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Para criar um formulário simples, vá em "Modelos" e desmarque a opção "Incluir cabeçalho de avaliação".
                  </p>
                  <Button onClick={() => setActiveSubTab('models')} variant="secondary">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Criar Formulário
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
