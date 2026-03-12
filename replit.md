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
- `/about` — About page (founder: Daniel Reeves)
- `/contact` — Contact form (saves to DB)
- `/login` — Sign in page
- `/register` — Create account page
- `/dashboard` — Customer dashboard (protected, shows rented workers + usage stats + Manage Billing)
- `/admin` — Admin panel (password-protected via ADMIN_PASSWORD env var, RAG + fine-tuning + messages/subscribers tabs)
- `/privacy` — Privacy Policy page
- `/terms` — Terms of Service page

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
- `server/upload.ts` — Multer upload middleware (documents + training files)
- `server/documentParser.ts` — Document parsing pipeline (TXT, PDF, DOCX, CSV, URL) + text chunking
- `server/ragService.ts` — RAG service: embeddings (text-embedding-3-small), vector storage, cosine similarity retrieval
- `server/fineTuningService.ts` — OpenAI fine-tuning: create jobs, sync status, toggle active model
- `client/src/pages/admin.tsx` — Admin panel UI (password-protected, RAG + fine-tuning management)
- `shared/schema.ts` — Database schemas + Zod validation schemas

## Database Tables
- `users` — id, username, email, password (hashed), full_name, company, stripe_customer_id, stripe_subscription_id, created_at
- `rentals` — id, user_id, agent_type, plan, status, messages_used, messages_limit, started_at, expires_at
- `agent_documents` — id, agent_type, filename, content_type, chunk_count, file_size, uploaded_at (RAG knowledge base docs)
- `document_chunks` — id, document_id, agent_type, content, chunk_index, embedding (vector(1536) via pgvector)
- `fine_tuning_jobs` — id, agent_type, openai_job_id, openai_file_id, fine_tuned_model, status, is_active, training_file, error, created_at, updated_at
- `contact_messages` — id, name, email, company, company_size, ai_worker_interest, message, created_at (contact form submissions)
- `newsletter_subscribers` — id, email (unique), subscribed_at (newsletter signups)
- `leads` — id, user_id, name, email, company, status (new/contacted/qualified/proposal/negotiation/won/lost), notes, created_at, updated_at
- `agent_actions` — id, user_id, agent_type, action_type, description, metadata (jsonb), created_at
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
- Model: gpt-4o, max_tokens: 800, temperature: 0.7 (or fine-tuned model if active for agent)
- Each agent has role-restricted system prompt
- Input limits: message max 2000 chars, conversation max 20 messages
- RAG: Uploaded documents chunked (~500 words, 50 overlap), embedded via text-embedding-3-small, stored in pgvector, top-5 cosine similarity retrieval prepended to system prompt
- Fine-tuning: JSONL upload → OpenAI fine-tune on gpt-4o-mini-2024-07-18 → toggle active model per agent (requires OPENAI_API_KEY env var — direct OpenAI key, separate from Replit AI integration)

## Agentic AI Tool System
- Generalized tool registry in `server/agentTools.ts` with `agentToolRegistry` map and `getToolsForAgent()` function
- Tool-calling is no longer hardcoded to Rex — any agent in the registry gets tools automatically
- All tool actions logged in `agent_actions` table with rich JSONB metadata

### Rex — Sales SDR (17 tools)
- Core: send_email, add_lead, update_lead, list_leads, schedule_followup, create_meeting
- Campaigns: bulk_email, use_template, start_drip_campaign, list_campaigns, list_templates
- Analytics: score_leads, pipeline_report
- Sales docs: create_proposal, analyze_competitors
- Email routing: Gmail (OAuth) → Resend (platform) fallback chain (`server/emailService.ts`)
- Email templates: `server/emailTemplates.ts` — 5 pre-built templates
- Drip campaigns: `email_campaigns` table, 3 campaign types, `server/campaignRunner.ts` hourly processor
- Lead scoring: Hot/Warm/Cold based on status + recency
- Smart alerts: GET /api/smart-alerts
- Follow-ups: `server/followupScheduler.ts`
- Calendar: `server/calendarService.ts`

### Ava — Customer Support (5 tools)
- create_ticket: Create support tickets with subject, description, priority, customer email
- list_tickets: List/filter support tickets by status
- update_ticket: Update ticket status/priority/resolution
- close_ticket: Close ticket with resolution summary
- email_customer: Send email updates to customers
- Data: `support_tickets` table (user-scoped, status/priority/resolution tracking)

### Cal — Scheduling (4 tools)
- create_appointment: Create appointments with Google Calendar event + invite
- list_appointments: View all scheduled appointments
- send_reminder: Send reminder emails about upcoming meetings
- schedule_followup_reminder: Schedule future follow-up reminder emails
- Uses same calendarService and followupScheduler infrastructure as Rex

### DataBot — Data Analyst (5 tools)
- query_leads: Analyze CRM lead data grouped by status/score/company
- query_actions: Analyze activity log by type/agent/time range
- query_campaigns: Analyze email campaign performance
- query_rentals: Analyze AI worker usage and message consumption
- generate_report: Generate comprehensive reports (executive_summary, sales_performance, activity_overview, agent_usage)
- Pulls real data from all tables — no mocked numbers

