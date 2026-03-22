import { db } from "../../db";
import { marketplaceConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { decryptCredentials } from "../encryption";
import { TrendyolService } from "./trendyolService";
import { ShopifyService } from "./shopifyService";
import { HepsiburadaService } from "./hepsiburadaService";
import { AmazonTRService } from "./amazonTRService";

export type Platform = "trendyol" | "shopify" | "hepsiburada" | "amazon_tr";

export async function getConnections(userId: number) {
  return db.select().from(marketplaceConnections)
    .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.isActive, true)));
}

export async function getConnectionById(id: number, userId: number) {
  const [conn] = await db.select().from(marketplaceConnections)
    .where(and(eq(marketplaceConnections.id, id), eq(marketplaceConnections.userId, userId)));
  return conn;
}

export async function getConnectionByPlatform(userId: number, platform: string) {
  const [conn] = await db.select().from(marketplaceConnections)
    .where(and(
      eq(marketplaceConnections.userId, userId),
      eq(marketplaceConnections.platform, platform),
      eq(marketplaceConnections.isActive, true),
    ));
  return conn;
}

export function createTrendyolService(encryptedCreds: string): TrendyolService {
  const creds = decryptCredentials(encryptedCreds);
  return new TrendyolService({
    sellerId: creds.sellerId || creds.supplier_id || "",
    apiKey: creds.apiKey || creds.api_key || "",
    apiSecret: creds.apiSecret || creds.api_secret || "",
  });
}

export function createShopifyService(encryptedCreds: string): ShopifyService {
  const creds = decryptCredentials(encryptedCreds);
  return new ShopifyService({
    storeUrl: creds.storeUrl || creds.store_url || "",
    accessToken: creds.accessToken || creds.access_token || "",
  });
}

export function createHepsiburadaService(encryptedCreds: string): HepsiburadaService {
  const creds = decryptCredentials(encryptedCreds);
  return new HepsiburadaService({
    merchantId: creds.merchantId || creds.merchant_id || "",
    apiKey: creds.apiKey || creds.api_key || "",
    apiSecret: creds.apiSecret || creds.api_secret || "",
  });
}

export function createAmazonTRService(encryptedCreds: string): AmazonTRService {
  const creds = decryptCredentials(encryptedCreds);
  return new AmazonTRService({
    sellerId: creds.sellerId || creds.seller_id || "",
    refreshToken: creds.refreshToken || creds.refresh_token || "",
    clientId: creds.clientId || creds.client_id || "",
    clientSecret: creds.clientSecret || creds.client_secret || "",
    marketplaceId: creds.marketplaceId || creds.marketplace_id,
  });
}

export type MarketplaceService = TrendyolService | ShopifyService | HepsiburadaService | AmazonTRService;

export async function getMarketplaceService(userId: number, platform: Platform): Promise<MarketplaceService | null> {
  const conn = await getConnectionByPlatform(userId, platform);
  if (!conn) return null;

  switch (platform) {
    case "trendyol":
      return createTrendyolService(conn.credentialsEncrypted);
    case "shopify":
      return createShopifyService(conn.credentialsEncrypted);
    case "hepsiburada":
      return createHepsiburadaService(conn.credentialsEncrypted);
    case "amazon_tr":
      return createAmazonTRService(conn.credentialsEncrypted);
    default:
      return null;
  }
}

export async function getAllOrders(userId: number, days: number = 7): Promise<any[]> {
  const connections = await getConnections(userId);
  const allOrders: any[] = [];
  const startDate = Date.now() - days * 24 * 60 * 60 * 1000;
  const startDateISO = new Date(startDate).toISOString();

  for (const conn of connections) {
    try {
      if (conn.platform === "trendyol") {
        const svc = createTrendyolService(conn.credentialsEncrypted);
        const result = await svc.getOrders({ startDate, endDate: Date.now() });
        const orders = result?.content || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "trendyol" })));
      } else if (conn.platform === "shopify") {
        const svc = createShopifyService(conn.credentialsEncrypted);
        const result = await svc.getOrders({});
        const orders = result?.orders || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "shopify" })));
      } else if (conn.platform === "hepsiburada") {
        const svc = createHepsiburadaService(conn.credentialsEncrypted);
        const result = await svc.getOrders({ startDate: startDateISO, endDate: new Date().toISOString() });
        const orders = result?.content || result?.orders || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "hepsiburada" })));
      } else if (conn.platform === "amazon_tr") {
        const svc = createAmazonTRService(conn.credentialsEncrypted);
        const result = await svc.getOrders({ startDate: startDateISO, endDate: new Date().toISOString() });
        const orders = result?.payload?.Orders || result?.Orders || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "amazon_tr" })));
      }
    } catch (err: any) {
      console.error(`[Marketplace] ${conn.platform} orders error:`, err.message);
    }
  }
  return allOrders;
}

export async function getAllProducts(userId: number): Promise<any[]> {
  const connections = await getConnections(userId);
  const allProducts: any[] = [];

  for (const conn of connections) {
    try {
      if (conn.platform === "trendyol") {
        const svc = createTrendyolService(conn.credentialsEncrypted);
        const result = await svc.getProducts(0, 100);
        const products = result?.content || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "trendyol" })));
      } else if (conn.platform === "shopify") {
        const svc = createShopifyService(conn.credentialsEncrypted);
        const result = await svc.getProducts(100);
        const products = result?.products || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "shopify" })));
      } else if (conn.platform === "hepsiburada") {
        const svc = createHepsiburadaService(conn.credentialsEncrypted);
        const result = await svc.getProducts(0, 100);
        const products = result?.listings || result?.content || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "hepsiburada" })));
      } else if (conn.platform === "amazon_tr") {
        const svc = createAmazonTRService(conn.credentialsEncrypted);
        const result = await svc.getProducts(100);
        const products = result?.items || result?.payload?.items || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "amazon_tr" })));
      }
    } catch (err: any) {
      console.error(`[Marketplace] ${conn.platform} products error:`, err.message);
    }
  }
  return allProducts;
}
