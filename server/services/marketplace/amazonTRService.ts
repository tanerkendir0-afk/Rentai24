const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";

interface AmazonTRCredentials {
  sellerId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  marketplaceId?: string;
}

const TURKEY_MARKETPLACE_ID = "A33AVAJ2PDY3EV";

export class AmazonTRService {
  private sellerId: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private marketplaceId: string;
  private accessToken: string = "";
  private tokenExpiry: number = 0;

  constructor(credentials: AmazonTRCredentials) {
    this.sellerId = credentials.sellerId;
    this.refreshToken = credentials.refreshToken;
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.marketplaceId = credentials.marketplaceId || TURKEY_MARKETPLACE_ID;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const res = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!res.ok) {
      throw new Error(`Amazon Auth Error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      "x-amz-access-token": token,
      "Content-Type": "application/json",
      "User-Agent": "RentAI24-Integration/1.0",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Amazon SP-API ${res.status}: ${text.substring(0, 300)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getProducts(1);
      return { success: true, message: "Amazon Türkiye bağlantısı başarılı" };
    } catch (err: any) {
      return { success: false, message: `Bağlantı hatası: ${err.message}` };
    }
  }

  async getProducts(limit: number = 50, nextToken?: string): Promise<any> {
    const qs = new URLSearchParams();
    qs.set("marketplaceIds", this.marketplaceId);
    qs.set("pageSize", String(limit));
    if (nextToken) qs.set("nextToken", nextToken);
    return this.request("GET", `/listings/2021-08-01/items/${this.sellerId}?${qs.toString()}`);
  }

  async getOrders(params: { startDate?: string; endDate?: string; status?: string; maxResults?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    qs.set("MarketplaceIds", this.marketplaceId);
    if (params.startDate) qs.set("CreatedAfter", params.startDate);
    if (params.endDate) qs.set("CreatedBefore", params.endDate);
    if (params.status) qs.set("OrderStatuses", params.status);
    qs.set("MaxResultsPerPage", String(params.maxResults || 50));
    return this.request("GET", `/orders/v0/orders?${qs.toString()}`);
  }

  async getOrderDetail(orderId: string): Promise<any> {
    return this.request("GET", `/orders/v0/orders/${orderId}`);
  }

  async getOrderItems(orderId: string): Promise<any> {
    return this.request("GET", `/orders/v0/orders/${orderId}/orderItems`);
  }

  async updateStockAndPrice(items: Array<{ sku: string; quantity?: number; price?: number }>): Promise<any> {
    const results: any[] = [];
    for (const item of items) {
      const patches: any[] = [];
      if (item.quantity !== undefined) {
        patches.push({
          op: "replace",
          path: "/attributes/fulfillment_availability",
          value: [{ fulfillment_channel_code: "DEFAULT", quantity: item.quantity }],
        });
      }
      if (item.price !== undefined) {
        patches.push({
          op: "replace",
          path: "/attributes/purchasable_offer",
          value: [{
            marketplace_id: this.marketplaceId,
            currency: "TRY",
            our_price: [{ schedule: [{ value_with_tax: item.price }] }],
          }],
        });
      }
      if (patches.length > 0) {
        const res = await this.request("PATCH", `/listings/2021-08-01/items/${this.sellerId}/${item.sku}?marketplaceIds=${this.marketplaceId}`, {
          productType: "PRODUCT",
          patches,
        });
        results.push(res);
      }
    }
    return { results };
  }

  async updateTrackingNumber(orderId: string, trackingNumber: string, carrierCode: string): Promise<any> {
    return this.request("POST", `/orders/v0/orders/${orderId}/shipment`, {
      marketplaceId: this.marketplaceId,
      shipmentStatus: "ReadyForPickup",
      trackingId: trackingNumber,
      carrierCode,
    });
  }

  async getReturns(params: { maxResults?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    qs.set("marketplaceIds", this.marketplaceId);
    qs.set("maxResults", String(params.maxResults || 50));
    return this.request("GET", `/fba/returns/v3/returns?${qs.toString()}`);
  }

  async getCategories(): Promise<any> {
    return this.request("GET", `/catalog/2022-04-01/categories?marketplaceIds=${this.marketplaceId}`);
  }
}
