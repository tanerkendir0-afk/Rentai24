export interface Agent {
  id: string;
  slug: string;
  name: string;
  role: string;
  shortDescription: string;
  fullDescription: string;
  skills: string[];
  integrations: string[];
  languages: string[];
  price: number;
  priceLabel: string;
  category: string;
  tag?: string;
  responseTime?: string;
  useCases: string[];
  metrics: { label: string; value: string }[];
}

export const agents: Agent[] = [
  {
    id: "customer-support",
    slug: "customer-support-agent",
    name: "Customer Support Agent",
    role: "Customer Service Representative",
    shortDescription: "Handles live chat, email, complaints, and order tracking 24/7 with empathy and speed.",
    fullDescription: "Our Customer Support Agent is trained to handle the full spectrum of customer service tasks. From live chat and email responses to complaint resolution and order tracking, this agent delivers fast, accurate, and empathetic support around the clock. It learns your products, policies, and brand voice to provide consistent, on-brand responses every time.",
    skills: ["Live Chat", "Email Response", "Complaint Handling", "Order Tracking", "Refund Processing", "FAQ Handling"],
    integrations: ["WhatsApp", "Intercom", "Zendesk", "Freshdesk", "Instagram DM", "Facebook Messenger", "Slack"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish", "Portuguese"],
    price: 99,
    priceLabel: "$99/mo",
    category: "Customer Support",
    tag: "Most Popular",
    responseTime: "<5 seconds",
    useCases: [
      "E-commerce stores needing 24/7 customer support",
      "SaaS companies handling technical support queries",
      "Hospitality businesses managing guest inquiries",
      "Retail brands processing returns and exchanges",
    ],
    metrics: [
      { label: "Avg Response Time", value: "<5s" },
      { label: "Resolution Rate", value: "94%" },
      { label: "Customer Satisfaction", value: "4.8/5" },
      { label: "Languages", value: "7" },
    ],
  },
  {
    id: "sales-sdr",
    slug: "sales-development-rep",
    name: "Sales Development Rep",
    role: "Outbound Sales Agent",
    shortDescription: "Generates leads, sends cold outreach, drafts proposals, and keeps your CRM updated.",
    fullDescription: "This AI SDR automates the most time-consuming parts of the sales process. It researches prospects, crafts personalized outreach emails, follows up systematically, updates your CRM, and schedules meetings with qualified leads. It's like having a tireless SDR that never misses a follow-up.",
    skills: ["Lead Generation", "Cold Outreach", "Follow-up Emails", "Proposal Drafting", "CRM Updates", "Meeting Scheduling"],
    integrations: ["HubSpot", "Salesforce", "Pipedrive", "LinkedIn", "Gmail", "Calendly"],
    languages: ["English", "Spanish", "French", "German"],
    price: 149,
    priceLabel: "$149/mo",
    category: "Sales",
    tag: "High ROI",
    useCases: [
      "B2B companies scaling outbound sales",
      "Startups building their sales pipeline",
      "Agencies generating leads for clients",
      "Real estate firms prospecting new listings",
    ],
    metrics: [
      { label: "Leads/Month", value: "500+" },
      { label: "Email Open Rate", value: "42%" },
      { label: "Meeting Booked Rate", value: "8%" },
      { label: "Languages", value: "4" },
    ],
  },
  {
    id: "social-media",
    slug: "social-media-manager",
    name: "Social Media Manager",
    role: "Content & Community Manager",
    shortDescription: "Plans content, writes posts, moderates comments, and delivers analytics reports.",
    fullDescription: "Your AI Social Media Manager handles everything from content planning and post creation to comment moderation and analytics reporting. It stays on top of trends, optimizes posting times, and maintains consistent engagement across all your social channels.",
    skills: ["Content Planning", "Post Writing", "Comment Moderation", "Hashtag Research", "Analytics Reporting", "Trend Monitoring"],
    integrations: ["Instagram", "Twitter/X", "Facebook", "LinkedIn", "TikTok", "Buffer", "Hootsuite"],
    languages: ["English", "Spanish", "French", "Portuguese"],
    price: 119,
    priceLabel: "$119/mo",
    category: "Marketing",
    useCases: [
      "Brands maintaining active social media presence",
      "Marketing agencies managing multiple client accounts",
      "E-commerce stores driving social traffic",
      "Restaurants and cafes engaging local audiences",
    ],
    metrics: [
      { label: "Posts/Week", value: "20+" },
      { label: "Engagement Rate", value: "+35%" },
      { label: "Response Time", value: "<15min" },
      { label: "Languages", value: "4" },
    ],
  },
  {
    id: "bookkeeping",
    slug: "bookkeeping-assistant",
    name: "Bookkeeping Assistant",
    role: "Financial Operations Agent",
    shortDescription: "Processes invoices, tracks expenses, generates reports, and sends tax reminders.",
    fullDescription: "The Bookkeeping Assistant automates your financial operations. It processes invoices, categorizes expenses, reconciles accounts, generates financial reports, and ensures you never miss a tax deadline. Accurate, compliant, and always up to date.",
    skills: ["Invoice Processing", "Expense Tracking", "Financial Reporting", "Tax Reminders", "Receipt Scanning", "Reconciliation"],
    integrations: ["QuickBooks", "Xero", "FreshBooks", "Excel", "Stripe", "PayPal"],
    languages: ["English", "Spanish"],
    price: 129,
    priceLabel: "$129/mo",
    category: "Finance",
    useCases: [
      "Small businesses managing their own books",
      "Freelancers tracking income and expenses",
      "Accounting firms handling multiple clients",
      "Startups keeping clean financial records",
    ],
    metrics: [
      { label: "Accuracy Rate", value: "99.2%" },
      { label: "Processing Time", value: "<30s" },
      { label: "Reports/Month", value: "Unlimited" },
      { label: "Languages", value: "2" },
    ],
  },
  {
    id: "scheduling",
    slug: "appointment-scheduling-agent",
    name: "Appointment & Scheduling Agent",
    role: "Scheduling Coordinator",
    shortDescription: "Manages bookings, sends reminders, handles rescheduling, and follows up on no-shows.",
    fullDescription: "This AI scheduling agent manages your entire appointment workflow. It handles online booking, sends automated reminders, manages rescheduling and cancellations, follows up on no-shows, and maintains waitlists. Perfect for service-based businesses.",
    skills: ["Online Booking", "Reminders", "Calendar Management", "Rescheduling", "No-show Follow-up", "Waitlist Management"],
    integrations: ["Google Calendar", "Calendly", "Acuity", "WhatsApp", "SMS", "Email"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish"],
    price: 79,
    priceLabel: "$79/mo",
    category: "Operations",
    tag: "Best Value",
    useCases: [
      "Clinics and healthcare providers",
      "Salons and spas managing appointments",
      "Consultants scheduling client calls",
      "Restaurants handling reservations",
    ],
    metrics: [
      { label: "No-show Reduction", value: "60%" },
      { label: "Booking Speed", value: "<10s" },
      { label: "Reminder Rate", value: "100%" },
      { label: "Languages", value: "6" },
    ],
  },
  {
    id: "hr-recruiting",
    slug: "hr-recruiting-assistant",
    name: "HR & Recruiting Assistant",
    role: "Talent Acquisition Agent",
    shortDescription: "Screens resumes, shortlists candidates, schedules interviews, and manages onboarding.",
    fullDescription: "The HR & Recruiting Assistant streamlines your entire hiring pipeline. It screens resumes against your criteria, shortlists top candidates, coordinates interview scheduling, prepares onboarding documents, and posts jobs across multiple platforms.",
    skills: ["Resume Screening", "Candidate Shortlisting", "Interview Scheduling", "Onboarding Docs", "Job Posting"],
    integrations: ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workable", "BambooHR"],
    languages: ["English", "Spanish", "French"],
    price: 139,
    priceLabel: "$139/mo",
    category: "HR",
    useCases: [
      "Growing companies scaling their team",
      "HR departments processing high volumes",
      "Recruiting agencies managing client pipelines",
      "Startups hiring their first employees",
    ],
    metrics: [
      { label: "Screening Speed", value: "50 CVs/hr" },
      { label: "Match Accuracy", value: "91%" },
      { label: "Time to Shortlist", value: "<2hrs" },
      { label: "Languages", value: "3" },
    ],
  },
  {
    id: "data-analyst",
    slug: "data-analyst-agent",
    name: "Data Analyst Agent",
    role: "Business Intelligence Assistant",
    shortDescription: "Cleans data, generates reports, builds dashboards, and tracks KPIs automatically.",
    fullDescription: "Your AI Data Analyst handles data cleaning, report generation, dashboard creation, trend analysis, KPI tracking, and anomaly detection. It turns raw data into actionable insights without you needing to write a single formula.",
    skills: ["Data Cleaning", "Report Generation", "Dashboard Creation", "Trend Analysis", "KPI Tracking", "Anomaly Detection"],
    integrations: ["Google Sheets", "Excel", "Tableau", "Looker", "SQL Databases", "Airtable"],
    languages: ["English"],
    price: 159,
    priceLabel: "$159/mo",
    category: "Operations",
    tag: "New",
    useCases: [
      "Marketing teams analyzing campaign performance",
      "Operations teams monitoring business metrics",
      "Finance teams creating regular reports",
      "Product teams tracking user behavior",
    ],
    metrics: [
      { label: "Reports/Day", value: "Unlimited" },
      { label: "Data Sources", value: "50+" },
      { label: "Accuracy", value: "99.5%" },
      { label: "Languages", value: "1" },
    ],
  },
  {
    id: "ecommerce-ops",
    slug: "ecommerce-operations-agent",
    name: "E-Commerce Operations Agent",
    role: "Store Operations Manager",
    shortDescription: "Manages product listings, inventory alerts, price monitoring, and review responses.",
    fullDescription: "This AI agent manages your e-commerce operations end to end. From product listing optimization and inventory alerts to competitor price monitoring, review responses, and order tracking, it keeps your online store running smoothly 24/7.",
    skills: ["Product Listing", "Inventory Alerts", "Price Monitoring", "Review Responses", "Order Tracking", "Competitor Analysis"],
    integrations: ["Shopify", "WooCommerce", "Amazon Seller", "Etsy", "eBay"],
    languages: ["English", "Spanish", "French", "German"],
    price: 129,
    priceLabel: "$129/mo",
    category: "Operations",
    useCases: [
      "E-commerce brands with multiple SKUs",
      "Marketplace sellers on Amazon/Etsy",
      "D2C brands scaling operations",
      "Dropshipping businesses managing suppliers",
    ],
    metrics: [
      { label: "Listing Updates", value: "Real-time" },
      { label: "Review Response", value: "<1hr" },
      { label: "Price Checks", value: "Hourly" },
      { label: "Languages", value: "4" },
    ],
  },
];

export const categories = [
  "All",
  "Customer Support",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
];

export const industries = [
  { name: "E-Commerce & Retail", icon: "ShoppingCart" },
  { name: "Restaurants & Hospitality", icon: "UtensilsCrossed" },
  { name: "Healthcare & Clinics", icon: "Heart" },
  { name: "Legal & Law Firms", icon: "Scale" },
  { name: "Accounting & Finance", icon: "Calculator" },
  { name: "Real Estate", icon: "Building2" },
  { name: "Education & E-Learning", icon: "GraduationCap" },
  { name: "Travel & Tourism", icon: "Plane" },
  { name: "SaaS & Tech Startups", icon: "Code" },
  { name: "Marketing Agencies", icon: "Megaphone" },
];

export const testimonials = [
  {
    name: "Sarah K.",
    company: "NexaShop",
    role: "COO",
    text: "We replaced 3 support reps with one RentAI worker. Response time dropped 80% and customer satisfaction went up.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    company: "GrowthBase",
    role: "Head of Sales",
    text: "The SDR agent generated more qualified leads in its first week than our team did in a month. Absolute game-changer.",
    rating: 5,
  },
  {
    name: "Priya S.",
    company: "Bloom Wellness",
    role: "Founder",
    text: "Our scheduling agent eliminated no-shows almost entirely. It handles bookings, reminders, and follow-ups without us lifting a finger.",
    rating: 5,
  },
  {
    name: "David L.",
    company: "PixelCraft Agency",
    role: "Creative Director",
    text: "The social media manager AI keeps all 12 of our client accounts active and engaging. We've scaled without hiring.",
    rating: 5,
  },
];

export const faqItems = [
  {
    question: "What exactly is an AI worker?",
    answer: "An AI worker is a pre-trained artificial intelligence agent designed to perform specific business tasks autonomously. Think of it as a digital team member that specializes in a particular role — customer support, sales, bookkeeping, etc. — and works 24/7 without breaks.",
  },
  {
    question: "How is this different from ChatGPT or other AI tools?",
    answer: "Unlike general-purpose AI tools, our AI workers are pre-trained and fine-tuned for specific business roles. They integrate directly with your existing tools (CRM, helpdesk, etc.), maintain context across conversations, and are designed to handle real business workflows end-to-end — not just answer questions.",
  },
  {
    question: "Will AI workers replace my human employees?",
    answer: "No. Our AI workers are designed to augment your team, not replace it. They handle repetitive, time-consuming tasks so your human employees can focus on strategy, creativity, and relationship-building — the things humans do best.",
  },
  {
    question: "How do you integrate with my existing systems?",
    answer: "We support integrations with 50+ popular tools including CRMs (HubSpot, Salesforce), helpdesks (Zendesk, Intercom), communication tools (WhatsApp, Slack), and more. Our team handles the entire integration process for you.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We're SOC 2 compliant, GDPR compliant, and your data is never used to train our models. You own your data, always.",
  },
  {
    question: "What happens if the AI makes a mistake?",
    answer: "Our AI workers have built-in confidence thresholds. When they're unsure, they escalate to a human team member. You can set custom escalation rules, and our team monitors performance to continuously reduce error rates.",
  },
  {
    question: "Can I customize the AI worker for my specific needs?",
    answer: "Yes! Professional and Enterprise plans include custom fine-tuning. We can train the AI on your specific products, brand voice, policies, and workflows to ensure it represents your business accurately.",
  },
  {
    question: "What's your refund policy?",
    answer: "We offer a 14-day free trial with no credit card required. If you're not satisfied after subscribing, we offer a full refund within the first 30 days. No questions asked.",
  },
];
