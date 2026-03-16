import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating RentAI 24 subscription plans in Stripe...');

    const existingProducts = await stripe.products.search({
      query: "name:'RentAI Standard Plan' AND active:'true'"
    });
    if (existingProducts.data.length > 0) {
      console.log('Products already exist. Skipping creation.');
      for (const p of existingProducts.data) {
        console.log(`  - ${p.name} (${p.id})`);
      }
      return;
    }

    const standardProduct = await stripe.products.create({
      name: 'RentAI Standard Plan',
      description: 'Choose up to 3 AI agents (excl. Finn), 100 messages/day per agent. Ideal for growing businesses.',
      metadata: {
        plan: 'standard',
        workers: '3',
        dailyMessages: '100',
      },
    });
    console.log(`Created: ${standardProduct.name} (${standardProduct.id})`);

    const standardPrice = await stripe.prices.create({
      product: standardProduct.id,
      unit_amount: 30000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'standard' },
    });
    console.log(`  Price: $300.00/month (${standardPrice.id})`);

    const proProduct = await stripe.products.create({
      name: 'RentAI Professional Plan',
      description: 'Choose up to 7 AI agents (excl. Finn), 150 messages/day per agent. Best for scaling teams.',
      metadata: {
        plan: 'professional',
        workers: '7',
        dailyMessages: '150',
      },
    });
    console.log(`Created: ${proProduct.name} (${proProduct.id})`);

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 60000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'professional' },
    });
    console.log(`  Price: $600.00/month (${proPrice.id})`);

    const allInOneProduct = await stripe.products.create({
      name: 'RentAI All-in-One Plan',
      description: 'All 9 AI agents included, 150 messages/day per agent. Complete AI workforce solution.',
      metadata: {
        plan: 'all-in-one',
        workers: '9',
        dailyMessages: '150',
      },
    });
    console.log(`Created: ${allInOneProduct.name} (${allInOneProduct.id})`);

    const allInOnePrice = await stripe.prices.create({
      product: allInOneProduct.id,
      unit_amount: 120000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'all-in-one' },
    });
    console.log(`  Price: $1,200.00/month (${allInOnePrice.id})`);

    const accountingProduct = await stripe.products.create({
      name: 'RentAI Accounting Only (Finn)',
      description: 'Dedicated Finn (bookkeeping) agent only, 200 messages/day. Specialized accounting solution.',
      metadata: {
        plan: 'accounting',
        workers: '1',
        dailyMessages: '200',
      },
    });
    console.log(`Created: ${accountingProduct.name} (${accountingProduct.id})`);

    const accountingPrice = await stripe.prices.create({
      product: accountingProduct.id,
      unit_amount: 50000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'accounting' },
    });
    console.log(`  Price: $500.00/month (${accountingPrice.id})`);

    console.log('\nAll products and prices created successfully!');
    console.log('Webhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
