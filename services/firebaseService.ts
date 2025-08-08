import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
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
        includeFinalConsiderations: data.includeFinalConsiderations,
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
    const dataToSave = {
      name: templateData.name,
      criteria: templateData.criteria || [], // Compatibilidade
      includeHeader: templateData.includeHeader,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      createdAt: Timestamp.now(),
    };
    
    // Adicionar criteriaConfig se existir
    if (templateData.criteriaConfig) {
      (dataToSave as any).criteriaConfig = templateData.criteriaConfig;
    }
    
    const docRef = await addDoc(collection(db, 'templates'), dataToSave);
    
    return {
      id: docRef.id,
      name: templateData.name,
      criteria: templateData.criteria || [],
      criteriaConfig: templateData.criteriaConfig,
      includeHeader: templateData.includeHeader,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
    };
  } catch (error) {
    console.error('Erro ao salvar modelo:', error);
    throw new Error('Falha ao salvar modelo');
  }
};

export const updateTemplate = async (templateId: string, templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
  try {
    const templateRef = doc(db, 'templates', templateId);
    
    const dataToUpdate = {
      name: templateData.name,
      criteria: templateData.criteria || [], // Compatibilidade
      includeHeader: templateData.includeHeader,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
      updatedAt: Timestamp.now(),
    };
    
    // Adicionar criteriaConfig se existir
    if (templateData.criteriaConfig) {
      (dataToUpdate as any).criteriaConfig = templateData.criteriaConfig;
    }
    
    await updateDoc(templateRef, dataToUpdate);
    
    return {
      id: templateId,
      name: templateData.name,
      criteria: templateData.criteria || [],
      criteriaConfig: templateData.criteriaConfig,
      includeHeader: templateData.includeHeader,
      includeFinalConsiderations: templateData.includeFinalConsiderations,
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
    await addDoc(collection(db, 'evaluations'), {
      ...evaluationData,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
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
    const users: User[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        position: data.position,
        branches: data.branches || [],
        isActive: data.isActive !== false, // default true
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis(),
      });
    });
    
    return users;
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
    const docRef = await addDoc(collection(db, 'users'), {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
      isActive: userData.isActive,
      authUID: authUser.uid, // Vincular com o UID do Firebase Auth
      createdAt: Timestamp.now(),
    });
    
    return {
      id: docRef.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position,
      branches: userData.branches,
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

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    throw new Error('Falha ao excluir usuário');
  }
}; 