/**
 * GİB Entegratör API Altyapısı
 *
 * Desteklenen entegratörler:
 * - Orkestra (orkestra.com.tr)
 * - Foriba / Fitbul (foriba.com)
 * - QNB eSolutions (qnbesolutions.com)
 * - Uyumsoft (uyumsoft.com.tr)
 * - Logo Connect (logo.com.tr)
 *
 * Her entegratör için adapter pattern kullanılır.
 * Yeni entegratör eklemek için: GibAdapter interface'ini implemente edin.
 */

// ============================================================
// TYPES
// ============================================================

export type GibProvider = "orkestra" | "foriba" | "qnb" | "uyumsoft" | "logo" | "custom";

export interface GibCredentials {
  provider: GibProvider;
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  vkn?: string;           // Vergi Kimlik No
  gbTag?: string;         // Posta kutusu etiketi
  customHeaders?: Record<string, string>;
}

export interface GibInvoiceListParams {
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  direction: "inbound" | "outbound";  // gelen / giden
  status?: "approved" | "pending" | "rejected" | "all";
  limit?: number;
  offset?: number;
}

export interface GibInvoiceSummary {
  uuid: string;           // ETTN
  invoiceNo: string;      // Fatura No
  issueDate: string;
  senderVkn: string;
  senderName: string;
  receiverVkn: string;
  receiverName: string;
  profileId: string;      // TEMELFATURA, TICARIFATURA
  invoiceType: string;    // SATIS, IADE, TEVKIFAT
  totalAmount: number;
  taxAmount: number;
  currency: string;
  status: string;
}

export interface GibInvoiceXml {
  uuid: string;
  xmlContent: string;
}

export interface GibSyncResult {
  provider: GibProvider;
  fetched: number;
  newInvoices: number;
  duplicates: number;
  errors: string[];
  invoices: GibInvoiceSummary[];
}

// ============================================================
// ADAPTER INTERFACE
// ============================================================

export interface GibAdapter {
  provider: GibProvider;
  testConnection(creds: GibCredentials): Promise<{ success: boolean; message: string }>;
  listInvoices(creds: GibCredentials, params: GibInvoiceListParams): Promise<GibInvoiceSummary[]>;
  getInvoiceXml(creds: GibCredentials, uuid: string): Promise<GibInvoiceXml>;
  getInvoiceXmlBatch(creds: GibCredentials, uuids: string[]): Promise<GibInvoiceXml[]>;
}

// ============================================================
// ORKESTRA ADAPTER
// ============================================================

class OrkestraAdapter implements GibAdapter {
  provider: GibProvider = "orkestra";

