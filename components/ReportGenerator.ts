
import { jsPDF } from 'jspdf';
import { CVAnalysisResult, CompanyMatch } from '../types';

export const generatePDFReport = (result: CVAnalysisResult, matches: CompanyMatch[], userName: string = 'Usuario') => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('es-AR');
  
  const config = {
    margin: 25,
    pageWidth: 210,
    pageHeight: 297,
    contentWidth: 160,
    lineHeight: 7,
    colors: {
      primary: [30, 58, 95],
      accent: [37, 99, 235],
      text: [55, 65, 81],
      slate: [100, 116, 139],
      emerald: [16, 185, 129],
      amber: [245, 158, 11],
      red: [239, 68, 68]
    }
  };

  let currentY = 0;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > config.pageHeight - config.margin) {
      doc.addPage();
      addFooter();
      currentY = config.margin;
      return true;
    }
    return false;
  };

  const addFooter = () => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(config.colors.slate[0], config.colors.slate[1], config.colors.slate[2]);
    doc.text('Creado por Ignacio Grizzo | @computadoras.grizzo', config.margin, 288);
    doc.text(`Página ${pageCount}`, config.pageWidth / 2, 288, { align: 'center' });
    doc.text(date, config.pageWidth - config.margin, 288, { align: 'right' });
  };

  currentY = config.margin;
  
  doc.setFillColor(config.colors.accent[0], config.colors.accent[1], config.colors.accent[2]);
  doc.rect(0, 0, config.pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CV Booster Argentina', config.margin, 25);
  
  currentY = 55;
  doc.setTextColor(config.colors.primary[0], config.colors.primary[1], config.colors.primary[2]);
  doc.setFontSize(14);
  doc.text('Informe de Análisis de CV Determinístico', config.margin, currentY);
  currentY += 15;

  doc.setTextColor(config.colors.text[0], config.colors.text[1], config.colors.text[2]);
  doc.setFontSize(11);
  doc.text(`Candidato: ${userName}`, config.margin, currentY);
  currentY += 8;
  doc.text(`Hash del análisis: ${result.hash?.substring(0,16) || 'N/A'}`, config.margin, currentY);
  currentY += 20;

  let scoreColor = config.colors.red;
  if (result.score >= 80) scoreColor = config.colors.emerald;
  else if (result.score >= 60) scoreColor = config.colors.amber;
  
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(48);
  doc.text(`${result.score}`, config.margin, currentY);
  doc.setFontSize(14);
  doc.text('/ 100', config.margin + 35, currentY);
  currentY += 20;

  // Breakdown Section in PDF
  doc.setTextColor(config.colors.primary[0], config.colors.primary[1], config.colors.primary[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transparencia de Análisis:', config.margin, currentY);
  currentY += 10;

  Object.entries(result.breakdown).forEach(([key, cat]) => {
    checkPageBreak(30);
    doc.setTextColor(config.colors.primary[0], config.colors.primary[1], config.colors.primary[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.label}: ${cat.points}/100`, config.margin, currentY);
    currentY += 6;
    doc.setTextColor(config.colors.text[0], config.colors.text[1], config.colors.text[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    cat.details.forEach(d => {
      doc.text(`- ${d}`, config.margin + 5, currentY);
      currentY += 5;
    });
    currentY += 5;
  });

  doc.addPage();
  currentY = config.margin;
  addFooter();
  
  doc.setTextColor(config.colors.primary[0], config.colors.primary[1], config.colors.primary[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Recomendaciones de Mejora', config.margin, currentY);
  currentY += 15;

  result.recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec.suggestion, config.contentWidth);
    checkPageBreak((lines.length * 6) + 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`[ ] ${rec.section}: ${rec.issue}`, config.margin, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, config.margin + 5, currentY);
    currentY += (lines.length * config.lineHeight) + 10;
  });

  addFooter();
  doc.save(`Informe_Consistente_${userName.replace(/\s/g, '_')}.pdf`);
};
