import { getUncachableStripeClient } from './stripeClient';
import Stripe from 'stripe';

export class StripeService {
  async createCustomer(email: string, userId: number) {
    const stripe = getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId: String(userId) },
    });
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>,
    subscriptionMetadata?: Record<string, string>
  ) {
    const stripe = getUncachableStripeClient();
    const params: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(subscriptionMetadata ? { subscription_data: { metadata: subscriptionMetadata } } : {}),
    };
    return await stripe.checkout.sessions.create(params);
  }

  async createOneTimeCheckout(
    customerId: string,
    priceId: string,
    quantity: number,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
  ) {
    const stripe = getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}

export const stripeService = new StripeService();
