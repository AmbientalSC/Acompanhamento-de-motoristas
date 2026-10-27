import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EvaluationHeader, EvaluationTemplate, HeaderField, HeaderSubject } from '../../types';
import { deleteHeader, ensureDefaultHeaders, getHeaders, saveHeader, updateHeader } from '../../services/headerService';
import { getTemplates } from '../../services/firebaseService';
import {
  HEADER_ROLES,
  SUBJECT_LABELS,
  createHeaderField,
  getTemplateHeaderId,
  isDefaultHeaderId,
  validateHeader,
  withDefaultHeaders,
} from '../../utils/headerUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Checkbox from '../ui/Checkbox';
import ConfirmDialog from '../ui/ConfirmDialog';
import FormActionBar from '../ui/FormActionBar';
import Icon from '../ui/Icon';
import Input from '../ui/Input';
import Select from '../ui/Select';
import HeaderFieldEditor from './HeaderFieldEditor';

type HeaderDraft = Omit<EvaluationHeader, 'id'>;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const createDraft = (): HeaderDraft => ({
  name: '',
  subject: 'driver',
  computesAverage: true,
  fields: [createHeaderField('person', generateId()), createHeaderField('date', generateId())],
});

const SUBJECTS: HeaderSubject[] = ['driver', 'employee', 'candidate'];

