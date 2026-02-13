import jsPDF from 'jspdf';
import type { MN10Form, MN10Question, MN10Response } from '../types';

const isInternalQuestion = (question: MN10Question): boolean => question.visibility === 'internal';

const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('pt-BR');
};

const getQuestionById = (questions: MN10Question[], questionId: string): MN10Question | undefined => {
  return questions.find(question => question.id === questionId);
};

const getResponseQuestions = (form: MN10Form, response: MN10Response): MN10Question[] => {
  const baseQuestions =
    response.questionSnapshot && response.questionSnapshot.length > 0
      ? response.questionSnapshot
      : form.questions;
  const sortedBaseQuestions = baseQuestions.slice().sort((a, b) => a.order - b.order);
  const knownQuestionIds = new Set(sortedBaseQuestions.map(question => question.id));

  const answerQuestionIds = Object.keys(response.answers).filter(questionId => !knownQuestionIds.has(questionId));
  const internalAnswerQuestionIds = Object.keys(response.internalAnswers || {}).filter(
    questionId => !knownQuestionIds.has(questionId)
  );
  const attachmentQuestionIds = response.attachments
    .map(attachment => attachment.questionId)
    .filter(questionId => !knownQuestionIds.has(questionId));

  const extraQuestionIds = Array.from(
    new Set([...answerQuestionIds, ...internalAnswerQuestionIds, ...attachmentQuestionIds])
  );
  const extraQuestions: MN10Question[] = extraQuestionIds.map((questionId, index) => {
    const answerValue = response.answers[questionId] ?? (response.internalAnswers || {})[questionId];
    const hasAttachment = response.attachments.some(attachment => attachment.questionId === questionId);
    const hasInternalAnswer = (response.internalAnswers || {})[questionId] !== undefined;

    let inferredType: MN10Question['type'] = 'short_text';
    if (hasAttachment) {
      inferredType = 'file_upload';
    } else if (Array.isArray(answerValue)) {
      inferredType = 'multiple_choice';
    } else if (typeof answerValue === 'boolean') {
      inferredType = 'boolean';
    }

    return {
      id: questionId,
      title: `Pergunta removida (${questionId})`,
      type: inferredType,
      required: false,
      visibility: hasInternalAnswer ? 'internal' : 'public',
      order: sortedBaseQuestions.length + index,
    };
  });

  return [...sortedBaseQuestions, ...extraQuestions];
};

const formatAnswerValue = (
  questions: MN10Question[],
  response: MN10Response,
  questionId: string
): string => {
  const question = getQuestionById(questions, questionId);
  if (!question) {
    return 'Pergunta não encontrada';
  }

  const value = isInternalQuestion(question)
    ? (response.internalAnswers || {})[questionId]
    : response.answers[questionId];
  if (value === undefined || value === null) {
    if (question.type === 'file_upload') {
      const files = response.attachments.filter(item => item.questionId === questionId);
      if (files.length === 0) {
        return 'Sem arquivo';
      }
      return files.map(file => file.fileName).join(', ');
    }
    return 'Sem resposta';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Sem resposta';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  return String(value);
};

export class MN10PdfService {
  static generateMn10ResponsePDF(form: MN10Form, response: MN10Response): void {
    const responseQuestions = getResponseQuestions(form, response);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    let y = margin;

    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 28, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('MN10 - Resposta de Formulário', margin, 12);
    pdf.setFontSize(10);
    pdf.text(`Formulário: ${form.title}`, margin, 19);

    y = 36;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const metadataLines = [
      `ID da resposta: ${response.id}`,
      `ID público do formulário: ${form.publicId}`,
      `Enviado em: ${formatDateTime(response.submittedAt)}`,
      `Total de perguntas: ${responseQuestions.length}`,
    ];

    metadataLines.forEach(line => {
      pdf.text(line, margin, y);
      y += 6;
    });

    y += 2;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    responseQuestions.forEach((question, index) => {
        if (y > pageHeight - 25) {
          pdf.addPage();
          y = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        const internalTag = isInternalQuestion(question) ? ' [Interno]' : '';
        const title = `${index + 1}. ${question.title}${internalTag}${question.required ? ' *' : ''}`;
        const titleLines = pdf.splitTextToSize(title, contentWidth);
        pdf.text(titleLines, margin, y);
        y += titleLines.length * 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const answer = formatAnswerValue(responseQuestions, response, question.id);
        const answerLines = pdf.splitTextToSize(`Resposta: ${answer}`, contentWidth);
        pdf.text(answerLines, margin, y);
        y += answerLines.length * 4 + 3;

        const questionAttachments = response.attachments.filter(item => item.questionId === question.id);
        if (questionAttachments.length > 0) {
          questionAttachments.forEach(item => {
            if (y > pageHeight - 20) {
              pdf.addPage();
              y = margin;
            }
            const attachmentLine = `Anexo: ${item.fileName} (${(item.size / 1024).toFixed(1)} KB)`;
            const attachmentLines = pdf.splitTextToSize(attachmentLine, contentWidth);
            pdf.text(attachmentLines, margin + 3, y);
            y += attachmentLines.length * 4;
          });
          y += 2;
        }
      });

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${page}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    const safeTitle = form.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`mn10_${safeTitle}_${response.id}.pdf`);
  }
}
