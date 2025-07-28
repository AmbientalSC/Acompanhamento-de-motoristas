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
import { db } from '../firebase';
import type { Evaluation, EvaluationTemplate } from '../types';

// Serviços para Modelos (Templates)
export const getTemplates = async (): Promise<EvaluationTemplate[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'templates'));
    const templates: EvaluationTemplate[] = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        name: doc.data().name,
        criteria: doc.data().criteria,
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
    const docRef = await addDoc(collection(db, 'templates'), {
      name: templateData.name,
      criteria: templateData.criteria,
      createdAt: Timestamp.now(),
    });
    
    return {
      id: docRef.id,
      name: templateData.name,
      criteria: templateData.criteria,
    };
  } catch (error) {
    console.error('Erro ao salvar modelo:', error);
    throw new Error('Falha ao salvar modelo');
  }
};

export const updateTemplate = async (templateId: string, templateData: Omit<EvaluationTemplate, 'id'>): Promise<EvaluationTemplate> => {
  try {
    const templateRef = doc(db, 'templates', templateId);
    await updateDoc(templateRef, {
      name: templateData.name,
      criteria: templateData.criteria,
      updatedAt: Timestamp.now(),
    });
    
    return {
      id: templateId,
      name: templateData.name,
      criteria: templateData.criteria,
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
        scores: data.scores,
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