import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating RentAI 24 subscription plans in Stripe...');

    const existingProducts = await stripe.products.search({
      query: "name:'RentAI Starter Plan' AND active:'true'"
    });
    if (existingProducts.data.length > 0) {
      console.log('Products already exist. Skipping creation.');
      for (const p of existingProducts.data) {
        console.log(`  - ${p.name} (${p.id})`);
      }
      return;
    }

    const starterProduct = await stripe.products.create({
      name: 'RentAI Starter Plan',
      description: 'Perfect for small businesses getting started with AI. 1 AI Worker, basic integrations, 100 messages/month.',
      metadata: {
        plan: 'starter',
        workers: '1',
        messages: '100',
      },
    });
    console.log(`Created: ${starterProduct.name} (${starterProduct.id})`);

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 4900,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'starter' },
    });
    console.log(`  Price: $49.00/month (${starterPrice.id})`);

    const proProduct = await stripe.products.create({
      name: 'RentAI Professional Plan',
      description: 'Best value for growing teams. Up to 5 AI Workers, advanced integrations, 500 messages/month per worker.',
      metadata: {
        plan: 'professional',
        workers: '5',
        messages: '500',
      },
    });
    console.log(`Created: ${proProduct.name} (${proProduct.id})`);

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 3900,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'professional' },
    });
    console.log(`  Price: $39.00/month per worker (${proPrice.id})`);

    const enterpriseProduct = await stripe.products.create({
      name: 'RentAI Enterprise Plan',
      description: 'For large-scale operations. Unlimited AI Workers, custom integrations, 5000 messages/month per worker, dedicated support.',
      metadata: {
        plan: 'enterprise',
        workers: 'unlimited',
        messages: '5000',
      },
    });
    console.log(`Created: ${enterpriseProduct.name} (${enterpriseProduct.id})`);

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 19900,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'enterprise' },
    });
    console.log(`  Price: $199.00/month (${enterprisePrice.id})`);

    console.log('\nAll products and prices created successfully!');
    console.log('Webhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
