import ExcelJS from "exceljs";

const BLUE = "2563EB";
const LIGHT_BLUE = "F0F5FF";
const MONEY_FMT = '#,##0.00 "₺"';

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell(c => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = { bottom: { style: "thin" } };
  });
}

function zebraRow(row: ExcelJS.Row, index: number) {
  if (index % 2 === 1) {
    row.eachCell(c => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
    });
  }
}

function addTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  const titleRow = ws.addRow([title]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, cols);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: BLUE } };
  titleRow.getCell(1).alignment = { horizontal: "center" };

  const subRow = ws.addRow([subtitle]);
  ws.mergeCells(subRow.number, 1, subRow.number, cols);
  subRow.getCell(1).font = { size: 10, color: { argb: "666666" } };
  subRow.getCell(1).alignment = { horizontal: "center" };

  ws.addRow([]);
}

interface MizanEntry {
  hesapKodu: string;
  hesapAdi: string;
  borcToplami: number;
  alacakToplami: number;
}

export async function generateMizan(data: {
  entries: MizanEntry[];
  title?: string;
  period?: string;
  companyName?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("Mizan", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  ws.columns = [
    { width: 12 }, { width: 35 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
  ];

  addTitle(ws, data.title || `${data.companyName || ""} Geçici Mizan`.trim(), data.period || "", 6);

  const hdr = ws.addRow(["Hesap Kodu", "Hesap Adı", "Borç Toplamı", "Alacak Toplamı", "Borç Kalanı", "Alacak Kalanı"]);
  applyHeaderStyle(hdr);

  let totalBorcT = 0, totalAlacakT = 0, totalBorcK = 0, totalAlacakK = 0;
  let currentClass = "";

  data.entries.forEach((e, i) => {
    const cls = e.hesapKodu.charAt(0);
    if (cls !== currentClass) {
      currentClass = cls;
      const classNames: Record<string, string> = {
        "1": "1 — Dönen Varlıklar", "2": "2 — Duran Varlıklar", "3": "3 — Kısa Vadeli Yükümlülükler",
        "4": "4 — Uzun Vadeli Yükümlülükler", "5": "5 — Özkaynaklar", "6": "6 — Gelir Tablosu Hesapları",
        "7": "7 — Maliyet Hesapları",
      };
      const classRow = ws.addRow([classNames[cls] || `Sınıf ${cls}`]);
      ws.mergeCells(classRow.number, 1, classRow.number, 6);
      classRow.getCell(1).font = { bold: true, size: 11, color: { argb: BLUE } };
      classRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDFB" } };
    }

    const borcKalani = Math.max(e.borcToplami - e.alacakToplami, 0);
    const alacakKalani = Math.max(e.alacakToplami - e.borcToplami, 0);
    totalBorcT += e.borcToplami;
    totalAlacakT += e.alacakToplami;
    totalBorcK += borcKalani;
    totalAlacakK += alacakKalani;

    const r = ws.addRow([e.hesapKodu, e.hesapAdi, e.borcToplami, e.alacakToplami, borcKalani, alacakKalani]);
    [3, 4, 5, 6].forEach(c => { r.getCell(c).numFmt = MONEY_FMT; });
    zebraRow(r, i);
  });

  ws.addRow([]);
  const totRow = ws.addRow(["", "TOPLAM", totalBorcT, totalAlacakT, totalBorcK, totalAlacakK]);
  totRow.eachCell(c => {
    c.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  });
  [3, 4, 5, 6].forEach(c => { totRow.getCell(c).numFmt = MONEY_FMT; });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

interface BordroEntry {
  ad: string;
  tc?: string;
  brutUcret: number;
}

export async function generateBordro(data: {
  employees: BordroEntry[];
  period?: string;
  companyName?: string;
  title?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("Bordro", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  ws.columns = [
    { width: 5 }, { width: 25 }, { width: 14 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 },
  ];

  addTitle(ws, data.title || `${data.companyName || ""} Aylık Bordro`.trim(), data.period || "", 12);

  const headers = ["#", "Ad Soyad", "TC Kimlik", "Brüt Ücret", "SGK İşçi %14", "İşsizlik %1", "GV Matrahı", "Gelir Vergisi", "Damga V.", "Net Ücret", "SGK İşveren", "Toplam Maliyet"];
  const hdr = ws.addRow(headers);
  applyHeaderStyle(hdr);

  let totals = { brut: 0, sgkIsci: 0, issizlik: 0, gvMatrah: 0, gv: 0, dv: 0, net: 0, sgkIsveren: 0, maliyet: 0 };

  data.employees.forEach((emp, i) => {
    const brut = emp.brutUcret;
    const sgkIsci = brut * 0.14;
    const issizlik = brut * 0.01;
    const gvMatrah = brut - sgkIsci - issizlik;
    const gv = gvMatrah * 0.15;
    const dv = brut * 0.00759;
    const net = brut - sgkIsci - issizlik - gv - dv;
    const sgkIsveren = brut * 0.2275;
    const maliyet = brut + sgkIsveren;

    totals.brut += brut; totals.sgkIsci += sgkIsci; totals.issizlik += issizlik;
    totals.gvMatrah += gvMatrah; totals.gv += gv; totals.dv += dv;
    totals.net += net; totals.sgkIsveren += sgkIsveren; totals.maliyet += maliyet;

    const r = ws.addRow([i + 1, emp.ad, emp.tc || "", brut, sgkIsci, issizlik, gvMatrah, gv, dv, net, sgkIsveren, maliyet]);
    [4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(c => { r.getCell(c).numFmt = MONEY_FMT; });
    zebraRow(r, i);
  });

  ws.addRow([]);
  const totRow = ws.addRow(["", "TOPLAM", "", totals.brut, totals.sgkIsci, totals.issizlik, totals.gvMatrah, totals.gv, totals.dv, totals.net, totals.sgkIsveren, totals.maliyet]);
  totRow.eachCell(c => {
    c.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  });
  [4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(c => { totRow.getCell(c).numFmt = MONEY_FMT; });

  const disclaimerRow = ws.addRow(["", "Bu hesaplama yaklaşıktır. GV kümülatif matrah dilimleri ve asgari ücret istisnası ayrıca değerlendirilmelidir."]);
  ws.mergeCells(disclaimerRow.number, 2, disclaimerRow.number, 12);
  disclaimerRow.getCell(2).font = { size: 8, italic: true, color: { argb: "999999" } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

interface GelirTablosuData {
  satislar: number;
  satisIndirimleri?: number;
  satislarinMaliyeti: number;
  faaliyet_giderleri: { ad: string; tutar: number }[];
  diger_gelirler?: number;
  diger_giderler?: number;
  finansman_giderleri?: number;
}

export async function generateGelirTablosu(data: {
  financials: GelirTablosuData;
  period?: string;
  companyName?: string;
  title?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("Gelir Tablosu", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [{ width: 45 }, { width: 20 }];

  addTitle(ws, data.title || `${data.companyName || ""} Gelir Tablosu`.trim(), data.period || "", 2);

  const f = data.financials;
  const netSatislar = f.satislar - (f.satisIndirimleri || 0);
  const brutKar = netSatislar - f.satislarinMaliyeti;
  const toplamFaaliyetGid = f.faaliyet_giderleri.reduce((s, g) => s + g.tutar, 0);
  const faaliyetKari = brutKar - toplamFaaliyetGid;
  const vergiOncesiKar = faaliyetKari + (f.diger_gelirler || 0) - (f.diger_giderler || 0) - (f.finansman_giderleri || 0);

  const addLine = (label: string, amount: number, bold = false, highlight = false) => {
    const r = ws.addRow([label, amount]);
    r.getCell(2).numFmt = MONEY_FMT;
    if (bold) r.eachCell(c => { c.font = { bold: true, size: 11 }; });
    if (highlight) {
      r.eachCell(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        c.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      });
    }
  };

  addLine("A — Brüt Satışlar", f.satislar, true);
  if (f.satisIndirimleri) addLine("  Satış İndirimleri (-)", f.satisIndirimleri);
  addLine("Net Satışlar", netSatislar, true);
  ws.addRow([]);
  addLine("B — Satışların Maliyeti (-)", f.satislarinMaliyeti, true);
  addLine("BRÜT KAR", brutKar, false, true);
  ws.addRow([]);

  addLine("C — Faaliyet Giderleri", toplamFaaliyetGid, true);
  f.faaliyet_giderleri.forEach(g => addLine(`  ${g.ad}`, g.tutar));
  ws.addRow([]);

  addLine("FAALİYET KARI", faaliyetKari, false, true);
  ws.addRow([]);

  if (f.diger_gelirler) addLine("D — Diğer Gelirler", f.diger_gelirler);
  if (f.diger_giderler) addLine("E — Diğer Giderler (-)", f.diger_giderler);
  if (f.finansman_giderleri) addLine("F — Finansman Giderleri (-)", f.finansman_giderleri);
  ws.addRow([]);

  addLine("VERGİ ÖNCESİ KAR", vergiOncesiKar, false, true);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

interface BilancoEntry {
  hesapKodu: string;
  hesapAdi: string;
  tutar: number;
}

interface BilancoData {
  donenVarliklar: BilancoEntry[];
  duranVarliklar: BilancoEntry[];
  kisaVadeliYukulumlukler: BilancoEntry[];
  uzunVadeliYukulumlukler: BilancoEntry[];
  ozkaynaklar: BilancoEntry[];
}

export async function generateBilanco(data: {
  bilanco: BilancoData;
  period?: string;
  companyName?: string;
  title?: string;
}): Promise<{ buffer: Buffer; totals: { toplamAktif: number; toplamPasif: number; ozkaynakToplam: number } }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("Bilanço", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [{ width: 14 }, { width: 38 }, { width: 22 }];

  addTitle(ws, data.title || `${data.companyName || ""} Bilanço`.trim(), data.period || "", 3);

  const addSectionHeader = (label: string) => {
    const r = ws.addRow([label]);
    ws.mergeCells(r.number, 1, r.number, 3);
    r.getCell(1).font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    r.getCell(1).alignment = { horizontal: "center" };
  };

  const addGroupHeader = (label: string) => {
    const r = ws.addRow([label]);
    ws.mergeCells(r.number, 1, r.number, 3);
    r.getCell(1).font = { bold: true, size: 11, color: { argb: BLUE } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDFB" } };
  };

  const addEntryRows = (entries: BilancoEntry[]) => {
    let total = 0;
    entries.forEach((e, i) => {
      const r = ws.addRow([e.hesapKodu, e.hesapAdi, e.tutar]);
      r.getCell(3).numFmt = MONEY_FMT;
      zebraRow(r, i);
      total += e.tutar;
    });
    return total;
  };

  const addTotalRow = (label: string, amount: number) => {
    const r = ws.addRow(["", label, amount]);
    r.getCell(2).font = { bold: true, size: 10 };
    r.getCell(3).font = { bold: true, size: 10 };
    r.getCell(3).numFmt = MONEY_FMT;
    r.eachCell(c => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D6E4FF" } };
    });
  };

  const b = data.bilanco;

  addSectionHeader("AKTİF (VARLIKLAR)");
  const hdr1 = ws.addRow(["Hesap Kodu", "Hesap Adı", "Tutar (₺)"]);
  applyHeaderStyle(hdr1);

  addGroupHeader("I — Dönen Varlıklar");
  const donenTotal = addEntryRows(b.donenVarliklar);
  addTotalRow("Dönen Varlıklar Toplamı", donenTotal);

  ws.addRow([]);
  addGroupHeader("II — Duran Varlıklar");
  const duranTotal = addEntryRows(b.duranVarliklar);
  addTotalRow("Duran Varlıklar Toplamı", duranTotal);

  const toplamAktif = donenTotal + duranTotal;
  ws.addRow([]);
  const aktifRow = ws.addRow(["", "TOPLAM AKTİF", toplamAktif]);
  aktifRow.eachCell(c => {
    c.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  });
  aktifRow.getCell(3).numFmt = MONEY_FMT;

  ws.addRow([]);
  ws.addRow([]);

  addSectionHeader("PASİF (KAYNAKLAR)");
  const hdr2 = ws.addRow(["Hesap Kodu", "Hesap Adı", "Tutar (₺)"]);
  applyHeaderStyle(hdr2);

  addGroupHeader("III — Kısa Vadeli Yabancı Kaynaklar");
  const kisaTotal = addEntryRows(b.kisaVadeliYukulumlukler);
  addTotalRow("Kısa Vadeli Yab. Kaynaklar Toplamı", kisaTotal);

  ws.addRow([]);
  addGroupHeader("IV — Uzun Vadeli Yabancı Kaynaklar");
  const uzunTotal = addEntryRows(b.uzunVadeliYukulumlukler);
  addTotalRow("Uzun Vadeli Yab. Kaynaklar Toplamı", uzunTotal);

  ws.addRow([]);
  addGroupHeader("V — Özkaynaklar");
  const ozkaynakToplam = addEntryRows(b.ozkaynaklar);
  addTotalRow("Özkaynaklar Toplamı", ozkaynakToplam);

  const toplamPasif = kisaTotal + uzunTotal + ozkaynakToplam;
  ws.addRow([]);
  const pasifRow = ws.addRow(["", "TOPLAM PASİF", toplamPasif]);
  pasifRow.eachCell(c => {
    c.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  });
  pasifRow.getCell(3).numFmt = MONEY_FMT;

  const buf = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buf),
    totals: { toplamAktif, toplamPasif, ozkaynakToplam },
  };
}

interface KdvOzetData {
  hesaplananKdv: number;
  indirilecekKdv: number;
  tevkifatKdv?: number;
  ihracatIstisnasi?: number;
}

export async function generateKdvOzet(data: {
  kdv: KdvOzetData;
  period?: string;
  companyName?: string;
  title?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("KDV Özet", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [{ width: 40 }, { width: 20 }];

  addTitle(ws, data.title || `${data.companyName || ""} KDV Beyanname Hazırlık`.trim(), data.period || "", 2);

  const k = data.kdv;
  const odenecek = k.hesaplananKdv - k.indirilecekKdv - (k.tevkifatKdv || 0) - (k.ihracatIstisnasi || 0);

  const addLine = (label: string, amount: number, bold = false, highlight = false) => {
    const r = ws.addRow([label, amount]);
    r.getCell(2).numFmt = MONEY_FMT;
    if (bold) r.eachCell(c => { c.font = { bold: true }; });
    if (highlight) {
      r.eachCell(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        c.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      });
    }
  };

  addLine("Hesaplanan KDV", k.hesaplananKdv, true);
  addLine("İndirilecek KDV (-)", k.indirilecekKdv);
  if (k.tevkifatKdv) addLine("Tevkifat Yoluyla Ödenen KDV (-)", k.tevkifatKdv);
  if (k.ihracatIstisnasi) addLine("İhracat İstisnası (-)", k.ihracatIstisnasi);
  ws.addRow([]);

  if (odenecek > 0) {
    addLine("ÖDENECEK KDV", odenecek, false, true);
  } else {
    addLine("DEVREDEN KDV", Math.abs(odenecek), false, true);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ============================================================
// İNDİRİLECEK KDV LİSTESİ EXCEL
// ============================================================

interface KdvFaturaRow {
  sira_no: number;
  fatura_tarihi: string;
  belge_no: string;
  satici_unvani: string;
  satici_vkn: string;
  belge_turu: string;
  matrah: string | number;
  kdv_orani: string | number;
  kdv_tutari: string | number;
  hesap_kodu: string;
}

interface KdvOzetRow {
  kdv_orani: number;
  adet: number;
  matrah: string | number;
  kdv: string | number;
}

export async function generateKdvListesiExcel(data: {
  donem: string;
  faturalar: KdvFaturaRow[];
  ozet: KdvOzetRow[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";

  // --- Sheet 1: Fatura Listesi ---
  const ws = wb.addWorksheet("İndirilecek KDV Listesi", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  ws.columns = [
    { width: 6 },   // Sıra
    { width: 13 },  // Tarih
    { width: 22 },  // Belge No
    { width: 38 },  // Satıcı Unvanı
    { width: 14 },  // VKN
    { width: 14 },  // Belge Türü
    { width: 16 },  // Matrah
    { width: 10 },  // KDV %
    { width: 16 },  // KDV Tutarı
    { width: 10 },  // Hesap Kodu
  ];

  addTitle(ws, "İNDİRİLECEK KDV LİSTESİ", `Dönem: ${data.donem}`, 10);
  ws.addRow([]);

  const header = ws.addRow(["#", "Fatura Tarihi", "Belge No", "Satıcı Unvanı", "VKN/TCKN", "Belge Türü", "Matrah (₺)", "KDV %", "KDV Tutarı (₺)", "Hesap Kodu"]);
  applyHeaderStyle(header);

  let toplamMatrah = 0;
  let toplamKdv = 0;

  data.faturalar.forEach((f, i) => {
    const matrah = Number(f.matrah);
    const kdv = Number(f.kdv_tutari);
    toplamMatrah += matrah;
    toplamKdv += kdv;

    const tarih = f.fatura_tarihi ? new Date(f.fatura_tarihi).toLocaleDateString("tr-TR") : "";
    const row = ws.addRow([f.sira_no, tarih, f.belge_no, f.satici_unvani, f.satici_vkn, f.belge_turu, matrah, Number(f.kdv_orani), kdv, f.hesap_kodu]);
    row.getCell(7).numFmt = MONEY_FMT;
    row.getCell(9).numFmt = MONEY_FMT;
    row.getCell(8).alignment = { horizontal: "center" };
    zebraRow(row, i);
  });

  ws.addRow([]);
  const totalRow = ws.addRow(["", "", "", "", "", "TOPLAM:", toplamMatrah, "", toplamKdv, ""]);
  totalRow.getCell(6).font = { bold: true, size: 11 };
  totalRow.getCell(7).numFmt = MONEY_FMT;
  totalRow.getCell(7).font = { bold: true, size: 11 };
  totalRow.getCell(9).numFmt = MONEY_FMT;
  totalRow.getCell(9).font = { bold: true, size: 11, color: { argb: "10B981" } };

  // --- Sheet 2: Oran Özet ---
  const ws2 = wb.addWorksheet("KDV Oran Özeti", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws2.columns = [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 18 }];

  addTitle(ws2, "KDV ORAN ÖZETİ", `Dönem: ${data.donem}`, 5);
  ws2.addRow([]);

  const ozetHeader = ws2.addRow(["KDV Oranı", "Hesap Kodu", "Fatura Adedi", "Matrah (₺)", "KDV Tutarı (₺)"]);
  applyHeaderStyle(ozetHeader);

  data.ozet.forEach((o, i) => {
    const hesapKodu = Number(o.kdv_orani) === 1 ? "191.01" : Number(o.kdv_orani) === 10 ? "191.02" : Number(o.kdv_orani) === 20 ? "191.03" : "191.XX";
    const row = ws2.addRow([`%${o.kdv_orani}`, hesapKodu, o.adet, Number(o.matrah), Number(o.kdv)]);
    row.getCell(4).numFmt = MONEY_FMT;
    row.getCell(5).numFmt = MONEY_FMT;
    row.getCell(3).alignment = { horizontal: "center" };
    zebraRow(row, i);
  });

  ws2.addRow([]);
  const ozetTotal = ws2.addRow(["TOPLAM", "", data.faturalar.length, toplamMatrah, toplamKdv]);
  ozetTotal.eachCell(c => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
  });
  ozetTotal.getCell(4).numFmt = MONEY_FMT;
  ozetTotal.getCell(5).numFmt = MONEY_FMT;

  const buf2 = await wb.xlsx.writeBuffer();
  return Buffer.from(buf2);
}