const sortByName = (headers: EvaluationHeader[]): EvaluationHeader[] =>
  [...headers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const BADGE_CLASSES = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

// Cria e edita os cabeçalhos reutilizáveis que os modelos escolhem. Só administradores chegam aqui
// (a aba Gerenciar exige `canManageSystem`), e as regras do Firestore também restringem a escrita.
const HeaderManager: React.FC = () => {
  const [headers, setHeaders] = useState<EvaluationHeader[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HeaderDraft>(createDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EvaluationHeader | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [stored, fetchedTemplates] = await Promise.all([getHeaders(), getTemplates()]);
        setTemplates(fetchedTemplates);
        setHeaders(withDefaultHeaders(stored));
        // Na primeira visita grava os três cabeçalhos padrão; se falhar, eles continuam listados
        // (`updateHeader` usa merge, então editar um padrão ainda não gravado também o cria)
        try {
          setHeaders(sortByName(await ensureDefaultHeaders(stored)));
        } catch (seedError) {
          console.error('Erro ao gravar cabeçalhos padrão:', seedError);
        }
      } catch (error) {
        console.error('Erro ao carregar cabeçalhos:', error);
        setLoadError('Não foi possível carregar os cabeçalhos. Confira se as regras do Firestore (firestore.rules) foram publicadas.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const usageCount = (headerId: string): number =>
    templates.filter(template => getTemplateHeaderId(template) === headerId).length;

  const resetForm = useCallback(() => {
    setEditingId(null);
    setDraft(createDraft());
  }, []);

  const handleEdit = (header: EvaluationHeader) => {
    setEditingId(header.id);
    setDraft({ name: header.name, subject: header.subject, computesAverage: header.computesAverage, fields: header.fields });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const updateField = (index: number, field: HeaderField) => {
    setDraft(prev => ({ ...prev, fields: prev.fields.map((current, i) => (i === index ? field : current)) }));
  };

  const moveField = (index: number, offset: -1 | 1) => {
    setDraft(prev => {
      const target = index + offset;
      if (target < 0 || target >= prev.fields.length) return prev;
      const fields = [...prev.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...prev, fields };
    });
  };

  const removeField = (index: number) => {
    setDraft(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
  };

  const addField = () => {
    setDraft(prev => ({ ...prev, fields: [...prev.fields, createHeaderField('custom', generateId())] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateHeader(draft);
    if (error) {
      alert(error);
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await updateHeader(editingId, draft);
        setHeaders(prev => sortByName(prev.map(header => (header.id === editingId ? updated : header))));
      } else {
        const saved = await saveHeader(draft);
        setHeaders(prev => sortByName([...prev, saved]));
      }
      resetForm();
    } catch (saveError) {
      console.error('Falha ao salvar cabeçalho:', saveError);
      alert(saveError instanceof Error && saveError.message ? saveError.message : 'Falha ao salvar o cabeçalho. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteHeader(pendingDelete.id);
      setHeaders(prev => prev.filter(header => header.id !== pendingDelete.id));
      if (editingId === pendingDelete.id) resetForm();
    } catch (deleteError) {
      console.error('Falha ao excluir cabeçalho:', deleteError);
      alert('Falha ao excluir o cabeçalho. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  // Excluir só cabeçalhos criados pelos administradores e que nenhum modelo usa
  const deleteBlockReason = (header: EvaluationHeader): string | null => {
    if (isDefaultHeaderId(header.id)) return 'Cabeçalho padrão: pode ser editado, mas não excluído.';
    if (usageCount(header.id) > 0) return 'Para excluir, troque antes o cabeçalho desses modelos.';
    return null;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Icon name="alert-circle" className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span className="min-w-0 break-words">{loadError}</span>
        </div>
      )}

      <div ref={formRef} className="scroll-mt-20" />
      {/* overflow visível: o overflow-hidden padrão do Card quebraria a barra sticky de ações */}
      <Card className="!overflow-visible">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
            <Icon name={editingId ? 'pencil' : 'circle-plus'} className="h-6 w-6 text-brand-primary" />
            {editingId ? 'Editando Cabeçalho' : 'Criar Novo Cabeçalho'}
          </h2>

          {editingId && (
            <p className="rounded-brand bg-brand-light px-3 py-2 text-sm text-brand-primary">
              As alterações valem para as próximas avaliações. As já preenchidas mantêm o cabeçalho com que foram salvas.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Cabeçalho"
              value={draft.name}
              onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Candidato a Motorista"
              required
            />
            <Select
              label="Quem é identificado"
              value={draft.subject}
              onChange={(e) => setDraft(prev => ({ ...prev, subject: e.target.value as HeaderSubject }))}
            >
              {SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{SUBJECT_LABELS[subject]}</option>
              ))}
            </Select>
          </div>

          <Checkbox
            label="Calcular média geral"
            name="header-computes-average"
            checked={draft.computesAverage}
            onChange={(computesAverage) => setDraft(prev => ({ ...prev, computesAverage }))}
            description="Com média, a avaliação vai para a Análise por Motorista e para o Dashboard Geral (se o modelo tiver campos de nota). Sem média, fica em Formulários Preenchidos."
          />

          <div>
            <h3 className="text-lg font-semibold text-brand-dark mb-1">Campos do Cabeçalho</h3>
            <p className="text-sm text-gray-600 mb-3">
              O papel liga o campo aos dashboards e ao PDF. Todo cabeçalho precisa de "Nome da pessoa" e "Data".
            </p>
            <div className="space-y-4">
              {draft.fields.map((field, index) => (
                <HeaderFieldEditor
                  key={field.id}
                  field={field}
                  index={index}
                  total={draft.fields.length}
                  onChange={updateField}
                  onMoveUp={(i) => moveField(i, -1)}
                  onMoveDown={(i) => moveField(i, 1)}
                  onRemove={removeField}
                />
              ))}
            </div>
            <Button type="button" onClick={addField} variant="secondary" className="mt-4 w-full sm:w-auto">
              <Icon name="circle-plus" className="h-4 w-4" />
              Adicionar Campo
            </Button>
          </div>

          <FormActionBar
            isEditing={editingId !== null}
            isSaving={isSaving}
            saveLabel={editingId ? 'Salvar Alterações' : 'Salvar Novo Cabeçalho'}
            onCancel={resetForm}
          />
        </form>
      </Card>

      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
            <Icon name="id" className="h-6 w-6 text-brand-primary" />
            Cabeçalhos Existentes
          </h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Icon name="loader-2" className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
          ) : headers.length > 0 ? (
            <ul className="space-y-4">
              {headers.map(header => {
                const blockReason = deleteBlockReason(header);
                const count = usageCount(header.id);
                return (
                  <li key={header.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-grow">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words font-semibold text-brand-dark">{header.name}</p>
                          <span className={`${BADGE_CLASSES} bg-brand-light text-brand-primary`}>{SUBJECT_LABELS[header.subject]}</span>
                          <span className={`${BADGE_CLASSES} ${header.computesAverage ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {header.computesAverage ? 'Com média' : 'Sem média'}
                          </span>
                          {isDefaultHeaderId(header.id) && (
                            <span className={`${BADGE_CLASSES} bg-gray-100 text-gray-700`}>Padrão</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {header.fields.map(field => (
                            <span key={field.id} className="inline-flex max-w-full items-center gap-1 text-xs bg-white px-2 py-1 rounded border">
                              <span className="truncate max-w-[9.5rem]" title={field.label}>{field.label}</span>
                              {field.required && <span className="text-red-500 font-bold">*</span>}
                              {field.role !== 'custom' && (
                                <span className="text-gray-500 text-xs">{HEADER_ROLES[field.role].label}</span>
                              )}
                            </span>
                          ))}
                        </div>
                        {/* Motivo visível (não só no title do botão): no celular não há hover */}
                        <p className="mt-2 text-xs text-gray-600">
                          {count === 0 ? 'Nenhum modelo usa este cabeçalho.' : `Usado em ${count} modelo${count === 1 ? '' : 's'}.`}
                          {blockReason && ` ${blockReason}`}
                        </p>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-shrink-0 lg:ml-auto">
                        <Button onClick={() => handleEdit(header)} variant="secondary" size="sm" aria-label={`Editar cabeçalho ${header.name}`}>
                          <Icon name="pencil" className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => setPendingDelete(header)}
                          variant="danger"
                          size="sm"
                          disabled={blockReason !== null}
                          title={blockReason ?? undefined}
                          aria-label={`Excluir cabeçalho ${header.name}`}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum cabeçalho cadastrado.</p>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir cabeçalho"
        message={`Tem certeza que deseja excluir o cabeçalho "${pendingDelete?.name ?? ''}"? As avaliações já preenchidas não são afetadas.`}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default HeaderManager;
