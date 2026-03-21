import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';

const BOOST_CONFIG: Record<string, { maxParallelTasks: number }> = {
  "boost-3": { maxParallelTasks: 3 },
  "boost-7": { maxParallelTasks: 7 },
  "boost-accounting": { maxParallelTasks: 3 },
  "boost-pro": { maxParallelTasks: 99 },
};

const processedEventIds = new Set<string>();

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

    if (event.id && processedEventIds.has(event.id)) {
      console.log(`Webhook: Skipping duplicate event ${event.id}`);
      return;
    }
    if (event.id) {
      processedEventIds.add(event.id);
      if (processedEventIds.size > 10000) {
        const entries = Array.from(processedEventIds);
        for (let i = 0; i < 5000; i++) processedEventIds.delete(entries[i]);
      }
    }

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
    if (session.mode === 'payment' && session.metadata?.type === 'image_credits') {
      await WebhookHandlers.handleCreditsPurchase(session);
      return;
    }

    if (session.metadata?.type === 'boost') {
      await WebhookHandlers.handleBoostCheckout(session);
      return;
    }

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
    const plan = metadata.plan || 'standard';

    const PLAN_DAILY_LIMITS: Record<string, number> = {
      standard: 100,
      professional: 150,
      "all-in-one": 150,
      accounting: 200,
    };

    if (agentType) {
      const existing = await storage.getActiveRental(user.id, agentType);
      if (!existing) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await storage.createRental({
          userId: user.id,
          agentType,
          plan,
          status: 'active',
          messagesLimit: PLAN_DAILY_LIMITS[plan] || 100,
          dailyMessagesUsed: 0,
          dailyResetAt: new Date(),
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

  static async handleCreditsPurchase(session: any): Promise<void> {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const credits = parseInt(session.metadata?.credits || '0');

    if (credits <= 0) {
      console.error('Webhook: Invalid credit amount in metadata:', session.metadata);
      return;
    }

    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('Webhook: No user found for Stripe customer:', customerId);
      return;
    }

    await storage.addImageCredits(user.id, credits);
    console.log(`Webhook: Added ${credits} image credits to user ${user.id}`);
  }

  static async handleBoostCheckout(session: any): Promise<void> {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const boostPlan = session.metadata?.boostPlan;

    if (!boostPlan || !BOOST_CONFIG[boostPlan]) {
      console.error('Webhook: Invalid boost plan in metadata:', session.metadata);
      return;
    }

    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('Webhook: No user found for Stripe customer:', customerId);
      return;
    }

    const existing = await storage.getActiveBoostSubscription(user.id);
    if (existing) {
      console.log(`Webhook: User ${user.id} already has an active boost subscription, updating`);
      await storage.updateBoostSubscription(existing.id, {
        stripeBoostSubId: subscriptionId || existing.stripeBoostSubId,
      });
      return;
    }

    const boostConfig = BOOST_CONFIG[boostPlan];
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await storage.createBoostSubscription({
      userId: user.id,
      boostPlan,
      maxParallelTasks: boostConfig.maxParallelTasks,
      status: 'active',
      stripeBoostSubId: subscriptionId || null,
      expiresAt,
    });
    console.log(`Webhook: Created boost subscription for user ${user.id}, plan ${boostPlan}`);
  }
}
