import PDFDocument from "pdfkit";
import type { Invoice, InvoiceItem } from "@shared/schema";

function formatTR(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function numberToWords(amount: number): string {
  const ones = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const tens = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const bigs = ["", "Bin", "Milyon", "Milyar", "Trilyon"];

  if (amount === 0) return "Sıfır Türk Lirası";
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  function threeDigits(n: number): string {
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (h > 0) result += (h === 1 ? "Yüz" : ones[h] + " Yüz");
    if (t > 0) result += (result ? " " : "") + tens[t];
    if (o > 0) result += (result ? " " : "") + ones[o];
    return result;
  }

  let words = "";
  let num = intPart;
  let groupIndex = 0;
  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      const groupStr = (groupIndex === 1 && group === 1) ? "" : threeDigits(group);
      const bigStr = bigs[groupIndex];
      const part = (groupStr + (groupStr && bigStr ? " " : "") + bigStr).trim();
      words = part + (words ? " " + words : "");
    }
    num = Math.floor(num / 1000);
    groupIndex++;
  }

  let result = words + " Türk Lirası";
  if (decPart > 0) {
    result += " " + threeDigits(decPart) + " Kuruş";
  }
  return result.trim();
}

function toAscii(text: string): string {
  const map: Record<string, string> = {
    "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I",
    "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U",
    "â": "a", "Â": "A", "î": "i", "Î": "I", "û": "u", "Û": "U",
    "₺": "TL",
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ₺]/g, (ch) => map[ch] || ch);
}

const BLUE = "#2563EB";
const LIGHT_BLUE = "#F0F5FF";
const DARK = "#333333";
const GRAY = "#666666";
const LIGHT_GRAY = "#999999";

function drawLine(doc: any, y: number, x1: number, x2: number, color = "#DDDDDD") {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();
}

