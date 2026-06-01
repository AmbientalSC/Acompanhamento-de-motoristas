import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Evaluation, EvaluationTemplate, User } from '../types';

// Serviços para Modelos (Templates)
export const getTemplates = async (): Promise<EvaluationTemplate[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'templates'));
    const templates: EvaluationTemplate[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        criteria: data.criteria || [], // Compatibilidade com dados antigos
        criteriaConfig: data.criteriaConfig || undefined, // Nova estrutura
        includeHeader: data.includeHeader,
        headerType: data.headerType,
        includeFinalConsiderations: data.includeFinalConsiderations,
        isFormOnly: data.isFormOnly,
      });
    });
    
    return templates;
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    throw new Error('Falha ao carregar modelos');
  }
};

export const saveTemplate = async (templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
  try {
    const dataToSave: any = {
      name: templateData.name,
      criteria: templateData.criteria || [], // Compatibilidade
      includeHeader: templateData.includeHeader,
      headerType: templateData.headerType,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      isFormOnly: templateData.isFormOnly,
      createdAt: Timestamp.now(),
    };
    
    // Adicionar criteriaConfig se existir
    if (templateData.criteriaConfig) {
      dataToSave.criteriaConfig = templateData.criteriaConfig;
    }
    
    const docRef = await addDoc(collection(db, 'templates'), dataToSave);
    
    return {
      id: docRef.id,
      name: templateData.name,
      criteria: templateData.criteria || [],
      criteriaConfig: templateData.criteriaConfig,
      includeHeader: templateData.includeHeader,
      headerType: templateData.headerType,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      isFormOnly: templateData.isFormOnly,
    };
  } catch (error) {
    console.error('Erro ao salvar modelo:', error);
    throw new Error('Falha ao salvar modelo');
  }
};

export const updateTemplate = async (templateId: string, templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
  try {
    const templateRef = doc(db, 'templates', templateId);
    
    const dataToUpdate: any = {
      name: templateData.name,
      criteria: templateData.criteria || [], // Compatibilidade
      includeHeader: templateData.includeHeader,
      headerType: templateData.headerType,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      isFormOnly: templateData.isFormOnly,
      updatedAt: Timestamp.now(),
    };
    
    // Adicionar criteriaConfig se existir
    if (templateData.criteriaConfig) {
      dataToUpdate.criteriaConfig = templateData.criteriaConfig;
    }
    
    await updateDoc(templateRef, dataToUpdate);
    
    return {
      id: templateId,
      name: templateData.name,
      criteria: templateData.criteria || [],
      criteriaConfig: templateData.criteriaConfig,
      includeHeader: templateData.includeHeader,
      headerType: templateData.headerType,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      isFormOnly: templateData.isFormOnly,
    };
  } catch (error) {
    console.error('Erro ao atualizar modelo:', error);
    throw new Error('Falha ao atualizar modelo');
  }
};

export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'templates', templateId));
  } catch (error) {
    console.error('Erro ao excluir modelo:', error);
    throw new Error('Falha ao excluir modelo');
  }
};

// Serviços para Avaliações
export const saveEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'timestamp'>): Promise<void> => {
  try {
    console.log('Tentando salvar avaliação:', evaluationData);
    
    const dataToSave = {
      ...evaluationData,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    };
    
    console.log('Dados que serão salvos:', dataToSave);
    
    const docRef = await addDoc(collection(db, 'evaluations'), dataToSave);
    console.log('Avaliação salva com sucesso, ID:', docRef.id);
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    console.error('Detalhes do erro:', error);
    throw new Error('Falha ao salvar avaliação');
  }
};

export const getEvaluations = async (): Promise<Evaluation[]> => {
  try {
    const q = query(collection(db, 'evaluations'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const evaluations: Evaluation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      evaluations.push({
        id: doc.id,
        matricula: data.matricula,
        setor: data.setor,
        turno: data.turno,
        filial: data.filial,
        motorista: data.motorista,
        data: data.data,
        vt: data.vt,
        timestamp: data.timestamp.toMillis(),
        templateId: data.templateId,
        templateName: data.templateName,
        scores: data.scores || {},
        fieldValues: data.fieldValues || {},
        averageScore: data.averageScore,
        pros: data.pros,
        contras: data.contras,
        consideracoes: data.consideracoes,
      });
    });
    
    return evaluations;
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    throw new Error('Falha ao carregar avaliações');
  }
};

export const deleteEvaluation = async (evaluationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'evaluations', evaluationId));
  } catch (error) {
    console.error('Erro ao excluir avaliação:', error);
    throw new Error('Falha ao excluir avaliação');
  }
};