### Maya — Social Media (6 tools)
- generate_image: AI image generation (DALL-E 3) for brand visuals, post graphics, story images — supports all aspect ratios
- find_stock_image: Find professional stock photos matching descriptions (photorealistic style)
- create_post: Generate platform-specific social media posts (Instagram, Twitter, LinkedIn, Facebook, TikTok)
- create_content_calendar: Generate multi-day content calendars with posting schedules
- generate_hashtags: Generate optimized hashtag sets for any topic and platform
- draft_response: Draft responses to customer comments/reviews with sentiment awareness
- Image service: `server/imageService.ts` — DALL-E 3 generation + stock photo search, images served via `/api/images/:filename`

### Chat Image Upload
- Customers can upload images in chat via `/api/chat/upload` (requires auth, max 10MB, JPG/PNG/GIF/WebP/SVG)
- Uploaded images shown as preview before sending, displayed inline in chat messages
- AI-generated images from Maya also displayed inline with download links
- Upload button visible only to logged-in users

### Finn — Bookkeeping (3 tools)
- create_invoice: Generate invoices with line items, totals, and optional email delivery
- log_expense: Log expenses with categories (office, software, travel, marketing, etc.)
- financial_summary: Generate financial summaries from logged invoices/expenses for any period

### Harper — HR & Recruiting (4 tools)
- create_job_posting: Create professional job postings with requirements and responsibilities
- screen_resume: Evaluate candidates against job requirements with fit scoring
- create_interview_kit: Generate tailored interview questions for any role and level
- send_candidate_email: Send emails to candidates (invites, offers, updates)

### ShopBot — E-Commerce Ops (3 tools)
- optimize_listing: Generate SEO-optimized product listings for Amazon, Shopify, Etsy, etc.
- price_analysis: Analyze pricing with cost, competitor comparison, and margin calculations
- draft_review_response: Draft professional responses to customer product reviews

### Shared Infrastructure
- All 8 agents now have real tool-calling capabilities (total: 45 tools across all agents)
- Dashboard shows: stats grid (workers, messages, remaining, active campaigns), Smart Alerts, Agent Activity Log with per-action-type icons (35+ icon mappings)
- Leads stored in `leads` table (user-scoped CRM with status + score tracking)
- Action metadata stored as JSONB for rich audit trail

## Brand Identity Protection
- ALL 8 agent system prompts + default prompt include BRAND_CONFIDENTIALITY block
- Agents NEVER reveal: OpenAI, GPT, Resend, Replit, Node.js, Express, PostgreSQL, Stripe, or any third-party tool name
- Standard response: "I was developed by RentAI 24 using our proprietary AI technology, purpose-built and trained specifically for my role."
- Rule overrides all other instructions — even if user claims to be admin/developer
- Admin panel at /admin (ADMIN_PASSWORD env var required)

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
- `POST /api/rentals` — Add worker to subscription (requires active Stripe subscription, validated against subscription status)
- `POST /api/chat` — AI chat via OpenAI GPT-4o (RAG-enhanced, uses fine-tuned model if active)
- `POST /api/contact` — Contact form submission
- `GET /api/campaigns` — User's drip campaigns (protected)
- `GET /api/smart-alerts` — Smart alerts for user's leads (protected)
- `GET /api/stripe/config` — Stripe publishable key
- `GET /api/stripe/products` — List products with prices
- `POST /api/stripe/checkout` — Create Stripe Checkout session (protected)
- `POST /api/stripe/portal` — Create Stripe Customer Portal session (protected)
- `GET /api/stripe/subscription` — Get user's subscription status (protected)
- `POST /api/admin/auth` — Admin login (validates ADMIN_PASSWORD)
- `GET /api/admin/agents/:agentType/documents` — List RAG documents (admin)
- `POST /api/admin/agents/:agentType/documents` — Upload document for RAG (admin, multipart)
- `POST /api/admin/agents/:agentType/documents/url` — Add URL content to RAG (admin)
- `DELETE /api/admin/documents/:docId` — Delete RAG document (admin)
- `GET /api/admin/agents/:agentType/fine-tuning` — List fine-tuning jobs (admin)
- `POST /api/admin/agents/:agentType/fine-tuning` — Upload JSONL + start fine-tuning (admin)
- `POST /api/admin/fine-tuning/:jobId/sync` — Sync fine-tuning job status from OpenAI (admin)
- `POST /api/admin/fine-tuning/:jobId/activate` — Activate fine-tuned model (admin)
- `POST /api/admin/agents/:agentType/fine-tuning/deactivate` — Deactivate all fine-tuned models for agent (admin)
- `GET /api/admin/agents/:agentType/stats` — Agent stats: doc count, FT jobs, active model (admin)

## PWA Support
- Web app manifest at `client/public/manifest.json` (app name, icons, standalone display, theme colors)
- Service worker at `client/public/sw.js` (stale-while-revalidate for static, network-first for API)
- Icons: `client/public/icon-192.png`, `client/public/icon-512.png` (blue-to-violet gradient with Bot icon)
- SW registered in `client/src/main.tsx` on window load
- Install prompt hook at `client/src/hooks/use-pwa-install.ts` (beforeinstallprompt + appinstalled events)
- "Install App" button in navbar (desktop + mobile) — only shows when browser supports PWA install
- Meta tags in `client/index.html`: manifest link, theme-color, apple-mobile-web-app-capable/status-bar-style/title

## Development
- Run: `npm run dev` (Express + Vite on port 5000)
- DB push: `npm run db:push`
- Seed Stripe products: `npx tsx scripts/seed-products.ts`