export async function generateInvoicePDF(invoice: Invoice, items: InvoiceItem[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc: any = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageW = doc.page.width - 80;
      const leftM = 40;
      const rightEdge = leftM + pageW;

      const subtotal = parseFloat(invoice.subtotal || "0");
      const kdvAmount = parseFloat(invoice.kdvAmount || "0");
      const tevkifatAmount = parseFloat(invoice.tevkifatAmount || "0");
      const total = parseFloat(invoice.total || "0");
      const typeLabel = invoice.invoiceType === "iade" ? "IADE FATURASI" : invoice.invoiceType === "tevkifat" ? "TEVKIFATLI FATURA" : "SATIS FATURASI";

      doc.fillColor(BLUE).fontSize(20).font("Helvetica-Bold").text(typeLabel, leftM, 40);
      doc.fillColor(GRAY).fontSize(9).font("Helvetica").text("rentai24.com", leftM, 62);

      doc.fillColor(DARK).fontSize(9).font("Helvetica");
      const metaX = rightEdge - 180;
      let metaY = 40;
      doc.font("Helvetica-Bold").text("Fatura No:", metaX, metaY, { width: 80 });
      doc.font("Helvetica").text(invoice.invoiceNo, metaX + 82, metaY);
      metaY += 14;
      doc.font("Helvetica-Bold").text("Fatura Tarihi:", metaX, metaY, { width: 80 });
      doc.font("Helvetica").text(invoice.invoiceDate, metaX + 82, metaY);
      if (invoice.dueDate) {
        metaY += 14;
        doc.font("Helvetica-Bold").text("Vade Tarihi:", metaX, metaY, { width: 80 });
        doc.font("Helvetica").text(invoice.dueDate, metaX + 82, metaY);
      }

      const headerBottomY = metaY + 22;
      doc.moveTo(leftM, headerBottomY).lineTo(rightEdge, headerBottomY).strokeColor(BLUE).lineWidth(2).stroke();

      let y = headerBottomY + 15;
      const partyW = (pageW - 20) / 2;

      doc.fillColor(BLUE).fontSize(10).font("Helvetica-Bold").text("SATICI", leftM + 10, y);
      doc.fillColor(BLUE).text("ALICI", leftM + partyW + 20 + 10, y);
      y += 16;

      doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold");
      doc.text(toAscii(invoice.sellerName || "—"), leftM + 10, y, { width: partyW - 20 });
      doc.text(toAscii(invoice.buyerName), leftM + partyW + 30, y, { width: partyW - 20 });
      y += 13;

      doc.font("Helvetica").fontSize(8).fillColor(GRAY);
      const sellerLines: string[] = [];
      if (invoice.sellerTaxOffice) sellerLines.push(toAscii(`Vergi Dairesi: ${invoice.sellerTaxOffice}`));
      if (invoice.sellerTaxNo) sellerLines.push(`VKN/TCKN: ${invoice.sellerTaxNo}`);
      if (invoice.sellerAddress) sellerLines.push(toAscii(invoice.sellerAddress));

      const buyerLines: string[] = [];
      if (invoice.buyerTaxOffice) buyerLines.push(toAscii(`Vergi Dairesi: ${invoice.buyerTaxOffice}`));
      if (invoice.buyerTaxNo) buyerLines.push(`VKN/TCKN: ${invoice.buyerTaxNo}`);
      if (invoice.buyerAddress) buyerLines.push(toAscii(invoice.buyerAddress));

      const maxLines = Math.max(sellerLines.length, buyerLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (sellerLines[i]) doc.text(sellerLines[i], leftM + 10, y, { width: partyW - 20 });
        if (buyerLines[i]) doc.text(buyerLines[i], leftM + partyW + 30, y, { width: partyW - 20 });
        y += 12;
      }

      y += 10;

      const colWidths = [30, pageW - 30 - 50 - 50 - 80 - 45 - 80, 50, 50, 80, 45, 80];
      const colStarts: number[] = [];
      let cx = leftM;
      for (const w of colWidths) { colStarts.push(cx); cx += w; }
      const colHeaders = ["#", "Aciklama", "Miktar", "Birim", "Birim Fiyat", "KDV", "Tutar"];
      const colAligns: ("left" | "center" | "right")[] = ["center", "left", "center", "center", "right", "center", "right"];

      doc.rect(leftM, y, pageW, 20).fill(BLUE);
      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
      for (let i = 0; i < colHeaders.length; i++) {
        const align = colAligns[i];
        const textX = align === "right" ? colStarts[i] : colStarts[i] + 4;
        const textW = align === "right" ? colWidths[i] - 8 : colWidths[i] - 8;
        doc.text(colHeaders[i], textX, y + 5, { width: textW, align });
      }
      y += 20;

      doc.font("Helvetica").fontSize(8).fillColor(DARK);
      items.forEach((item, idx) => {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 40;
        }

        if (idx % 2 === 0) {
          doc.rect(leftM, y, pageW, 18).fill(LIGHT_BLUE);
        }

        doc.fillColor(DARK).fontSize(8).font("Helvetica");
        const rowY = y + 4;
        const rowData = [
          String(idx + 1),
          toAscii(item.description),
          formatTR(parseFloat(item.quantity)),
          toAscii(item.unit || "Adet"),
          formatTR(parseFloat(item.unitPrice)) + " TL",
          `%${item.kdvRate || 20}`,
          formatTR(parseFloat(item.amount)) + " TL",
        ];

        for (let i = 0; i < rowData.length; i++) {
          const align = colAligns[i];
          const textX = align === "right" ? colStarts[i] : colStarts[i] + 4;
          const textW = align === "right" ? colWidths[i] - 8 : colWidths[i] - 8;
          doc.text(rowData[i], textX, rowY, { width: textW, align });
        }
        y += 18;
      });

      drawLine(doc, y, leftM, rightEdge);
      y += 15;

      const totalsX = rightEdge - 200;
      const totalsLabelW = 110;
      const totalsValW = 80;

      const totalRows: [string, string][] = [
        ["Ara Toplam:", formatTR(subtotal) + " TL"],
        [`KDV (%${invoice.kdvRate || 20}):`, formatTR(kdvAmount) + " TL"],
      ];
      if (tevkifatAmount > 0) {
        totalRows.push([`Tevkifat (${invoice.tevkifatRate}):`, "-" + formatTR(tevkifatAmount) + " TL"]);
      }

      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      for (const [label, val] of totalRows) {
        doc.text(label, totalsX, y, { width: totalsLabelW, align: "right" });
        doc.text(val, totalsX + totalsLabelW + 5, y, { width: totalsValW, align: "right" });
        y += 14;
      }

      y += 2;
      doc.rect(totalsX - 5, y - 2, totalsLabelW + totalsValW + 15, 20).fill(BLUE);
      doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
      doc.text("GENEL TOPLAM:", totalsX, y + 3, { width: totalsLabelW, align: "right" });
      doc.text(formatTR(total) + " TL", totalsX + totalsLabelW + 5, y + 3, { width: totalsValW, align: "right" });
      y += 30;

      doc.fillColor(DARK).font("Helvetica").fontSize(8);
      doc.rect(leftM, y, pageW, 18).fill(LIGHT_BLUE);
      doc.fillColor(GRAY).text(`Yalniz: ${toAscii(numberToWords(total))}`, leftM + 8, y + 4, { width: pageW - 16 });
      y += 28;

      if (invoice.notes) {
        doc.moveTo(leftM, y).lineTo(leftM, y + 30).strokeColor(BLUE).lineWidth(2).stroke();
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("Notlar:", leftM + 8, y + 2);
        doc.font("Helvetica").fillColor(GRAY).text(toAscii(invoice.notes), leftM + 8, y + 13, { width: pageW - 20 });
        y += 40;
      }

      const footerY = doc.page.height - 50;
      drawLine(doc, footerY, leftM, rightEdge);
      doc.fillColor(LIGHT_GRAY).fontSize(7).font("Helvetica");
      doc.text(
        "Bu fatura bilgilendirme amaclidir. E-Fatura mukellefiyetiniz varsa GIB portali uzerinden resmi e-fatura duzenlemeniz gerekmektedir.",
        leftM,
        footerY + 5,
        { width: pageW, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
