# RentAI 24

## Overview
RentAI 24 — the world's first AI staffing agency website. Lets businesses browse, rent, and manage pre-trained AI agents for roles like customer support, sales, bookkeeping, etc.

## Brand
- Name: "RentAI 24" (AI highlighted in gradient)
- Tagline: "Rent AI, 24/7." / "Hire AI Workers. Not Headaches."
- Always dark mode (class="dark" on HTML + forced in main.tsx)
- Colors: Deep navy bg (#0A0E27), blue (#3B82F6) to violet (#8B5CF6) gradients
- Font: Inter (Google Fonts)

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Express.js + PostgreSQL (Neon serverless)
- ORM: Drizzle ORM
- AI: OpenAI GPT-4o via Replit AI Integrations
- Payments: Stripe (via Replit Stripe integration + stripe-replit-sync)
- Auth: express-session + memorystore + bcrypt
- Routing: wouter
- Animations: Framer Motion
- Forms: react-hook-form + zod
- Data fetching: @tanstack/react-query
- Icons: lucide-react, react-icons/si

## Pages
- `/` — Homepage
- `/workers` — AI Workers catalog (8 agents)
- `/workers/:slug` — Worker profile with "Rent This Worker" button (Stripe checkout)
- `/how-it-works` — Process timeline
- `/pricing` — 3 pricing tiers with Stripe checkout integration
- `/demo` — Live AI chat demo with agent selector
- `/about` — About page
- `/contact` — Contact form
- `/login` — Sign in page
- `/register` — Create account page
- `/dashboard` — Customer dashboard (protected, shows rented workers + usage stats + Manage Billing)

## Key Files
- `client/src/data/agents.ts` — All 8 AI worker data
- `client/src/App.tsx` — Router setup with AuthProvider
- `client/src/lib/auth.tsx` — Auth context provider (login/register/logout)
- `client/src/lib/queryClient.ts` — TanStack Query setup with on401 handling
- `client/src/pages/dashboard.tsx` — Customer dashboard with rental cards + billing management
- `client/src/pages/pricing.tsx` — Pricing page with Stripe checkout buttons
- `client/src/pages/worker-profile.tsx` — Worker profile with Stripe checkout for renting
- `client/src/pages/login.tsx` — Login page
- `client/src/pages/register.tsx` — Registration page
- `client/src/components/navbar.tsx` — Navbar with auth-aware buttons
- `server/routes.ts` — All API routes (auth, chat, rentals, contact, stripe)
- `server/auth.ts` — Auth middleware (requireAuth)
- `server/db.ts` — Database connection (Neon/Drizzle)
- `server/storage.ts` — Storage layer (users, rentals, stripe data queries)
- `server/stripeClient.ts` — Stripe SDK client + StripeSync setup
- `server/stripeService.ts` — Stripe service (checkout, portal, customer creation)
- `server/webhookHandlers.ts` — Stripe webhook handler
- `scripts/seed-products.ts` — Stripe product/price seeding script
- `shared/schema.ts` — Database schemas + Zod validation schemas

## Database Tables
- `users` — id, username, email, password (hashed), full_name, company, stripe_customer_id, stripe_subscription_id, created_at
- `rentals` — id, user_id, agent_type, plan, status, messages_used, messages_limit, started_at, expires_at
- `stripe.*` — Auto-managed by stripe-replit-sync (products, prices, customers, subscriptions, etc.)

## Stripe Integration
- Connected via Replit Stripe integration (sandbox/test mode)
- Credentials: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY (env vars)
- stripe-replit-sync handles schema migrations, webhook management, and data backfill
- Webhook route registered BEFORE express.json() middleware at /api/stripe/webhook
- 3 Stripe products created: Starter ($49/mo), Professional ($39/mo), Enterprise ($199/mo)
- Checkout flow: Frontend calls POST /api/stripe/checkout → creates Stripe Checkout session → redirects to Stripe
- Billing portal: POST /api/stripe/portal → Stripe Customer Portal for subscription management
- Products queried from stripe.products/stripe.prices tables (synced from Stripe)
- Webhook handlers process: checkout.session.completed (creates rental + sets stripeSubscriptionId), customer.subscription.updated (activates/monitors rentals), customer.subscription.deleted (deactivates all rentals + clears stripeSubscriptionId)
- POST /api/rentals gated: requires user to have active stripeSubscriptionId
- Dashboard shows subscription status badge (Active Subscription / No Subscription)
- Sensitive Stripe URLs (checkout, portal, config) suppressed from API logs
- Enterprise plan shown as "Contact Sales" on frontend (no direct checkout)

## 8 AI Workers (with Persona Names)
1. Ava — Customer Support Agent ($99/mo)
2. Rex — Sales Development Rep ($149/mo)
3. Maya — Social Media Manager ($119/mo)
4. Finn — Bookkeeping Assistant ($129/mo)
5. Cal — Appointment & Scheduling Agent ($79/mo)
6. Harper — HR & Recruiting Assistant ($139/mo)
7. DataBot — Data Analyst Agent ($159/mo)
8. ShopBot — E-Commerce Operations Agent ($129/mo)

## AI Integration
- Uses Replit AI Integrations (AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL)
- Model: gpt-4o, max_tokens: 800, temperature: 0.7
- Each agent has role-restricted system prompt
- Input limits: message max 2000 chars, conversation max 20 messages

## Auth System
- Session-based authentication (express-session + memorystore)
- bcrypt password hashing (12 rounds)
- Auth context uses setQueryData for instant UI updates after login/register
- Protected routes redirect to /login via useEffect
- Navbar shows Sign In / Dashboard based on auth state

## Rental System
- Users can rent AI workers from worker profile pages
- Each rental tracks: plan, status, messages used/limit
- Dashboard shows active rentals with usage progress bars
- Chat tracks usage against rental limits

## API Endpoints
- `POST /api/auth/register` — Create account + session
- `POST /api/auth/login` — Login + session
- `POST /api/auth/logout` — Destroy session
- `GET /api/auth/me` — Current user
- `GET /api/rentals` — User's rentals (protected)
- `POST /api/rentals` — Rent an AI worker (protected)
- `POST /api/chat` — AI chat via OpenAI GPT-4o
- `POST /api/contact` — Contact form submission
- `GET /api/stripe/config` — Stripe publishable key
- `GET /api/stripe/products` — List products with prices
- `POST /api/stripe/checkout` — Create Stripe Checkout session (protected)
- `POST /api/stripe/portal` — Create Stripe Customer Portal session (protected)
- `GET /api/stripe/subscription` — Get user's subscription status (protected)

## Development
- Run: `npm run dev` (Express + Vite on port 5000)
- DB push: `npm run db:push`
- Seed Stripe products: `npx tsx scripts/seed-products.ts`
