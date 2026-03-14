import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

export function getUncachableStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey);
}

let stripeSyncInstance: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  stripeSyncInstance = new StripeSync({
    stripeSecretKey: secretKey,
    databaseUrl: process.env.DATABASE_URL!,
    poolConfig: {},
  });
  return stripeSyncInstance;
}

export function getPublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("STRIPE_PUBLISHABLE_KEY not configured");
  }
  return key;
}
