import { getUncachableStripeClient } from '../server/stripeClient';

async function createImageCreditProduct() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating RentAI 24 Image Credit products in Stripe...');

    const existing = await stripe.products.search({
      query: "name:'RentAI Image Credits' AND active:'true'"
    });
    if (existing.data.length > 0) {
      console.log('Image credit products already exist:');
      for (const p of existing.data) {
        const prices = await stripe.prices.list({ product: p.id, active: true });
        for (const pr of prices.data) {
          console.log(`  - ${p.name}: $${(pr.unit_amount! / 100).toFixed(2)} (${pr.id}) [qty: ${pr.metadata.credits}]`);
        }
      }
      return;
    }

    const product = await stripe.products.create({
      name: 'RentAI Image Credits',
      description: 'AI image generation credits for creating visuals, graphics, and brand imagery. Each credit generates one high-quality image.',
      metadata: {
        type: 'image_credits',
      },
    });
    console.log(`Created: ${product.name} (${product.id})`);

    const packs = [
      { credits: 1,  amount: 300,  label: '1 Image Credit — $3.00' },
      { credits: 5,  amount: 1200, label: '5 Image Credits — $12.00 ($2.40/each)' },
      { credits: 10, amount: 2000, label: '10 Image Credits — $20.00 ($2.00/each)' },
      { credits: 25, amount: 4500, label: '25 Image Credits — $45.00 ($1.80/each)' },
    ];

    for (const pack of packs) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.amount,
        currency: 'usd',
        metadata: {
          type: 'image_credits',
          credits: String(pack.credits),
        },
      });
      console.log(`  Price: ${pack.label} (${price.id})`);
    }

    console.log('\nImage credit products created successfully!');
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createImageCreditProduct();