// Serviços para Filiais
export const getBranches = async (): Promise<string[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'branches'));
    const branches: string[] = [];
    
    querySnapshot.forEach((doc) => {
      branches.push(doc.data().name);
    });
    
    return branches;
  } catch (error) {
    console.error('Erro ao buscar filiais:', error);
    // Retorna filiais padrão se não conseguir carregar do Firebase
    return ['Central', 'Unidade Sul', 'Unidade Norte'];
  }
};

export const saveBranch = async (branchName: string): Promise<void> => {
  try {
    await addDoc(collection(db, 'branches'), {
      name: branchName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao salvar filial:', error);
    throw new Error('Falha ao salvar filial');
  }
};

export const deleteBranch = async (branchName: string): Promise<void> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'branches'));
    querySnapshot.forEach((doc) => {
      if (doc.data().name === branchName) {
        deleteDoc(doc.ref);
      }
    });
  } catch (error) {
    console.error('Erro ao excluir filial:', error);
    throw new Error('Falha ao excluir filial');
  }
};

// Serviços para Usuários
export const getUsers = async (): Promise<User[]> => {
  try {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    const usersByAuth = new Map<string, User>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const mappedUser: User = {
        id: doc.id,
        authUID: typeof data.authUID === 'string' && data.authUID.length > 0 ? data.authUID : doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        position: data.position,
        branches: data.branches || [],
        canAccessMN10: data.role === 'admin' ? true : data.canAccessMN10 === true,
        isActive: data.isActive !== false, // default true
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis(),
      };

      const dedupeKey = mappedUser.authUID || mappedUser.id;
      const existingUser = usersByAuth.get(dedupeKey);

      // Prefere o documento cujo ID já é o próprio UID do Auth.
      if (!existingUser || mappedUser.id === dedupeKey) {
        usersByAuth.set(dedupeKey, mappedUser);
      }
    });
    
    return Array.from(usersByAuth.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw new Error('Falha ao carregar usuários');
  }
};

export const saveUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User> => {
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const authUser = userCredential.user;
    
    // Salvar perfil do usuário no Firestore
    const userRef = doc(db, 'users', authUser.uid);
    await setDoc(userRef, {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
      canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
      isActive: userData.isActive,
      authUID: authUser.uid, // Vincular com o UID do Firebase Auth
      createdAt: Timestamp.now(),
    });
    
    return {
      id: authUser.uid,
      authUID: authUser.uid,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
      canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
      isActive: userData.isActive,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    if (error instanceof Error) {
      throw new Error(`Falha ao criar usuário: ${error.message}`);
    }
    throw new Error('Falha ao salvar usuário');
  }
};

export const updateUser = async (userId: string, userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<User> => {
  try {
    // Atualizar dados no Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
      canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
      isActive: userData.isActive,
      updatedAt: Timestamp.now(),
    });
    
    // Se senha foi fornecida, atualizar no Firebase Auth
    if (userData.password && userData.password.trim()) {
      // Nota: Para atualizar a senha, o usuário precisa estar autenticado
      // Em um cenário real, isso seria feito de forma mais segura
      console.log('Senha será atualizada para o usuário:', userData.email);
      // TODO: Implementar atualização de senha de forma segura
    }
    
    return {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
      canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
      isActive: userData.isActive,
      createdAt: Date.now(), // Será sobrescrito pelo valor real
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    if (error instanceof Error) {
      throw new Error(`Falha ao atualizar usuário: ${error.message}`);
    }
    throw new Error('Falha ao atualizar usuário');
  }
};

export const ensureUserDocumentByAuthUID = async (authUID: string, userData: User): Promise<User> => {
  const userRef = doc(db, 'users', authUID);
  const existingDoc = await getDoc(userRef);
  const createdAtMillis = userData.createdAt || Date.now();

  await setDoc(
    userRef,
    {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: Array.isArray(userData.branches) ? userData.branches : [],
      canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
      isActive: userData.isActive !== false,
      authUID,
      createdAt: existingDoc.exists()
        ? existingDoc.data().createdAt || Timestamp.fromMillis(createdAtMillis)
        : Timestamp.fromMillis(createdAtMillis),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  const isLegacyDoc = userData.id !== authUID;
  if (isLegacyDoc) {
    try {
      await deleteDoc(doc(db, 'users', userData.id));
    } catch (cleanupError) {
      console.warn('Falha ao limpar documento legado de usuário:', cleanupError);
    }
  }

  return {
    ...userData,
    id: authUID,
    authUID,
    canAccessMN10: userData.role === 'admin' ? true : userData.canAccessMN10 === true,
  };
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    throw new Error('Falha ao excluir usuário');
  }
}; 
