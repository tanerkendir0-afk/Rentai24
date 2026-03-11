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
- Auth: express-session + memorystore + bcrypt
- Routing: wouter
- Animations: Framer Motion
- Forms: react-hook-form + zod
- Data fetching: @tanstack/react-query
- Icons: lucide-react, react-icons/si

## Pages
- `/` — Homepage
- `/workers` — AI Workers catalog (8 agents)
- `/workers/:slug` — Worker profile with "Rent This Worker" button
- `/how-it-works` — Process timeline
- `/pricing` — 3 pricing tiers
- `/demo` — Live AI chat demo with agent selector
- `/about` — About page
- `/contact` — Contact form
- `/login` — Sign in page
- `/register` — Create account page
- `/dashboard` — Customer dashboard (protected, shows rented workers + usage stats)

## Key Files
- `client/src/data/agents.ts` — All 8 AI worker data
- `client/src/App.tsx` — Router setup with AuthProvider
- `client/src/lib/auth.tsx` — Auth context provider (login/register/logout)
- `client/src/lib/queryClient.ts` — TanStack Query setup with on401 handling
- `client/src/pages/dashboard.tsx` — Customer dashboard with rental cards
- `client/src/pages/login.tsx` — Login page
- `client/src/pages/register.tsx` — Registration page
- `client/src/components/navbar.tsx` — Navbar with auth-aware buttons
- `server/routes.ts` — All API routes (auth, chat, rentals, contact)
- `server/auth.ts` — Auth middleware (requireAuth)
- `server/db.ts` — Database connection (Neon/Drizzle)
- `server/storage.ts` — Storage layer (users, rentals CRUD)
- `shared/schema.ts` — Database schemas + Zod validation schemas

## Database Tables
- `users` — id, username, email, password (hashed), full_name, company, created_at
- `rentals` — id, user_id, agent_type, plan, status, messages_used, messages_limit, started_at, expires_at

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

## Development
- Run: `npm run dev` (Express + Vite on port 5000)
- DB push: `npm run db:push`
