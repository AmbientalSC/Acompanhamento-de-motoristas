import jsPDF from 'jspdf';
import type { Evaluation, EvaluationGrading, EvaluationTemplate, HeaderSubject } from '../types';
import { getEvaluationStatus } from '../utils/evaluationUtils';
import { formatHeaderValue, getEvaluationSubject } from '../utils/headerUtils';
import { isTrustedImageUrl } from '../utils/imageUtils';
import { getTemplates } from './firebaseService';

interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

export interface EvaluationPdfResult {
  // Perguntas com imagem que não puderam entrar no PDF (o PDF é gerado mesmo assim)
  missingImages: number;
}

export const describeMissingPdfImages = (count: number): string =>
  `PDF gerado, mas ${count === 1 ? '1 imagem das perguntas não pôde' : `${count} imagens das perguntas não puderam`} ser incluída${count === 1 ? '' : 's'}. Avise o TI.`;

// Tipo do relatório: vem do snapshot do cabeçalho ou, nas avaliações antigas, dos dados gravados
type ReportKind = 'driver' | 'rh' | 'candidate';

const REPORT_KIND_BY_SUBJECT: Record<HeaderSubject, ReportKind> = {
  driver: 'driver',
  employee: 'rh',
  candidate: 'candidate',
};

const getReportKind = (evaluation: Evaluation): ReportKind =>
  REPORT_KIND_BY_SUBJECT[getEvaluationSubject(evaluation)];

const REPORT_TITLES: Record<ReportKind, string> = {
  driver: 'RELATÓRIO DE AVALIAÇÃO DE MOTORISTA',
  rh: 'RELATÓRIO DE AVALIAÇÃO DE COLABORADOR',
  candidate: 'RELATÓRIO DE TESTE DE CANDIDATO',
};

const INFO_TITLES: Record<ReportKind, string> = {
  driver: 'INFORMAÇÕES DO MOTORISTA',
  rh: 'INFORMAÇÕES DO COLABORADOR',
  candidate: 'INFORMAÇÕES DO CANDIDATO',
};