  async testConnection(creds: GibCredentials): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${creds.apiUrl}/api/v1/auth/check`, {
        headers: {
          "Authorization": `Bearer ${creds.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) return { success: true, message: "Orkestra bağlantısı başarılı" };
      return { success: false, message: `Orkestra bağlantı hatası: ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Orkestra bağlantı hatası: ${err.message}` };
    }
  }

  async listInvoices(creds: GibCredentials, params: GibInvoiceListParams): Promise<GibInvoiceSummary[]> {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      direction: params.direction,
      ...(params.limit ? { limit: String(params.limit) } : {}),
      ...(params.offset ? { offset: String(params.offset) } : {}),
    });

    const res = await fetch(`${creds.apiUrl}/api/v1/invoices?${queryParams}`, {
      headers: {
        "Authorization": `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`Orkestra fatura listesi hatası: ${res.status}`);
    const data = await res.json();
    return this.mapInvoices(data.invoices || data.data || []);
  }

  async getInvoiceXml(creds: GibCredentials, uuid: string): Promise<GibInvoiceXml> {
    const res = await fetch(`${creds.apiUrl}/api/v1/invoices/${uuid}/xml`, {
      headers: { "Authorization": `Bearer ${creds.apiKey}` },
    });
    if (!res.ok) throw new Error(`Orkestra XML indirme hatası: ${res.status}`);
    const xmlContent = await res.text();
    return { uuid, xmlContent };
  }

  async getInvoiceXmlBatch(creds: GibCredentials, uuids: string[]): Promise<GibInvoiceXml[]> {
    const results: GibInvoiceXml[] = [];
    for (const uuid of uuids) {
      try {
        const xml = await this.getInvoiceXml(creds, uuid);
        results.push(xml);
      } catch { /* skip failed */ }
    }
    return results;
  }

  private mapInvoices(raw: any[]): GibInvoiceSummary[] {
    return raw.map(inv => ({
      uuid: inv.uuid || inv.ettn || "",
      invoiceNo: inv.invoiceNumber || inv.invoiceNo || inv.id || "",
      issueDate: inv.issueDate || inv.date || "",
      senderVkn: inv.senderVkn || inv.sender?.vkn || "",
      senderName: inv.senderName || inv.sender?.name || "",
      receiverVkn: inv.receiverVkn || inv.receiver?.vkn || "",
      receiverName: inv.receiverName || inv.receiver?.name || "",
      profileId: inv.profileId || inv.profile || "",
      invoiceType: inv.invoiceType || inv.type || "SATIS",
      totalAmount: parseFloat(inv.totalAmount || inv.payableAmount || "0"),
      taxAmount: parseFloat(inv.taxAmount || inv.taxTotal || "0"),
      currency: inv.currency || inv.currencyCode || "TRY",
      status: inv.status || "approved",
    }));
  }
}

// ============================================================
// GENERIC / CUSTOM API ADAPTER
// ============================================================

class GenericAdapter implements GibAdapter {
  provider: GibProvider = "custom";

  async testConnection(creds: GibCredentials): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(creds.apiUrl, {
        headers: { ...(creds.apiKey ? { "Authorization": `Bearer ${creds.apiKey}` } : {}), ...creds.customHeaders },
      });
      return { success: res.ok, message: res.ok ? "Bağlantı başarılı" : `Hata: ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async listInvoices(): Promise<GibInvoiceSummary[]> { return []; }
  async getInvoiceXml(_creds: GibCredentials, _uuid: string): Promise<GibInvoiceXml> {
    throw new Error("Custom adapter'da manuel XML yükleme kullanın");
  }
  async getInvoiceXmlBatch(): Promise<GibInvoiceXml[]> { return []; }
}

// ============================================================
// ADAPTER FACTORY
// ============================================================

const adapters: Record<GibProvider, GibAdapter> = {
  orkestra: new OrkestraAdapter(),
  foriba: new OrkestraAdapter(),  // Benzer REST API yapısı - override edilebilir
  qnb: new OrkestraAdapter(),
  uyumsoft: new OrkestraAdapter(),
  logo: new OrkestraAdapter(),
  custom: new GenericAdapter(),
};

export function getGibAdapter(provider: GibProvider): GibAdapter {
  return adapters[provider] || adapters.custom;
}

// ============================================================
// SYNC SERVICE
// ============================================================

export async function syncInvoicesFromGib(
  creds: GibCredentials,
  params: GibInvoiceListParams,
  parseAndSave: (xmlContent: string, filename: string) => Promise<{ success: boolean; belgeNo?: string }>
): Promise<GibSyncResult> {
  const adapter = getGibAdapter(creds.provider);
  const result: GibSyncResult = {
    provider: creds.provider,
    fetched: 0,
    newInvoices: 0,
    duplicates: 0,
    errors: [],
    invoices: [],
  };

  try {
    // 1. Fatura listesini çek
    const invoices = await adapter.listInvoices(creds, params);
    result.fetched = invoices.length;
    result.invoices = invoices;

    // 2. Her faturanın XML'ini çek ve parse et
    for (const inv of invoices) {
      try {
        const xml = await adapter.getInvoiceXml(creds, inv.uuid);
        const parseResult = await parseAndSave(xml.xmlContent, `${inv.invoiceNo}.xml`);
        if (parseResult.success) {
          result.newInvoices++;
        } else {
          result.duplicates++;
        }
      } catch (err: any) {
        result.errors.push(`${inv.invoiceNo}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Senkronizasyon hatası: ${err.message}`);
  }

  return result;
}

// ============================================================
// PROVIDER CONFIGS (Varsayılan URL'ler)
// ============================================================

export const PROVIDER_DEFAULTS: Record<GibProvider, { name: string; defaultUrl: string; docs: string }> = {
  orkestra: {
    name: "Orkestra",
    defaultUrl: "https://api.orkestra.com.tr",
    docs: "Orkestra API dökümantasyonuna entegratörünüzden erişebilirsiniz.",
  },
  foriba: {
    name: "Foriba / Fitbul",
    defaultUrl: "https://api.fitbul.com",
    docs: "Foriba API anahtarınızı Fitbul panelinden alabilirsiniz.",
  },
  qnb: {
    name: "QNB eSolutions",
    defaultUrl: "https://efatura.qnbesolutions.com/api",
    docs: "QNB eSolutions API bilgileri için entegratörünüze başvurun.",
  },
  uyumsoft: {
    name: "Uyumsoft",
    defaultUrl: "https://efatura.uyumsoft.com.tr/api",
    docs: "Uyumsoft API bilgilerinizi panel üzerinden alabilirsiniz.",
  },
  logo: {
    name: "Logo Connect",
    defaultUrl: "https://connect.logo.com.tr/api",
    docs: "Logo Connect entegrasyon bilgileri için Logo ile iletişime geçin.",
  },
  custom: {
    name: "Özel Entegrasyon",
    defaultUrl: "",
    docs: "Kendi entegratörünüzün API bilgilerini girin.",
  },
};
