import jsPDF from 'jspdf';
import type { Evaluation } from '../types';
import { getEvaluationStatus } from '../utils/evaluationUtils';

export class PDFService {
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

  static async generateEvaluationPDF(evaluation: Evaluation): Promise<void> {
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
      pdf.text('RELATÓRIO DE AVALIAÇÃO DE MOTORISTA', pageWidth / 2, 50, { align: 'center' });
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
      pdf.text('RELATÓRIO DE AVALIAÇÃO DE MOTORISTA', pageWidth / 2, 50, { align: 'center' });
    }
    
    // Posição inicial do conteúdo - ajustada para dar espaço ao cabeçalho
    yPosition = 80;

    // Informações do motorista
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMAÇÕES DO MOTORISTA', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const driverInfo = [
      { label: 'Nome:', value: evaluation.motorista },
      { label: 'Matrícula:', value: evaluation.matricula },
      { label: 'Setor:', value: evaluation.setor },
      { label: 'Turno:', value: evaluation.turno },
      { label: 'Filial:', value: evaluation.filial },
      { label: 'Veículo:', value: evaluation.vt },
      { label: 'Data da Avaliação:', value: new Date(evaluation.data).toLocaleDateString('pt-BR') },
      { label: 'Modelo de Avaliação:', value: evaluation.templateName }
    ];

    driverInfo.forEach(info => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      
      // Ajuste especial para "Modelo de Avaliação" - quebra de linha se necessário
      if (info.label === 'Modelo de Avaliação:') {
        const maxWidth = contentWidth - 60; // Espaço disponível após o label
        const valueLines = this.splitTextToFit(info.value, maxWidth);
        
        if (valueLines.length > 1) {
          // Se precisa de múltiplas linhas, ajusta o espaçamento
          pdf.text(valueLines[0], margin + 60, yPosition);
          yPosition += 6;
          
          for (let i = 1; i < valueLines.length; i++) {
            pdf.text(valueLines[i], margin + 60, yPosition);
            yPosition += 6;
          }
        } else {
          pdf.text(info.value, margin + 60, yPosition);
          yPosition += 8;
        }
      } else {
        pdf.text(info.value, margin + 60, yPosition);
        yPosition += 8;
      }
    });

    yPosition += 10;

    // Pontuações por critério
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

    // Dados da tabela
    pdf.setFont('helvetica', 'normal');
    Object.entries(evaluation.scores).forEach(([criterion, score]) => {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.text(criterion, margin + 2, yPosition);
      pdf.text(score.toString(), margin + contentWidth - 20, yPosition);
      yPosition += 6;
    });

    yPosition += 10;

    // Média geral com status
    const status = getEvaluationStatus(evaluation.averageScore);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`MÉDIA GERAL: ${evaluation.averageScore.toFixed(2)} (${status.label})`, margin, yPosition);
    yPosition += 15;

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
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANÁLISE DE DESEMPENHO DO MOTORISTA', pageWidth / 2, 50, { align: 'center' });
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
      pdf.text('ANÁLISE DE DESEMPENHO DO MOTORISTA', pageWidth / 2, 50, { align: 'center' });
    }
    
    // Posição inicial do conteúdo - ajustada para dar espaço ao cabeçalho
    yPosition = 80;

    // Informações do motorista
    const driverName = evaluations[0].motorista;
    const driverMatricula = evaluations[0].matricula;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMAÇÕES DO MOTORISTA', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nome:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(driverName, margin + 40, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Matrícula:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(driverMatricula, margin + 40, yPosition);
    yPosition += 15;

    // Estatísticas gerais
    const totalEvaluations = evaluations.length;
    const averageScore = evaluations.reduce((sum, e) => sum + e.averageScore, 0) / totalEvaluations;
    const bestScore = Math.max(...evaluations.map(e => e.averageScore));
    const worstScore = Math.min(...evaluations.map(e => e.averageScore));

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
      
      const date = new Date(evaluation.data).toLocaleDateString('pt-BR');
      const status = getEvaluationStatus(evaluation.averageScore);
      
      pdf.text(date, margin + 2, yPosition);
      pdf.text(evaluation.filial, margin + 35, yPosition);
      pdf.text(evaluation.turno, margin + 70, yPosition);
      pdf.text(evaluation.averageScore.toFixed(2), margin + 100, yPosition);
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