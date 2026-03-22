const BASE_URL = "https://mpop-sit.hepsiburada.com";
const LISTING_URL = "https://listing-external-sit.hepsiburada.com";

interface HepsiburadaCredentials {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
}

export class HepsiburadaService {
  private merchantId: string;
  private authHeader: string;

  constructor(credentials: HepsiburadaCredentials) {
    this.merchantId = credentials.merchantId;
    const token = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  private async request(method: string, path: string, body?: any, baseUrl: string = BASE_URL): Promise<any> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": this.authHeader,
      "Content-Type": "application/json",
      "User-Agent": "RentAI24-Integration/1.0",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Hepsiburada API ${res.status}: ${text.substring(0, 300)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getProducts(0, 1);
      return { success: true, message: "Hepsiburada bağlantısı başarılı" };
    } catch (err: any) {
      return { success: false, message: `Bağlantı hatası: ${err.message}` };
    }
  }

  async getProducts(page: number = 0, size: number = 50): Promise<any> {
    return this.request("GET", `/listings/merchantid/${this.merchantId}?offset=${page * size}&limit=${size}`, undefined, LISTING_URL);
  }

  async updateStockAndPrice(items: Array<{ barcode: string; quantity?: number; salePrice?: number; listPrice?: number }>): Promise<any> {
    const listings = items.map(item => ({
      hepsiburadaSku: item.barcode,
      merchantSku: item.barcode,
      ...(item.quantity !== undefined && { availableStock: item.quantity }),
      ...(item.salePrice !== undefined && { price: item.salePrice }),
      ...(item.listPrice !== undefined && { psf: item.listPrice }),
    }));
    return this.request("POST", `/listings/merchantid/${this.merchantId}/inventory-uploads`, { listings }, LISTING_URL);
  }

  async getOrders(params: { startDate?: string; endDate?: string; status?: string; page?: number; size?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set("beginDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    if (params.status) qs.set("status", params.status);
    qs.set("offset", String((params.page || 0) * (params.size || 50)));
    qs.set("limit", String(params.size || 50));
    return this.request("GET", `/orders/merchantid/${this.merchantId}?${qs.toString()}`);
  }

  async getOrderDetail(orderId: string): Promise<any> {
    return this.request("GET", `/orders/merchantid/${this.merchantId}/orderid/${orderId}`);
  }

  async updateTrackingNumber(packageId: string, trackingNumber: string, cargoProvider: string): Promise<any> {
    return this.request("PUT", `/packages/merchantid/${this.merchantId}/packageid/${packageId}`, {
      trackingNumber,
      cargoFirm: cargoProvider,
      status: "Shipped",
    });
  }

  async getCategories(): Promise<any> {
    return this.request("GET", `/product/api/categories/get-all-categories`, undefined, LISTING_URL);
  }

  async getCustomerQuestions(status?: string): Promise<any> {
    const qs = status ? `?status=${status}` : "";
    return this.request("GET", `/questions/merchantid/${this.merchantId}${qs}`);
  }

  async answerQuestion(questionId: string, answer: string): Promise<any> {
    return this.request("POST", `/questions/merchantid/${this.merchantId}/questionid/${questionId}/answer`, { text: answer });
  }

  async cancelOrder(orderId: string, lineItemId: string, reason: string): Promise<any> {
    return this.request("PUT", `/orders/merchantid/${this.merchantId}/orderid/${orderId}/cancel`, {
      lineItemId,
      reason,
    });
  }

  async getReturns(params: { page?: number; size?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    qs.set("offset", String((params.page || 0) * (params.size || 50)));
    qs.set("limit", String(params.size || 50));
    return this.request("GET", `/returns/merchantid/${this.merchantId}?${qs.toString()}`);
  }

  async approveReturn(returnId: string): Promise<any> {
    return this.request("PUT", `/returns/merchantid/${this.merchantId}/returnid/${returnId}/approve`);
  }
}
