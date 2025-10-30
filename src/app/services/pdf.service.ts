import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({ providedIn: 'root' })
export class PdfService {
  async export(canvasTarget: HTMLElement, content: string[], filename = 'roof-measurement.pdf'): Promise<void> {
    console.log('Starting html2canvas capture...');
    const canvas = await html2canvas(canvasTarget, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
      allowTaint: true,
      foreignObjectRendering: false,
      logging: false,
      width: canvasTarget.offsetWidth,
      height: canvasTarget.offsetHeight,
      scrollX: 0,
      scrollY: 0
    });
    console.log('html2canvas capture completed');

    const imageData = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    doc.setFont('helvetica');

    let y = 40;
    doc.setFontSize(22);
    doc.text('Roof Measurement Report', 40, y);
    doc.setFontSize(12);

    content.forEach(line => doc.text(line, 40, y += 20));
    y += 20;

    const imgWidth = 500;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.addImage(imageData, 'PNG', 40, y, imgWidth, imgHeight);

    doc.save(filename);
  }
}