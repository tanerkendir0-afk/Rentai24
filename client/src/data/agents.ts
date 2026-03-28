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
  category: string;
}

export const agentMetadata: AgentMetadata[] = [
  {
    id: "customer-support",
    slug: "customer-support-agent",
    integrations: ["WhatsApp", "Intercom", "Zendesk", "Freshdesk", "Instagram DM", "Facebook Messenger", "Slack"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish", "Portuguese"],
    category: "Customer Support",
  },
  {
    id: "sales-sdr",
    slug: "sales-development-rep",
    integrations: ["HubSpot", "Salesforce", "Pipedrive", "LinkedIn", "Gmail", "Calendly", "WhatsApp"],
    languages: ["English", "Turkish", "Spanish", "French", "German"],
    category: "Sales",
  },
  {
    id: "social-media",
    slug: "social-media-manager",
    integrations: ["Instagram", "Twitter/X", "Facebook", "LinkedIn", "TikTok", "YouTube", "Buffer", "Hootsuite"],
    languages: ["English", "Turkish", "Spanish", "French", "Portuguese"],
    category: "Marketing",
  },
  {
    id: "bookkeeping",
    slug: "bookkeeping-assistant",
    integrations: ["e-Devlet", "GİB (Gelir İdaresi)", "Excel", "e-Fatura", "TCMB", "Türk Bankaları"],
    languages: ["Turkish", "English"],
    category: "Finance",
  },
  {
    id: "scheduling",
    slug: "appointment-scheduling-agent",
    integrations: ["Google Calendar", "Calendly", "Acuity", "WhatsApp", "SMS", "Email"],
    languages: ["English", "Spanish", "French", "German", "Arabic", "Turkish"],
    category: "Operations",
  },
  {
    id: "hr-recruiting",
    slug: "hr-recruiting-assistant",
    integrations: ["LinkedIn", "Indeed", "Kariyer.net", "WhatsApp", "Gmail", "Workable"],
    languages: ["Turkish", "English", "Spanish", "French"],
    category: "HR",
  },
  {
    id: "data-analyst",
    slug: "data-analyst-agent",
    integrations: ["Google Sheets", "Excel", "CSV", "Airtable", "SQL Databases", "PDF"],
    languages: ["Turkish", "English"],
    category: "Operations",
  },
  {
    id: "ecommerce-ops",
    slug: "ecommerce-operations-agent",
    integrations: ["Trendyol", "Shopify", "Hepsiburada", "Amazon", "WooCommerce", "Aras Kargo", "DHL"],
    languages: ["Turkish", "English", "Spanish", "French", "German"],
    category: "Operations",
  },
  {
    id: "real-estate",
    slug: "real-estate-property-agent",
    integrations: ["Sahibinden.com", "Hepsiemlak.com", "Emlakjet.com", "Google Maps", "DASK"],
    languages: ["Turkish", "English", "Spanish", "German"],
    category: "Operations",
  },
  {
    id: "logistics",
    slug: "logistics-supply-chain-agent",
    integrations: ["Aras Kargo", "MNG Kargo", "Yurtiçi Kargo", "PTT Kargo", "UPS", "FedEx", "DHL"],
    languages: ["Turkish", "English", "Spanish", "French", "German"],
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
