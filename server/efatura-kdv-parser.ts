/**
 * e-Fatura UBL-TR XML Parser - Finn İndirilecek KDV Pipeline
 * 
 * Parses Turkish e-Invoice (UBL-TR 1.2) XML files and extracts
 * structured data for İndirilecek KDV Listesi generation.
 * 
 * Stack: Node.js/TypeScript with fast-xml-parser
 * Cost: Zero (no external OCR/AI service needed for XML invoices)
 */

import { XMLParser } from 'fast-xml-parser';

// ============================================================
// TYPES
// ============================================================

interface ParsedInvoice {
  siraNo?: number;
  faturaTarihi: string;       // GG.AA.YYYY
  belgeNo: string;            // GIB e-Fatura numarası
  saticiUnvani: string;
  saticiVKN: string;          // 10 (VKN) veya 11 (TCKN) hane
  belgeTuru: 'e-Fatura' | 'e-Arşiv Fatura' | 'Serbest Meslek Makbuzu' | 'Gider Pusulası' | 'Fatura';
  matrah: number;             // KDV hariç tutar (₺)
  kdvOrani: number;           // 1 | 10 | 20
  kdvTutari: number;          // İndirilecek KDV (₺)
  hesapKodu: string;          // 191.01 | 191.02 | 191.03
  paraBirimi: string;
  profilId: string;           // TICARIFATURA, TEMELFATURA, EARSIVFATURA
  faturaTipiKodu: string;     // SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI
  tevkifatOrani?: number;     // ör: 90 (9/10 = %90 tevkifat)
  tevkifatTutari?: number;    // Tevkifat yoluyla kesilen KDV tutarı
  tevkifatKodu?: string;      // Tevkifat sebebi kodu (ör: 601, 602...)
  dovizKuru?: number;         // PricingExchangeRate/CalculationRate
  matrahTL?: number;          // Döviz faturasında TL karşılığı matrah
  kdvTutariTL?: number;       // Döviz faturasında TL karşılığı KDV
  rawXmlHash?: string;        // Mükerrer kontrolü için
}

interface ParseResult {
  success: boolean;
  invoice?: ParsedInvoice;
  errors: string[];
  warnings: string[];
}

interface KDVSummary {
  oran: number;
  hesapKodu: string;
  toplamMatrah: number;
  toplamKDV: number;
  faturaAdedi: number;
}

interface KDVListeRaporu {
  donem: string;              // AA/YYYY
  mukellefUnvani: string;
  mukellefVKN: string;
  vergiDairesi: string;
  faturalar: ParsedInvoice[];
  ozetler: KDVSummary[];
  genelToplamMatrah: number;
  genelToplamKDV: number;
  toplamFaturaAdedi: number;
  olusturmaTarihi: string;
}

// ============================================================
// XML PARSER CONFIG
// ============================================================

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,        // UBL namespace'leri kaldır
  isArray: (name: string) => {
    // Birden fazla olabilecek elemanlar
    return ['InvoiceLine', 'TaxSubtotal', 'TaxTotal', 'WithholdingTaxTotal',
            'AllowanceCharge', 'AdditionalDocumentReference'].includes(name);
  },
  parseTagValue: true,
  trimValues: true,
};

// ============================================================
// PARSER FUNCTIONS  
// ============================================================

/**
 * Tek bir e-Fatura XML dosyasını parse eder
 */
