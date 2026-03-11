# RentAI 24

## Overview
RentAI 24 — the world's first AI staffing agency website. Lets businesses browse and rent pre-trained AI agents for roles like customer support, sales, bookkeeping, etc.

## Brand
- Name: "RentAI 24" (AI highlighted in gradient)
- Tagline: "Rent AI, 24/7." / "Hire AI Workers. Not Headaches."
- Domain: rentai24.com
- Always dark mode (class="dark" on HTML + forced in main.tsx)
- Colors: Deep navy bg (#0A0E27), blue (#3B82F6) to violet (#8B5CF6) gradients
- Font: Inter (Google Fonts)

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Express.js
- AI: OpenAI GPT-4o via Replit AI Integrations (no personal API key needed)
- Routing: wouter
- Animations: Framer Motion
- Forms: react-hook-form + zod
- Data fetching: @tanstack/react-query
- Icons: lucide-react, react-icons/si

## Pages
- `/` — Homepage (hero, trust bar, how it works, catalog preview, stats, comparison, industries, testimonials, FAQ, CTA)
- `/workers` — AI Workers catalog (filterable grid of 8 agents)
- `/workers/:slug` — Individual worker profile page
- `/how-it-works` — 7-step process timeline
- `/pricing` — 3 tiers (Starter $49, Professional $39, Enterprise custom) + add-ons
- `/demo` — Live chat demo with agent selector, suggested prompts, conversation history
- `/about` — Mission, values, stats, founder
- `/contact` — Contact form with company size & AI worker interest dropdowns

## Key Files
- `client/src/data/agents.ts` — All 8 AI worker data, categories, industries, testimonials, FAQ
- `client/src/App.tsx` — Router setup
- `client/src/components/navbar.tsx` — Sticky navbar with mobile menu
- `client/src/components/footer.tsx` — Footer with newsletter signup
- `client/src/components/section-cta.tsx` — Reusable CTA section
- `server/routes.ts` — POST /api/chat (real OpenAI) + POST /api/contact
- `shared/schema.ts` — Zod schemas for chat and contact form (with input limits)

## 8 AI Workers (with Persona Names)
1. Ava — Customer Support Agent ($99/mo) — "Most Popular"
2. Rex — Sales Development Rep ($149/mo) — "High ROI"
3. Maya — Social Media Manager ($119/mo)
4. Finn — Bookkeeping Assistant ($129/mo)
5. Cal — Appointment & Scheduling Agent ($79/mo) — "Best Value"
6. Harper — HR & Recruiting Assistant ($139/mo)
7. DataBot — Data Analyst Agent ($159/mo) — "New"
8. ShopBot — E-Commerce Operations Agent ($129/mo)

## AI Integration
- Uses Replit AI Integrations (env vars: AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL)
- Model: gpt-4o, max_tokens: 800, temperature: 0.7
- Each agent has a specialized system prompt restricting it to its role
- Agents refuse off-topic requests and redirect to the appropriate specialist
- Input limits: message max 2000 chars, conversation history max 20 messages

## API Endpoints
- `POST /api/chat` — Real AI chat via OpenAI GPT-4o with agent-specific system prompts
- `POST /api/contact` — Contact form submission with Zod validation

## Development
- Run: `npm run dev` (Express + Vite on port 5000)
- No database needed (static content site with real AI chat)

## Integration Boilerplate (installed but not yet integrated)
- `server/replit_integrations/audio/` — Audio/voice routes
- `server/replit_integrations/image/` — Image generation routes
- `server/replit_integrations/batch/` — Batch processing utilities
- `server/replit_integrations/chat/` — Chat storage (DB-backed)
- `client/replit_integrations/audio/` — Audio playback/recording hooks
- `shared/models/chat.ts` — Chat/conversation DB schema
