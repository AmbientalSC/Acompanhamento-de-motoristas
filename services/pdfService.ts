import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Evaluation } from '../types';

export class PDFService {
  static async generateEvaluationPDF(evaluation: Evaluation): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;

    // Cabeçalho com logo
    pdf.setFillColor(30, 64, 175); // brand-primary
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo (texto como placeholder)
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AMBIENTAL', margin, 25);
    
    // Título do relatório
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RELATÓRIO DE AVALIAÇÃO DE MOTORISTA', pageWidth / 2, 60, { align: 'center' });
    
    yPosition = 80;

    // Informações do motorista
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
      pdf.text(info.value, margin + 40, yPosition);
      yPosition += 8;
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

    // Média geral
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`MÉDIA GERAL: ${evaluation.averageScore.toFixed(2)}`, margin, yPosition);
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

    // Cabeçalho com logo
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AMBIENTAL', margin, 25);
    
    // Título do relatório
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANÁLISE DE DESEMPENHO DO MOTORISTA', pageWidth / 2, 60, { align: 'center' });
    
    yPosition = 80;

    // Informações do motorista
    const driverName = evaluations[0].motorista;
    const driverMatricula = evaluations[0].matricula;
    
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
    pdf.text('Modelo', margin + 130, yPosition);
    yPosition += 8;

    // Dados da tabela
    pdf.setFont('helvetica', 'normal');
    evaluations.forEach(evaluation => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      const date = new Date(evaluation.data).toLocaleDateString('pt-BR');
      pdf.text(date, margin + 2, yPosition);
      pdf.text(evaluation.filial, margin + 35, yPosition);
      pdf.text(evaluation.turno, margin + 70, yPosition);
      pdf.text(evaluation.averageScore.toFixed(2), margin + 100, yPosition);
      pdf.text(evaluation.templateName, margin + 130, yPosition);
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