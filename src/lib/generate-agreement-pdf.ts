import jsPDF from 'jspdf';

export const generateAgreementPDF = (content: string, title: string): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 20);
  
  // Content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Split content into lines that fit the page
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  // Process content - handle markdown-style formatting
  const lines = content.split('\n');
  let y = 35;
  const lineHeight = 5;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  lines.forEach((line) => {
    // Check if we need a new page
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    
    // Handle headers
    if (line.startsWith('## ')) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      y += 3;
      const headerText = line.replace('## ', '');
      doc.text(headerText, margin, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      y += lineHeight + 2;
    } else if (line.startsWith('# ')) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      y += 5;
      const headerText = line.replace('# ', '');
      doc.text(headerText, margin, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      y += lineHeight + 3;
    } else if (line.startsWith('**') && line.endsWith('**')) {
      doc.setFont('helvetica', 'bold');
      const boldText = line.replace(/\*\*/g, '');
      doc.text(boldText, margin, y);
      doc.setFont('helvetica', 'normal');
      y += lineHeight;
    } else if (line.startsWith('- ')) {
      const bulletText = doc.splitTextToSize(line, maxWidth - 5);
      bulletText.forEach((textLine: string) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(textLine, margin + 5, y);
        y += lineHeight;
      });
    } else if (line.trim() === '---') {
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    } else if (line.trim() === '') {
      y += 3;
    } else {
      // Regular text - wrap to fit
      const wrappedText = doc.splitTextToSize(line, maxWidth);
      wrappedText.forEach((textLine: string) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(textLine, margin, y);
        y += lineHeight;
      });
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Sida ${i} av ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
