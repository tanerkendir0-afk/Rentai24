import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString());
    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: { type: string; data: { object: any } }): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await WebhookHandlers.handleSubscriptionUpdated(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
      }
      default:
        break;
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
      return;
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('Webhook: No user found for Stripe customer:', customerId);
      return;
    }

    await storage.updateUserStripeInfo(user.id, { stripeSubscriptionId: subscriptionId });

    const metadata = session.metadata || {};
    const agentType = metadata.agentType;
    const plan = metadata.plan || 'starter';

    if (agentType) {
      const existing = await storage.getActiveRental(user.id, agentType);
      if (!existing) {
        const planLimits: Record<string, number> = {
          starter: 100,
          professional: 500,
          enterprise: 5000,
        };
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await storage.createRental({
          userId: user.id,
          agentType,
          plan,
          status: 'active',
          messagesLimit: planLimits[plan] || 100,
          expiresAt,
        });
        console.log(`Webhook: Created rental for user ${user.id}, agent ${agentType}, plan ${plan}`);
      }
    }
  }

  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;

    await storage.updateUserStripeInfo(user.id, { stripeSubscriptionId: subscription.id });

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await storage.activateUserRentals(user.id);
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      console.log(`Webhook: Subscription ${subscription.id} is ${subscription.status} for user ${user.id}`);
    }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;

    await storage.updateUserStripeInfo(user.id, { stripeSubscriptionId: null });
    await storage.deactivateUserRentals(user.id);
    console.log(`Webhook: Deactivated all rentals for user ${user.id} (subscription cancelled)`);
  }
}
