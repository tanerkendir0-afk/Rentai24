# RentAI 24 — Site Review Brief for Claude

## Site: https://rentai24.com
## Type: AI Staffing Agency SaaS Platform
## Target: Small/medium businesses in Turkey
## Language: Mixed Turkish/English UI

---

## ABOUT THE PLATFORM

RentAI 24 is an AI staffing agency where businesses "hire" pre-trained AI workers instead of traditional employees. Each AI agent specializes in a business function:

### AI Workers (Agents)
1. **Ava** — Customer Support Agent (7/24 destek)
2. **Rex** — Sales SDR Agent (lead bulma, takip)
3. **Maya** — Social Media Manager (kampanya, posting)
4. **Finn** — Bookkeeper/Accountant (fatura, mali rapor)
5. **Cal** — Calendar/Scheduling Agent (toplantı, randevu)
6. **Harper** — HR & Recruitment Agent (ilan, mülakat)
7. **DataBot** — Data Analyst Agent (analiz, rapor)
8. **ShopBot** — E-Commerce Agent (sipariş, kargo)
9. **Reno** — Real Estate Agent (ilan, portföy)
10. **Manager/Smart Router** — Routes requests to the right agent automatically

### Pricing
- Starter: $49/mo (1 agent, 100 msgs)
- Professional: $39/mo per agent (Best Value, 500 msgs)
- Enterprise: Custom

---

## PAGE-BY-PAGE DESCRIPTION

### 1. HOME PAGE (/)
- **Hero Section**: "Hire Your Next Top Employee, Not a Tool" headline with animated carousel of AI worker cards
- **Animated Showcase**: Cycles through Office, Agents, Tasks, Results, Scale scenes
- **How It Works**: 3-step process (Tell Us → Pick Agent → Deploy)
- **Agent Cards**: Shows all 9 agents with status badges, prices
- **Comparison Table**: Traditional Hiring vs RentAI 24 ($3000/mo vs $49/mo)
- **Stats**: Animated counters (satisfied clients, messages processed)
- **Testimonials**: Carousel with customer reviews
- **FAQ Section**: Common questions
- **Footer**: Links, social media

### 2. WORKERS MARKETPLACE (/workers)
- Grid of AI agent cards with filtering by category
- Each card: agent avatar, role, skills badges, price, "Online" status
- Search functionality
- Click leads to individual agent profile page

### 3. WORKER PROFILE (/workers/:slug)
- Detailed agent page with metrics (99.9% Accuracy etc.)
- Skills, languages, use cases
- Integration capabilities
- Hiring flow with plan selection

### 4. PRICING (/pricing)
- Three tiers: Starter, Professional, Enterprise
- Built-in checkout modal (Stripe test mode)
- Add-ons: extra languages, custom integrations, priority onboarding

### 5. HOW IT WORKS (/how-it-works)
- Step-by-step deployment timeline
- Visual guide of the hiring process

### 6. DEMO/CHAT (/demo)
- Full chat interface where visitors can test AI agents
- Agent selector sidebar
- Message bubbles with markdown support
- Image upload support
- Tool results displayed inline (emails sent, meetings scheduled)
- Manager mode for auto-routing

### 7. DASHBOARD (/dashboard) — Authenticated
- Active Workers panel with usage bars
- Messages Used counter
- Smart Alerts for lead management
- Activity log of agent actions

### 8. SETTINGS (/settings) — Authenticated
- Profile & Company info
- Integrations (Gmail OAuth, WhatsApp, Social Media)
- CRM Document Manager (file uploads)
- Shipping providers (Aras, Yurtici, DHL)
- API Keys management
- Billing/Subscription management

### 9. ADMIN PANEL (/kontrol-7x9k2) — Password Protected
- **Dashboard**: Boss AI chat, Overview stats, User management
- **AI Training**: RAG knowledge base, Training data upload, Fine-tuning, Custom agent instructions
- **Analytics**: Message logs, Spend analysis, Token optimization, Cost tracking, Performance metrics, Conversation review
- **Limits**: Message limit management, Package management
- **Security**: Guardrails, Support tickets, Security report, Escalations, Collaboration tools
- **Help**: Admin guide

---

## TECH STACK
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- Backend: Express.js + Drizzle ORM + PostgreSQL
- AI: OpenAI GPT-4
- Payments: Stripe
- Auth: Google OAuth + Passport.js
- PWA: Progressive Web App support

## DESIGN STYLE
- Dark theme with blue/violet gradients
- "Cyber-Serene" aesthetic
- Smooth animations via Framer Motion
- Responsive design (mobile + desktop)

---

## KNOWN IMPROVEMENT AREAS

1. Chat input is single-line (should be textarea for long prompts)
2. Agent "thinking" state shows only spinner (should show "Searching...", "Drafting email..." etc.)
3. Demo page and paid Chat page share same component (confusing for users)
4. Social proof logos are placeholder names (Synthera, VoltAI — not real)
5. Task panel is disconnected from chat stream
6. Mobile chat sidebar can overlap with panels
7. No category filter on home page agent section

---

## WHAT WE NEED FROM CLAUDE

Please review the site at https://rentai24.com and provide:

1. **UX/UI Design** — What improvements would make the biggest impact?
2. **Landing Page Conversion** — How to increase signups?
3. **Mobile Experience** — Any issues or improvements?
4. **User Flow** — From landing to signup to first agent interaction
5. **Trust & Social Proof** — How to build more credibility?
6. **SEO & Marketing** — Recommendations for growth
7. **Feature Priorities** — What should be built next?
8. **Claude API Integration Ideas** — How could Claude complement OpenAI in this platform?

Respond in Turkish please.
