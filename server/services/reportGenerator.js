const { parse } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportGenerator {
  async generateCSV(data) {
    if (!data || data.length === 0) return '';
    return parse(data);
  }

  async generateExcel(data, type) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ResuMatch ATS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));
    
    if (data && data.length > 0) {
      // Create headers
      const columns = Object.keys(data[0]).map(key => ({
        header: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        key: key,
        width: 20
      }));
      sheet.columns = columns;

      // Add rows
      sheet.addRows(data);

      // Style header
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    return await workbook.xlsx.writeBuffer();
  }

  generatePDF(data, type, stream) {
    const doc = new PDFDocument({ margin: 50, layout: 'landscape' });
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(`ResuMatch ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    if (!data || data.length === 0) {
      doc.fontSize(12).text('No data available for the selected criteria.', { align: 'center' });
      doc.end();
      return;
    }

    // Very basic table implementation
    const headers = Object.keys(data[0]);
    const columnWidth = (doc.page.width - 100) / headers.length;
    
    // Draw headers
    doc.font('Helvetica-Bold').fontSize(10);
    let startX = 50;
    headers.forEach(header => {
      const text = header.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      doc.text(text, startX, doc.y, { width: columnWidth, align: 'left' });
      startX += columnWidth;
    });
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    // Draw rows
    doc.font('Helvetica').fontSize(9);
    data.forEach((row, i) => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(10);
        let sx = 50;
        headers.forEach(header => {
          const text = header.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          doc.text(text, sx, doc.y, { width: columnWidth, align: 'left' });
          sx += columnWidth;
        });
        doc.moveDown();
        doc.font('Helvetica').fontSize(9);
      }

      startX = 50;
      const initialY = doc.y;
      let maxY = initialY;
      
      headers.forEach(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        if (val instanceof Date) val = val.toISOString().split('T')[0];
        
        doc.text(String(val).substring(0, 50), startX, initialY, { width: columnWidth - 5, align: 'left' });
        if (doc.y > maxY) maxY = doc.y;
        startX += columnWidth;
      });
      
      doc.y = maxY;
      doc.moveDown(0.5);
      
      // Zebra striping
      if (i % 2 === 0) {
        doc.rect(50, initialY - 2, doc.page.width - 100, maxY - initialY + 4).fillAndStroke('#f9f9f9', '#f9f9f9');
        doc.fillColor('black');
        
        // Redraw text over background
        startX = 50;
        headers.forEach(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          if (val instanceof Date) val = val.toISOString().split('T')[0];
          doc.text(String(val).substring(0, 50), startX, initialY, { width: columnWidth - 5, align: 'left' });
          startX += columnWidth;
        });
      }
    });

    // Footer
    doc.fontSize(8).text('Confidential HR Document', 50, doc.page.height - 50, { align: 'center' });

    doc.end();
  }
}

module.exports = new ReportGenerator();