export function parseEFatura(xmlContent: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new XMLParser(parserOptions);
    const doc = parser.parse(xmlContent);

    // Root element: Invoice (UBL-TR)
    const inv = doc.Invoice;
    if (!inv) {
      return { success: false, errors: ['XML dosyasında Invoice root elementi bulunamadı'], warnings };
    }

    // === Belge No ===
    const belgeNo = xmlStr(inv.ID);
    if (!belgeNo) errors.push('Belge numarası (ID) bulunamadı');

    // === Profil ID ===
    const profilId = xmlStr(inv.ProfileID);
    
    // === Belge Türü Tespiti ===
    let belgeTuru: ParsedInvoice['belgeTuru'] = 'e-Fatura';
    if (profilId.includes('EARSIV')) {
      belgeTuru = 'e-Arşiv Fatura';
    } else if (profilId.includes('TICARI')) {
      belgeTuru = 'e-Fatura';
    } else if (profilId.includes('TEMEL')) {
      belgeTuru = 'e-Fatura';
    }
    // InvoiceTypeCode: SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI
    const invoiceTypeCode = xmlStr(inv.InvoiceTypeCode) || 'SATIS';

    // === Fatura Tarihi ===
    const rawDate = xmlStr(inv.IssueDate);
    const faturaTarihi = formatTarih(rawDate);
    if (!faturaTarihi) errors.push(`Geçersiz tarih formatı: ${rawDate}`);

    // === Satıcı Bilgileri ===
    const supplier = inv.AccountingSupplierParty?.Party;
    let saticiUnvani = '';
    let saticiVKN = '';

    if (supplier) {
      // Unvan - birden fazla fallback
      const partyName = supplier.PartyName;
      const pn = Array.isArray(partyName) ? partyName[0] : partyName;
      saticiUnvani = xmlStr(pn?.Name)
        || xmlStr(supplier.PartyLegalEntity?.RegistrationName)
        || '';
      // Gerçek kişi fallback
      if (!saticiUnvani && supplier.Person) {
        const p = supplier.Person;
        saticiUnvani = [xmlStr(p.FirstName), xmlStr(p.MiddleName), xmlStr(p.FamilyName)].filter(Boolean).join(' ');
      }
      // AgentParty fallback (Aras Kargo gibi aracı firmalar)
      if (!saticiUnvani && supplier.AgentParty) {
        const ap = supplier.AgentParty;
        const apn = Array.isArray(ap.PartyName) ? ap.PartyName[0] : ap.PartyName;
        saticiUnvani = xmlStr(apn?.Name) || '';
      }

      // VKN/TCKN
      const partyId = supplier.PartyIdentification;
      if (partyId) {
        const ids = Array.isArray(partyId) ? partyId : [partyId];
        for (const id of ids) {
          const schemeId = id.ID?.['@_schemeID'] || '';
          if (schemeId === 'VKN' || schemeId === 'TCKN' || schemeId === 'VKN_TCKN') {
            saticiVKN = xmlStr(id.ID);
            break;
          }
        }
        // Fallback: ilk ID'yi al
        if (!saticiVKN && ids.length > 0) {
          saticiVKN = xmlStr(ids[0].ID);
        }
      }
    }
    if (!saticiUnvani) warnings.push('Satıcı unvanı bulunamadı');
    if (!saticiVKN) warnings.push('Satıcı VKN/TCKN bulunamadı');

    // === KDV Hesaplama ===
    let matrah = 0;
    let kdvTutari = 0;
    let kdvOrani = 0;

    // TaxTotal > TaxSubtotal üzerinden KDV bilgileri
    const taxTotals = inv.TaxTotal;
    if (taxTotals) {
      const taxTotalArr = Array.isArray(taxTotals) ? taxTotals : [taxTotals];

      for (const taxTotal of taxTotalArr) {
        const subtotals = taxTotal.TaxSubtotal;
        if (!subtotals) {
          // TaxSubtotal yoksa TaxTotal'dan direkt al (bazı e-Arşiv faturaları)
          const directKDV = xmlNum(taxTotal.TaxAmount);
          if (directKDV > 0) kdvTutari += directKDV;
          continue;
        }

        const subtotalArr = Array.isArray(subtotals) ? subtotals : [subtotals];

        for (const sub of subtotalArr) {
          const taxScheme = sub.TaxCategory?.TaxScheme;
          const taxName = xmlStr(taxScheme?.Name);
          const taxCode = xmlStr(taxScheme?.TaxTypeCode);

          // KDV: kod 0015, veya ismi KDV/VAT içeriyor, veya hiç kod yoksa da KDV kabul et
          const isKDV = taxCode === '0015' || taxName.includes('KDV') || taxName.includes('VAT')
            || (!taxCode && !taxName); // e-Arşiv bazen TaxScheme boş bırakır

          if (isKDV) {
            const subMatrah = xmlNum(sub.TaxableAmount);
            const subKDV = xmlNum(sub.TaxAmount);
            const subOran = xmlNum(sub.Percent);

            matrah += subMatrah;
            kdvTutari += subKDV;

            if (subOran > kdvOrani) kdvOrani = subOran;
          }
        }
      }
    }

    // Fallback: LegalMonetaryTotal'dan matrah
    if (matrah === 0) {
      const lmt = inv.LegalMonetaryTotal;
      if (lmt) {
        // LineExtensionAmount = satır toplamı (KDV hariç net tutar)
        matrah = xmlNum(lmt.LineExtensionAmount) || xmlNum(lmt.TaxExclusiveAmount);
        const payable = xmlNum(lmt.PayableAmount);
        const taxInclusive = xmlNum(lmt.TaxInclusiveAmount);
        if (kdvTutari === 0) {
          // TaxInclusiveAmount - LineExtensionAmount = KDV
          if (taxInclusive > matrah) {
            kdvTutari = Math.round((taxInclusive - matrah) * 100) / 100;
          } else if (payable > matrah) {
            kdvTutari = Math.round((payable - matrah) * 100) / 100;
          }
        }
      }
    }

    // InvoiceLine fallback: satır bazlı matrah topla
    if (matrah === 0 && inv.InvoiceLine) {
      const lines = Array.isArray(inv.InvoiceLine) ? inv.InvoiceLine : [inv.InvoiceLine];
      for (const line of lines) {
        matrah += xmlNum(line.LineExtensionAmount);
      }
    }

    // KDV Oranı doğrulama
    if (kdvOrani === 0 && matrah > 0 && kdvTutari > 0) {
      const calculatedRate = Math.round((kdvTutari / matrah) * 100);
      if ([1, 10, 20].includes(calculatedRate)) {
        kdvOrani = calculatedRate;
      } else {
        warnings.push(`Hesaplanan KDV oranı standart değil: %${calculatedRate}`);
        kdvOrani = calculatedRate;
      }
    }

    // === Hesap Kodu ===
    const hesapKodu = kdvOraniToHesapKodu(kdvOrani);

    // === Tevkifat (Withholding Tax) ===
    let tevkifatOrani: number | undefined;
    let tevkifatTutari: number | undefined;
    let tevkifatKodu: string | undefined;

    const withholdingTotals = inv.WithholdingTaxTotal;
    if (withholdingTotals) {
      const whArr = Array.isArray(withholdingTotals) ? withholdingTotals : [withholdingTotals];
      for (const wh of whArr) {
        const subtotals = wh.TaxSubtotal;
        if (!subtotals) continue;
        const subArr = Array.isArray(subtotals) ? subtotals : [subtotals];
        for (const sub of subArr) {
          const taxScheme = sub.TaxCategory?.TaxScheme;
          const taxCode = xmlStr(taxScheme?.TaxTypeCode);
          // Tevkifat kodları: 6xx (KDV tevkifat) veya 4xx (ÖTV tevkifat)
          if (taxCode.startsWith('6') || taxCode.startsWith('4') || taxCode === '9015') {
            tevkifatTutari = (tevkifatTutari || 0) + xmlNum(sub.TaxAmount);
            tevkifatOrani = xmlNum(sub.Percent);
            tevkifatKodu = taxCode;
          }
        }
      }
    }

    // InvoiceTypeCode = TEVKIFAT ise tevkifatlı fatura
    if (invoiceTypeCode === 'TEVKIFAT' && !tevkifatTutari) {
      warnings.push('Fatura tipi TEVKIFAT ancak WithholdingTaxTotal bulunamadı');
    }

    if (tevkifatTutari) {
      tevkifatTutari = Math.round(tevkifatTutari * 100) / 100;
    }

    // === Doğrulama ===
    const expectedKDV = Math.round(matrah * kdvOrani / 100 * 100) / 100;
    const kdvFarki = Math.abs(kdvTutari - expectedKDV);
    if (kdvFarki > 0.02) {
      warnings.push(`KDV tutarı doğrulanamadı: Beklenen ${expectedKDV}, Bulunan ${kdvTutari} (Fark: ${kdvFarki.toFixed(2)})`);
    }

    // === Para Birimi & Döviz Kuru ===
    const paraBirimi = xmlStr(inv.DocumentCurrencyCode) || 'TRY';
    let dovizKuru: number | undefined;
    let matrahTL: number | undefined;
    let kdvTutariTL: number | undefined;

    if (paraBirimi !== 'TRY') {
      // PricingExchangeRate > CalculationRate
      const exchangeRate = inv.PricingExchangeRate;
      if (exchangeRate) {
        dovizKuru = xmlNum(exchangeRate.CalculationRate);
        if (dovizKuru > 0) {
          matrahTL = Math.round(matrah * dovizKuru * 100) / 100;
          kdvTutariTL = Math.round(kdvTutari * dovizKuru * 100) / 100;
        }
      }
      if (!dovizKuru || dovizKuru === 0) {
        warnings.push(`Yabancı para birimi: ${paraBirimi} — XML'de kur bilgisi yok, TCMB kuru ile dönüştürülmeli`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    const invoice: ParsedInvoice = {
      faturaTarihi: faturaTarihi!,
      belgeNo,
      saticiUnvani,
      saticiVKN,
      belgeTuru,
      matrah: Math.round(matrah * 100) / 100,
      kdvOrani,
      kdvTutari: Math.round(kdvTutari * 100) / 100,
      hesapKodu,
      paraBirimi,
      profilId,
      faturaTipiKodu: invoiceTypeCode,
      tevkifatOrani,
      tevkifatTutari,
      tevkifatKodu,
      dovizKuru,
      matrahTL,
      kdvTutariTL,
    };

    return { success: true, invoice, errors, warnings };

  } catch (err: any) {
    return {
      success: false,
      errors: [`XML parse hatası: ${err.message}`],
      warnings,
    };
  }
}

/**
 * Birden fazla XML dosyasını toplu parse eder ve İndirilecek KDV Listesi oluşturur
 */
export function generateKDVListesi(
  xmlContents: { filename: string; content: string }[],
  meta: {
    donem: string;
    mukellefUnvani: string;
    mukellefVKN: string;
    vergiDairesi: string;
  }
): { rapor: KDVListeRaporu; parseResults: { filename: string; result: ParseResult }[] } {
  
  const parseResults: { filename: string; result: ParseResult }[] = [];
  const faturalar: ParsedInvoice[] = [];
  const seenBelgeNos = new Set<string>();

  for (const { filename, content } of xmlContents) {
    const result = parseEFatura(content);
    parseResults.push({ filename, result });

    if (result.success && result.invoice) {
      // Mükerrer kontrolü
      if (seenBelgeNos.has(result.invoice.belgeNo)) {
        result.warnings.push(`Mükerrer fatura: ${result.invoice.belgeNo}`);
        continue;
      }
      seenBelgeNos.add(result.invoice.belgeNo);

      result.invoice.siraNo = faturalar.length + 1;
      faturalar.push(result.invoice);
    }
  }

  // Tarihe göre sırala
  faturalar.sort((a, b) => {
    const [dA, mA, yA] = a.faturaTarihi.split('.');
    const [dB, mB, yB] = b.faturaTarihi.split('.');
    return new Date(`${yA}-${mA}-${dA}`).getTime() - new Date(`${yB}-${mB}-${dB}`).getTime();
  });

  // Sıra numaralarını güncelle
  faturalar.forEach((f, i) => f.siraNo = i + 1);

  // Oran bazlı özet
  const oranGruplari = new Map<number, { matrah: number; kdv: number; adet: number }>();
  for (const f of faturalar) {
    const existing = oranGruplari.get(f.kdvOrani) || { matrah: 0, kdv: 0, adet: 0 };
    existing.matrah += f.matrah;
    existing.kdv += f.kdvTutari;
    existing.adet += 1;
    oranGruplari.set(f.kdvOrani, existing);
  }

  const ozetler: KDVSummary[] = Array.from(oranGruplari.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([oran, data]) => ({
      oran,
      hesapKodu: kdvOraniToHesapKodu(oran),
      toplamMatrah: Math.round(data.matrah * 100) / 100,
      toplamKDV: Math.round(data.kdv * 100) / 100,
      faturaAdedi: data.adet,
    }));

  const genelToplamMatrah = ozetler.reduce((sum, o) => sum + o.toplamMatrah, 0);
  const genelToplamKDV = ozetler.reduce((sum, o) => sum + o.toplamKDV, 0);

  const rapor: KDVListeRaporu = {
    donem: meta.donem,
    mukellefUnvani: meta.mukellefUnvani,
    mukellefVKN: meta.mukellefVKN,
    vergiDairesi: meta.vergiDairesi,
    faturalar,
    ozetler,
    genelToplamMatrah: Math.round(genelToplamMatrah * 100) / 100,
    genelToplamKDV: Math.round(genelToplamKDV * 100) / 100,
    toplamFaturaAdedi: faturalar.length,
    olusturmaTarihi: new Date().toLocaleDateString('tr-TR'),
  };

  return { rapor, parseResults };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * XML elemanından sayısal değer çıkar.
 * fast-xml-parser attribute'lu elemanları obje olarak döndürür:
 *   <cbc:TaxableAmount currencyID="TRY">144.73</cbc:TaxableAmount>
 *   → { "#text": "144.73", "@_currencyID": "TRY" }
 * Bu fonksiyon her iki durumu da handle eder.
 */
function xmlNum(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object') {
    // fast-xml-parser #text key'inde asıl değeri tutar
    const text = val['#text'] ?? val['_text'] ?? val['__text'];
    if (text != null) return parseFloat(String(text)) || 0;
    // Bazı durumlarda direkt toString çalışabilir
    const str = String(val);
    if (str !== '[object Object]') return parseFloat(str) || 0;
  }
  return 0;
}

/** XML elemanından string değer çıkar (attribute'lu elemanlar için) */
function xmlStr(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const text = val['#text'] ?? val['_text'] ?? val['__text'];
    if (text != null) return String(text);
    const str = String(val);
    if (str !== '[object Object]') return str;
  }
  return '';
}

function formatTarih(isoDate: string): string | null {
  // Input: 2025-01-15 veya 2025-01-15T00:00:00
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function kdvOraniToHesapKodu(oran: number): string {
  switch (oran) {
    case 0: return '191.00';
    case 1: return '191.01';
    case 8: return '191.02';
    case 10: return '191.02';
    case 18: return '191.03';
    case 20: return '191.03';
    default: return '191.99';
  }
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

export function validateVKN(vkn: string): { valid: boolean; type: 'VKN' | 'TCKN' | 'invalid' } {
  const cleaned = vkn.replace(/\s/g, '');
  if (/^\d{10}$/.test(cleaned)) return { valid: true, type: 'VKN' };
  if (/^\d{11}$/.test(cleaned)) {
    // TCKN algoritma kontrolü
    const digits = cleaned.split('').map(Number);
    if (digits[0] === 0) return { valid: false, type: 'invalid' };
    const check10 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
    if (check10 !== digits[10]) return { valid: false, type: 'invalid' };
    return { valid: true, type: 'TCKN' };
  }
  return { valid: false, type: 'invalid' };
}

export function validateKDVTutari(matrah: number, oran: number, tutar: number, tolerans = 0.02): boolean {
  return Math.abs(matrah * oran / 100 - tutar) <= tolerans;
}

// ============================================================
// DRIZZLE SCHEMA (for PostgreSQL storage with RLS)
// ============================================================

/*
-- invoices tablosu (tenant_id ile RLS)
-- Finn'in mevcut Neon PostgreSQL yapısına uyumlu

CREATE TABLE IF NOT EXISTS indirilecek_kdv_faturalar (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  donem           VARCHAR(7) NOT NULL,           -- AA/YYYY
  sira_no         INTEGER NOT NULL,
  fatura_tarihi   DATE NOT NULL,
  belge_no        VARCHAR(50) NOT NULL,
  satici_unvani   VARCHAR(255) NOT NULL,
  satici_vkn      VARCHAR(11) NOT NULL,
  belge_turu      VARCHAR(30) NOT NULL,
  matrah          DECIMAL(15,2) NOT NULL,
  kdv_orani       DECIMAL(5,2) NOT NULL,
  kdv_tutari      DECIMAL(15,2) NOT NULL,
  hesap_kodu      VARCHAR(10) NOT NULL,
  para_birimi     VARCHAR(3) DEFAULT 'TRY',
  profil_id       VARCHAR(50),
  xml_hash        VARCHAR(64),                   -- Mükerrer kontrolü
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, belge_no),                   -- Aynı fatura 2 kez girilemesin
  CHECK (kdv_orani IN (1, 10, 20))
);

-- RLS politikası
ALTER TABLE indirilecek_kdv_faturalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON indirilecek_kdv_faturalar
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Performans indeksleri
CREATE INDEX idx_kdv_fatura_donem ON indirilecek_kdv_faturalar(tenant_id, donem);
CREATE INDEX idx_kdv_fatura_belge ON indirilecek_kdv_faturalar(tenant_id, belge_no);
CREATE INDEX idx_kdv_fatura_tarih ON indirilecek_kdv_faturalar(tenant_id, fatura_tarihi);

-- Özet view
CREATE VIEW v_indirilecek_kdv_ozet AS
SELECT 
  tenant_id,
  donem,
  kdv_orani,
  CASE kdv_orani 
    WHEN 1 THEN '191.01' 
    WHEN 10 THEN '191.02' 
    WHEN 20 THEN '191.03' 
  END as hesap_kodu,
  COUNT(*) as fatura_adedi,
  SUM(matrah) as toplam_matrah,
  SUM(kdv_tutari) as toplam_kdv
FROM indirilecek_kdv_faturalar
GROUP BY tenant_id, donem, kdv_orani;
*/
