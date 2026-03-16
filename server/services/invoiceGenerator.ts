import puppeteer from "puppeteer";
import type { Invoice, InvoiceItem } from "@shared/schema";

function formatTR(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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

function buildInvoiceHTML(invoice: Invoice, items: InvoiceItem[]): string {
  const subtotal = parseFloat(invoice.subtotal || "0");
  const kdvAmount = parseFloat(invoice.kdvAmount || "0");
  const tevkifatAmount = parseFloat(invoice.tevkifatAmount || "0");
  const total = parseFloat(invoice.total || "0");

  const typeLabel = invoice.invoiceType === "iade" ? "İADE FATURASI" : invoice.invoiceType === "tevkifat" ? "TEVKİFATLI FATURA" : "SATIŞ FATURASI";

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#F0F5FF"}">
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${escapeHtml(item.description)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${formatTR(parseFloat(item.quantity))}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.unit || "Adet"}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatTR(parseFloat(item.unitPrice))} ₺</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">%${item.kdvRate || 20}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatTR(parseFloat(item.amount))} ₺</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 30px; color: #333; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 3px solid #2563EB; padding-bottom: 15px; }
  .header h1 { color: #2563EB; margin: 0; font-size: 22px; }
  .header .meta { text-align: right; }
  .parties { display: flex; gap: 30px; margin-bottom: 25px; }
  .party { flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background: #FAFBFF; }
  .party h3 { margin: 0 0 8px; color: #2563EB; font-size: 13px; text-transform: uppercase; }
  .party p { margin: 3px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #2563EB; color: white; padding: 10px 8px; font-size: 12px; border: 1px solid #2563EB; }
  .totals { float: right; width: 300px; }
  .totals table { margin-bottom: 0; }
  .totals td { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }
  .totals tr:last-child { background: #2563EB; color: white; font-weight: bold; }
  .words { clear: both; margin-top: 15px; padding: 10px; background: #F0F5FF; border-radius: 4px; font-size: 12px; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #888; text-align: center; }
  .notes { margin-top: 15px; padding: 10px; border-left: 3px solid #2563EB; background: #F8F9FE; font-size: 12px; }
</style>
</head><body>
  <div class="header">
    <div>
      <h1>${typeLabel}</h1>
      <p style="color:#666;margin:5px 0 0">rentai24.com</p>
    </div>
    <div class="meta">
      <p><strong>Fatura No:</strong> ${escapeHtml(invoice.invoiceNo)}</p>
      <p><strong>Fatura Tarihi:</strong> ${escapeHtml(invoice.invoiceDate)}</p>
      ${invoice.dueDate ? `<p><strong>Vade Tarihi:</strong> ${escapeHtml(invoice.dueDate)}</p>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Satıcı</h3>
      <p><strong>${escapeHtml(invoice.sellerName || "—")}</strong></p>
      ${invoice.sellerTaxOffice ? `<p>Vergi Dairesi: ${escapeHtml(invoice.sellerTaxOffice)}</p>` : ""}
      ${invoice.sellerTaxNo ? `<p>VKN/TCKN: ${escapeHtml(invoice.sellerTaxNo)}</p>` : ""}
      ${invoice.sellerAddress ? `<p>${escapeHtml(invoice.sellerAddress)}</p>` : ""}
    </div>
    <div class="party">
      <h3>Alıcı</h3>
      <p><strong>${escapeHtml(invoice.buyerName)}</strong></p>
      ${invoice.buyerTaxOffice ? `<p>Vergi Dairesi: ${escapeHtml(invoice.buyerTaxOffice)}</p>` : ""}
      ${invoice.buyerTaxNo ? `<p>VKN/TCKN: ${escapeHtml(invoice.buyerTaxNo)}</p>` : ""}
      ${invoice.buyerAddress ? `<p>${escapeHtml(invoice.buyerAddress)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Açıklama</th>
        <th style="width:70px">Miktar</th>
        <th style="width:60px">Birim</th>
        <th style="width:100px">Birim Fiyat</th>
        <th style="width:60px">KDV</th>
        <th style="width:110px">Tutar</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Ara Toplam</td><td style="text-align:right">${formatTR(subtotal)} ₺</td></tr>
      <tr><td>KDV (%${invoice.kdvRate || 20})</td><td style="text-align:right">${formatTR(kdvAmount)} ₺</td></tr>
      ${tevkifatAmount > 0 ? `<tr><td>Tevkifat (${invoice.tevkifatRate})</td><td style="text-align:right">-${formatTR(tevkifatAmount)} ₺</td></tr>` : ""}
      <tr><td>GENEL TOPLAM</td><td style="text-align:right">${formatTR(total)} ₺</td></tr>
    </table>
  </div>

  <div class="words">
    <strong>Yalnız:</strong> ${numberToWords(total)}
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notlar:</strong> ${escapeHtml(invoice.notes)}</div>` : ""}

  <div class="footer">
    Bu fatura bilgilendirme amaçlıdır. E-Fatura mükellefiyetiniz varsa GİB portalı üzerinden resmi e-fatura düzenlemeniz gerekmektedir.
  </div>
</body></html>`;
}

export async function generateInvoicePDF(invoice: Invoice, items: InvoiceItem[]): Promise<Buffer> {
  const html = buildInvoiceHTML(invoice, items);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
