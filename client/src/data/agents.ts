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

export interface AgentMetadata {
  id: string;
  slug: string;
  integrations: string[];
  languages: string[];
  price: number;
  category: string;
}

export const agentMetadata: AgentMetadata[] = [
  {
    id: "customer-support",
    slug: "customer-support-agent",
    integrations: ["WhatsApp", "Intercom", "Zendesk", "Freshdesk", "Instagram DM", "Facebook Messenger", "Slack"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish", "Portuguese"],
    price: 99,
    category: "Customer Support",
  },
  {
    id: "sales-sdr",
    slug: "sales-development-rep",
    integrations: ["HubSpot", "Salesforce", "Pipedrive", "LinkedIn", "Gmail", "Calendly"],
    languages: ["English", "Spanish", "French", "German"],
    price: 149,
    category: "Sales",
  },
  {
    id: "social-media",
    slug: "social-media-manager",
    integrations: ["Instagram", "Twitter/X", "Facebook", "LinkedIn", "TikTok", "Buffer", "Hootsuite"],
    languages: ["English", "Spanish", "French", "Portuguese"],
    price: 119,
    category: "Marketing",
  },
  {
    id: "bookkeeping",
    slug: "bookkeeping-assistant",
    integrations: ["QuickBooks", "Xero", "FreshBooks", "Excel", "Stripe", "PayPal"],
    languages: ["English", "Spanish"],
    price: 129,
    category: "Finance",
  },
  {
    id: "scheduling",
    slug: "appointment-scheduling-agent",
    integrations: ["Google Calendar", "Calendly", "Acuity", "WhatsApp", "SMS", "Email"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish"],
    price: 79,
    category: "Operations",
  },
  {
    id: "hr-recruiting",
    slug: "hr-recruiting-assistant",
    integrations: ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workable", "BambooHR"],
    languages: ["English", "Spanish", "French"],
    price: 139,
    category: "HR",
  },
  {
    id: "data-analyst",
    slug: "data-analyst-agent",
    integrations: ["Google Sheets", "Excel", "Tableau", "Looker", "SQL Databases", "Airtable"],
    languages: ["English"],
    price: 159,
    category: "Operations",
  },
  {
    id: "ecommerce-ops",
    slug: "ecommerce-operations-agent",
    integrations: ["Shopify", "WooCommerce", "Amazon Seller", "Etsy", "eBay"],
    languages: ["English", "Spanish", "French", "German"],
    price: 129,
    category: "Operations",
  },
  {
    id: "real-estate",
    slug: "real-estate-property-agent",
    integrations: ["Zillow", "Apartments.com", "Redfin", "Craigslist", "Google Maps"],
    languages: ["English", "Spanish", "Turkish", "German"],
    price: 139,
    category: "Operations",
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