// `YYYY-MM-DD` → `DD/MM/YYYY` sem passar por Date (new Date('2026-10-22') é UTC e mostraria o dia anterior no Brasil)
const formatIsoDate = (isoDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// Imagens das perguntas são reduzidas antes de entrar no PDF (um teste pode ter dezenas delas)
const PDF_IMAGE_MAX_PX = 800;
const PDF_IMAGE_JPEG_QUALITY = 0.85;
const PDF_IMAGE_MAX_WIDTH_MM = 60;
const PDF_IMAGE_MAX_HEIGHT_MM = 45;

export class PDFService {
  // Falha ao carregar o modelo não impede o PDF: sem ele só se perde a ordem/nomes dos critérios e as imagens
  private static async loadTemplate(templateId: string): Promise<EvaluationTemplate | undefined> {
    try {
      const templates = await getTemplates();
      return templates.find(t => t.id === templateId);
    } catch (error) {
      console.warn('Erro ao carregar o modelo para o PDF:', error);
      return undefined;
    }
  }

  // Baixa a imagem (o Storage responde com CORS aberto), reduz e converte para JPEG; `null` se não carregar
  private static loadImage(url: string): Promise<PdfImage | null> {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, PDF_IMAGE_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        // JPEG não tem transparência: fundo branco evita áreas pretas em PNG/WebP
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', PDF_IMAGE_JPEG_QUALITY), width, height });
        } catch (error) {
          console.warn('Erro ao converter imagem da pergunta para o PDF:', error);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('Erro ao carregar imagem da pergunta para o PDF:', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // Imagens das perguntas corrigidas, indexadas pelo id do critério (imagens repetidas são baixadas uma vez).
  // `requested` é quantas perguntas têm imagem: a diferença para `images.size` são as que falharam.
  private static async loadGradingImages(
    grading: EvaluationGrading,
    template: EvaluationTemplate | undefined
  ): Promise<{ images: Map<string, PdfImage>; requested: number }> {
    const urlByCriterion = new Map<string, string>();
    grading.items.forEach(item => {
      const url = template?.criteriaConfig?.find(c => c.id === item.criterionId)?.imageUrl;
      if (url && isTrustedImageUrl(url)) urlByCriterion.set(item.criterionId, url);
    });

    const uniqueUrls = [...new Set(urlByCriterion.values())];
    const loaded = await Promise.all(uniqueUrls.map(async url => [url, await this.loadImage(url)] as const));
    const imageByUrl = new Map(loaded);

    const imageByCriterion = new Map<string, PdfImage>();
    urlByCriterion.forEach((url, criterionId) => {
      const image = imageByUrl.get(url);
      if (image) imageByCriterion.set(criterionId, image);
    });
    return { images: imageByCriterion, requested: urlByCriterion.size };
  }

  private static async loadLogo(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar canvas'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error('Erro ao carregar logo'));
      };
      img.src = './ambiental.svg';
    });
  }

  static async generateEvaluationPDF(evaluation: Evaluation): Promise<EvaluationPdfResult> {
    // Começa já: o modelo carrega enquanto o cabeçalho (logo) é montado
    const templatePromise = this.loadTemplate(evaluation.templateId);
    const reportKind = getReportKind(evaluation);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;

    // Cabeçalho com logo - altura aumentada para acomodar logo centralizada
    pdf.setFillColor(30, 64, 175); // brand-primary
    pdf.rect(0, 0, pageWidth, 60, 'F');
    
    try {
      // Carregar e adicionar logo - centralizada acima do título
      const logoDataURL = await this.loadLogo();
      const logoWidth = 57;
      const logoHeight = 30;
      const logoX = (pageWidth - logoWidth) / 2; // Centralizar horizontalmente
      pdf.addImage(logoDataURL, 'PNG', logoX, 10, logoWidth, logoHeight);
      
      // Título do relatório - abaixo da logo centralizada
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(REPORT_TITLES[reportKind], pageWidth / 2, 50, { align: 'center' });
    } catch (error) {
      console.warn('Erro ao carregar logo, usando texto como fallback:', error);
      // Fallback: texto da logo
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AMBIENTAL', pageWidth / 2, 25, { align: 'center' });
      
      // Título do relatório
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(REPORT_TITLES[reportKind], pageWidth / 2, 50, { align: 'center' });
    }
    
    // Posição inicial do conteúdo - ajustada para dar espaço ao cabeçalho
    yPosition = 80;

    // Informações
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(INFO_TITLES[reportKind], margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    const dateText = formatIsoDate(evaluation.data);
    const infoByKind: Record<ReportKind, Array<{ label: string; value: string }>> = {
      candidate: [
        { label: 'Nome:', value: evaluation.motorista },
        { label: 'Telefone:', value: evaluation.telefone || '' },
        { label: 'Data:', value: dateText },
        { label: 'Modelo:', value: evaluation.templateName }
      ],
      rh: [
        { label: 'Nome:', value: evaluation.nomeColaborador || evaluation.motorista },
        { label: 'Função:', value: evaluation.funcao || '' },
        { label: 'Turno Principal:', value: evaluation.turnoPrincipal || '' },
        { label: 'Equipe/Setor:', value: evaluation.equipeSetor || '' },
        { label: 'Filial:', value: evaluation.filial },
        { label: 'Data:', value: dateText },
        { label: 'Modelo:', value: evaluation.templateName }
      ],
      driver: [
        { label: 'Nome:', value: evaluation.motorista },
        { label: 'Matrícula:', value: evaluation.matricula },
        { label: 'Setor:', value: evaluation.setor },
        { label: 'Turno:', value: evaluation.turno },
        { label: 'Filial:', value: evaluation.filial },
        { label: 'Veículo:', value: evaluation.vt },
        { label: 'Data da Avaliação:', value: dateText },
        { label: 'Modelo de Avaliação:', value: evaluation.templateName }
      ],
    };

    // Avaliações com snapshot listam os campos do cabeçalho como foram preenchidos
    const headerInfo = evaluation.headerSnapshot
      ? [
          ...evaluation.headerSnapshot.fields.map(field => ({
            label: `${field.label}:`,
            value: formatHeaderValue(field.type, field.value),
          })),
          { label: 'Modelo:', value: evaluation.templateName },
        ]
      : infoByKind[reportKind];

    // Todos os valores quebram linha (campos livres do cabeçalho podem ser longos) e trocam de página se preciso
    const valueWidth = contentWidth - 60; // Espaço disponível após o label
    headerInfo.forEach(info => {
      const valueLines = this.splitTextToFit(info.value, valueWidth);
      if (yPosition + valueLines.length * 6 > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, margin, yPosition);
      pdf.setFont('helvetica', 'normal');

      if (valueLines.length > 1) {
        valueLines.forEach(line => {
          pdf.text(line, margin + 60, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.text(info.value, margin + 60, yPosition);
        yPosition += 8;
      }
    });

    yPosition += 10;

    // Pontuações por critério (formulários sem notas, ex.: testes com gabarito, não têm esta seção)
    const hasScores = Object.keys(evaluation.scores || {}).length > 0;

    if (hasScores) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PONTUAÇÕES POR CRITÉRIO', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Cabeçalho da tabela
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text('Critério', margin + 2, yPosition);
      pdf.text('Pontuação', margin + contentWidth - 20, yPosition);
      yPosition += 8;
    }

    // Dados da tabela
    pdf.setFont('helvetica', 'normal');

    // Tenta mapear os ids das pontuações para os nomes (labels) do template usado
    let orderedEntries: [string, number][] = [];
    try {
      const template = await templatePromise;
      const entries = Object.entries(evaluation.scores || {});

      if (template) {
        // Se houver configuração expandida (criteriaConfig), usa-a para ordenar e obter labels
        if (template.criteriaConfig && template.criteriaConfig.length > 0) {
          const added = new Set<string>();

          for (const crit of template.criteriaConfig) {
            const byId = entries.find(([k]) => k === crit.id);
            const byName = entries.find(([k]) => k === crit.name);
            const found = byId || byName;
            if (found && !added.has(found[0])) {
              orderedEntries.push([crit.name, found[1] as number]);
              added.add(found[0]);
            }
          }

          // Adiciona quaisquer campos restantes que não estavam no template (compatibilidade)
          for (const [k, v] of entries) {
            if (!added.has(k)) {
              const conf = template.criteriaConfig!.find(c => c.id === k || c.name === k);
              orderedEntries.push([conf ? conf.name : k, v as number]);
              added.add(k);
            }
          }
        } else if (template.criteria && template.criteria.length > 0) {
          // Versão legada: criteria é uma lista de chaves (pode ser id ou name)
          const added = new Set<string>();
          for (const key of template.criteria) {
            const found = entries.find(([k]) => k === key);
            if (found && !added.has(found[0])) {
              orderedEntries.push([found[0], found[1] as number]);
              added.add(found[0]);
            } else {
              // tenta mapear pelo nome em criteriaConfig quando disponível
              const conf = template.criteriaConfig?.find(c => c.name === key || c.id === key);
              if (conf) {
                const f2 = entries.find(([k]) => k === conf.id || k === conf.name);
                if (f2 && !added.has(f2[0])) {
                  orderedEntries.push([conf.name, f2[1] as number]);
                  added.add(f2[0]);
                }
              }
            }
          }

          for (const [k, v] of entries) {
            if (!added.has(k)) {
              orderedEntries.push([k, v as number]);
              added.add(k);
            }
          }
        } else {
          // Sem informação de template suficiente: mantém a ordem natural
          orderedEntries = entries.map(([k, v]) => [k, v as number]);
        }
      } else {
        orderedEntries = entries.map(([k, v]) => [k, v as number]);
      }
    } catch (err) {
      console.warn('Erro ao carregar templates para mapear critérios no PDF:', err);
      orderedEntries = Object.entries(evaluation.scores || {}).map(([k, v]) => [k, v as number]);
    }

    for (const [criterionLabel, score] of orderedEntries) {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(criterionLabel, margin + 2, yPosition);
      pdf.text(score.toString(), margin + contentWidth - 20, yPosition);
      yPosition += 6;
    }

    if (hasScores) {
      yPosition += 10;
    }

    // Média geral com status (só quando há média; formulários sem notas não têm)
    if (evaluation.averageScore !== undefined) {
      const avg = evaluation.averageScore;
      const status = getEvaluationStatus(avg, evaluation.ratingScale);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`MÉDIA GERAL: ${avg.toFixed(2)} (${status.label})`, margin, yPosition);
      yPosition += 15;
    }

    let missingImages = 0;
    if (evaluation.grading) {
      const { images, requested } = await this.loadGradingImages(evaluation.grading, await templatePromise);
      missingImages = requested - images.size;
      yPosition = this.drawGradingSection(pdf, evaluation.grading, images, margin, contentWidth, pageHeight, yPosition);
    }

    // Observações
    if (evaluation.pros || evaluation.contras || evaluation.consideracoes) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OBSERVAÇÕES', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      if (evaluation.pros) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Pontos Positivos:', margin, yPosition);
        yPosition += 6;
        pdf.setFont('helvetica', 'normal');
        const prosLines = this.splitTextToFit(evaluation.pros, contentWidth - 10);
        prosLines.forEach(line => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }

      if (evaluation.contras) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Pontos de Melhoria:', margin, yPosition);
        yPosition += 6;
        pdf.setFont('helvetica', 'normal');
        const contrasLines = this.splitTextToFit(evaluation.contras, contentWidth - 10);
        contrasLines.forEach(line => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }

      if (evaluation.consideracoes) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Considerações Gerais:', margin, yPosition);
        yPosition += 6;
        pdf.setFont('helvetica', 'normal');
        const consideracoesLines = this.splitTextToFit(evaluation.consideracoes, contentWidth - 10);
        consideracoesLines.forEach(line => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
      }
    }

    // Rodapé
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    // Salvar PDF
    const fileName = `avaliacao_${evaluation.motorista}_${evaluation.data.replace(/-/g, '')}.pdf`;
    pdf.save(fileName);

    return { missingImages };
  }

  static async generateDriverAnalysisPDF(evaluations: Evaluation[]): Promise<void> {
    if (evaluations.length === 0) {
      alert('Nenhuma avaliação encontrada para gerar relatório.');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;

    // Cabeçalho com logo - altura aumentada para acomodar logo centralizada
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 60, 'F');
    
    try {
      // Carregar e adicionar logo - centralizada acima do título
      const logoDataURL = await this.loadLogo();
      const logoWidth = 57;
      const logoHeight = 30;
      const logoX = (pageWidth - logoWidth) / 2; // Centralizar horizontalmente
      pdf.addImage(logoDataURL, 'PNG', logoX, 10, logoWidth, logoHeight);
      
      // Título do relatório - abaixo da logo centralizada
      const isRhAnalysis = !!evaluations[0]?.nomeColaborador;
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isRhAnalysis ? 'ANÁLISE DE DESEMPENHO DO COLABORADOR' : 'ANÁLISE DE DESEMPENHO DO MOTORISTA', pageWidth / 2, 50, { align: 'center' });
    } catch (error) {
      console.warn('Erro ao carregar logo, usando texto como fallback:', error);
      const isRhAnalysis2 = !!evaluations[0]?.nomeColaborador;
      // Fallback: texto da logo
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AMBIENTAL', pageWidth / 2, 25, { align: 'center' });
      
      // Título do relatório
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isRhAnalysis2 ? 'ANÁLISE DE DESEMPENHO DO COLABORADOR' : 'ANÁLISE DE DESEMPENHO DO MOTORISTA', pageWidth / 2, 50, { align: 'center' });
    }
    
    // Posição inicial do conteúdo - ajustada para dar espaço ao cabeçalho
    yPosition = 80;

    // Informações
    const driverName = evaluations[0].motorista;
    const driverMatricula = evaluations[0].matricula;
    const isRhAnalytics = !!evaluations[0]?.nomeColaborador;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(isRhAnalytics ? 'INFORMAÇÕES DO COLABORADOR' : 'INFORMAÇÕES DO MOTORISTA', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nome:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(driverName, margin + 40, yPosition);
    yPosition += 8;

    if (isRhAnalytics && evaluations[0]?.funcao) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Função:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(evaluations[0].funcao, margin + 40, yPosition);
      yPosition += 8;
    }
    
    if (isRhAnalytics) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Equipe/Setor:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(evaluations[0].equipeSetor || '', margin + 40, yPosition);
      yPosition += 8;
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Matrícula:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(driverMatricula, margin + 40, yPosition);
      yPosition += 8;
    }
    yPosition += 7;

    // Estatísticas gerais
  const totalEvaluations = evaluations.length;
  const scoreValues = evaluations.map(e => e.averageScore).filter((v): v is number => typeof v === 'number');
  const averageScore = scoreValues.length > 0 ? (scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length) : 0;
  const bestScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
  const worstScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESTATÍSTICAS GERAIS', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const stats = [
      { label: 'Total de Avaliações:', value: totalEvaluations.toString() },
      { label: 'Média Geral:', value: averageScore.toFixed(2) },
      { label: 'Melhor Pontuação:', value: bestScore.toFixed(2) },
      { label: 'Pior Pontuação:', value: worstScore.toFixed(2) }
    ];

    stats.forEach(stat => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(stat.label, margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(stat.value, margin + 60, yPosition);
      yPosition += 8;
    });

    yPosition += 10;

    // Histórico de avaliações
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HISTÓRICO DE AVALIAÇÕES', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Cabeçalho da tabela
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data', margin + 2, yPosition);
    pdf.text('Filial', margin + 35, yPosition);
    pdf.text('Turno', margin + 70, yPosition);
    pdf.text('Média', margin + 100, yPosition);
    pdf.text('Status', margin + 130, yPosition);
    pdf.text('Modelo', margin + 160, yPosition);
    yPosition += 8;

    // Dados da tabela
    pdf.setFont('helvetica', 'normal');
    evaluations.forEach(evaluation => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      const date = formatIsoDate(evaluation.data);
  const status = getEvaluationStatus(evaluation.averageScore ?? 0, evaluation.ratingScale);
      
      pdf.text(date, margin + 2, yPosition);
      pdf.text(evaluation.filial, margin + 35, yPosition);
      pdf.text(evaluation.turno, margin + 70, yPosition);
  pdf.text((evaluation.averageScore ?? 0).toFixed(2), margin + 100, yPosition);
      pdf.text(status.label, margin + 130, yPosition);
      pdf.text(evaluation.templateName, margin + 160, yPosition);
      yPosition += 6;
    });

    // Rodapé
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    // Salvar PDF
    const fileName = `analise_${driverName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  }

  // Seção "RESULTADO DO TESTE": acertos e, por pergunta, imagem (quando houver) e resposta dada × esperada
  private static drawGradingSection(
    pdf: jsPDF,
    grading: EvaluationGrading,
    images: Map<string, PdfImage>,
    margin: number,
    contentWidth: number,
    pageHeight: number,
    startY: number
  ): number {
    let yPosition = startY;
    const bottomLimit = pageHeight - 30;

    const ensureSpace = (needed: number) => {
      if (yPosition + needed > bottomLimit) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    ensureSpace(30);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESULTADO DO TESTE', margin, yPosition);
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.text(`${grading.correct} de ${grading.total} acertos (${grading.percentage}%)`, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    grading.items.forEach(item => {
      const nameLines: string[] = pdf.splitTextToSize(item.name, contentWidth - 30);
      const answerLine = `Resposta: ${item.given || 'Sem resposta'}` +
        (item.isCorrect ? '' : `   |   Esperado: ${item.expected}`);
      const answerLines: string[] = pdf.splitTextToSize(answerLine, contentWidth - 5);

      // Imagem ajustada à caixa máxima, mantendo a proporção
      const image = images.get(item.criterionId);
      const imageRatio = image
        ? Math.min(PDF_IMAGE_MAX_WIDTH_MM / image.width, PDF_IMAGE_MAX_HEIGHT_MM / image.height)
        : 0;
      const imageWidth = image ? image.width * imageRatio : 0;
      const imageHeight = image ? image.height * imageRatio : 0;

      ensureSpace((nameLines.length + answerLines.length) * 5 + 4 + (image ? imageHeight + 3 : 0));

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(nameLines, margin, yPosition);
      if (item.isCorrect) {
        pdf.setTextColor(22, 163, 74);
      } else {
        pdf.setTextColor(220, 38, 38);
      }
      pdf.text(item.isCorrect ? 'CORRETA' : 'ERRADA', margin + contentWidth, yPosition, { align: 'right' });
      yPosition += nameLines.length * 5;

      if (image) {
        const imageY = yPosition - 2;
        pdf.addImage(image.dataUrl, 'JPEG', margin + 3, imageY, imageWidth, imageHeight);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margin + 3, imageY, imageWidth, imageHeight);
        yPosition += imageHeight + 3;
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(answerLines, margin + 3, yPosition);
      yPosition += answerLines.length * 5 + 3;
    });

    pdf.setTextColor(0, 0, 0);
    return yPosition + 10;
  }

  private static splitTextToFit(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length * 2.5 < maxWidth) { // Aproximação do tamanho da fonte
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
} 