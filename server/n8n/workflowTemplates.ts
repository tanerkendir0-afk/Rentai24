import type { WorkflowNode, TriggerConfig } from "@shared/schema";

export interface WorkflowTemplate {
  id: string;
  name: string;
  nametr: string;
  description: string;
  descriptionTr: string;
  category: string;
  icon: string;
  triggerType: string;
  triggerConfig: TriggerConfig;
  nodes: WorkflowNode[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "invoice-to-email",
    name: "Invoice → Send Email",
    nametr: "Fatura → E-posta Gönder",
    description: "Automatically sends an email notification when a PDF invoice is generated",
    descriptionTr: "PDF fatura oluşturulduğunda otomatik olarak e-posta bildirimi gönderir",
    category: "finance",
    icon: "📄",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "generate_pdf",
      agentType: "bookkeeping",
      actionType: "pdf_generated",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "PDF Oluşturuldu",
        config: {},
        nextNodeId: "action-1",
      },
      {
        id: "action-1",
        type: "action",
        actionType: "notify_boss",
        label: "Boss Bildirimi",
        config: {
          summary: "Yeni fatura PDF oluşturuldu: {{filename}}",
          notificationType: "invoice_generated",
        },
        nextNodeId: "action-2",
      },
      {
        id: "action-2",
        type: "action",
        actionType: "log_action",
        label: "Aksiyon Kaydet",
        config: {
          description: "Otomasyon: Fatura {{filename}} oluşturuldu, bildirim gönderildi",
          agentType: "bookkeeping",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "new-lead-scoring",
    name: "New Lead → Score & Follow-up",
    nametr: "Yeni Lead → Skor & Takip",
    description: "When a new lead is added, automatically creates a follow-up task",
    descriptionTr: "Yeni lead eklendiğinde otomatik olarak takip görevi oluşturur",
    category: "sales",
    icon: "🎯",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "add_lead",
      agentType: "sales-sdr",
      actionType: "lead_added",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "Yeni Lead Eklendi",
        config: {},
        nextNodeId: "action-1",
      },
      {
        id: "action-1",
        type: "action",
        actionType: "create_task",
        label: "Takip Görevi Oluştur",
        config: {
          title: "Lead takip: {{name}}",
          description: "Yeni lead {{name}} ({{email}}) eklendi. İlk iletişimi başlat.",
          agentType: "sales-sdr",
          priority: "high",
        },
        nextNodeId: "action-2",
      },
      {
        id: "action-2",
        type: "action",
        actionType: "notify_boss",
        label: "Boss Bildirimi",
        config: {
          summary: "Yeni lead eklendi: {{name}} ({{company}})",
          notificationType: "new_lead",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "order-shipping",
    name: "Order → Create Shipping",
    nametr: "Sipariş → Kargo Talimatı",
    description: "When a new order comes in, automatically creates a shipping task and notifies the boss",
    descriptionTr: "Yeni sipariş geldiğinde otomatik kargo görevi oluşturur ve bildirir",
    category: "ecommerce",
    icon: "📦",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "marketplace_get_orders",
      agentType: "ecommerce-ops",
      actionType: "orders_fetched",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "Siparişler Alındı",
        config: {},
        nextNodeId: "action-1",
      },
      {
        id: "action-1",
        type: "action",
        actionType: "create_task",
        label: "Kargo Görevi",
        config: {
          title: "Sipariş kargo hazırlığı",
          description: "Yeni siparişler alındı. Kargo sürecini başlat.",
          agentType: "ecommerce-ops",
          priority: "high",
        },
        nextNodeId: "action-2",
      },
      {
        id: "action-2",
        type: "action",
        actionType: "notify_boss",
        label: "Boss Bildirimi",
        config: {
          summary: "Yeni siparişler alındı — kargo süreci başlatılacak",
          notificationType: "new_orders",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "boss-daily-summary",
    name: "Daily Summary Report",
    nametr: "Günlük Özet Rapor",
    description: "Scheduled daily summary of all agent activities sent to boss",
    descriptionTr: "Tüm ajan aktivitelerinin günlük özetini boss'a gönderir",
    category: "management",
    icon: "📊",
    triggerType: "schedule",
    triggerConfig: {
      cronExpression: "0 18 * * *",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "Her Gün 18:00",
        config: {},
        nextNodeId: "action-1",
      },
      {
        id: "action-1",
        type: "action",
        actionType: "notify_boss",
        label: "Günlük Özet",
        config: {
          summary: "Günlük aktivite özeti hazırlandı",
          notificationType: "daily_summary",
        },
        nextNodeId: "action-2",
      },
      {
        id: "action-2",
        type: "action",
        actionType: "log_action",
        label: "Kayıt",
        config: {
          description: "Günlük özet raporu oluşturuldu ve bildirildi",
          agentType: "data-analyst",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "email-sent-notification",
    name: "Email Sent → Boss Notification",
    nametr: "E-posta Gönderildi → Boss Bildirimi",
    description: "Notifies the boss whenever an agent sends an email",
    descriptionTr: "Bir ajan e-posta gönderdiğinde boss'a bildirim gönderir",
    category: "communication",
    icon: "📧",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "send_email",
      actionType: "email_sent",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "E-posta Gönderildi",
        config: {},
        nextNodeId: "condition-1",
      },
      {
        id: "condition-1",
        type: "condition",
        label: "Alıcı Kontrol",
        config: {
          field: "to",
          operator: "exists",
        },
        conditionTrueNodeId: "action-1",
        conditionFalseNodeId: null,
        nextNodeId: null,
      },
      {
        id: "action-1",
        type: "action",
        actionType: "notify_boss",
        label: "Boss Bildirimi",
        config: {
          summary: "{{agentType}} ajanı {{to}} adresine e-posta gönderdi: {{subject}}",
          notificationType: "email_sent_alert",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "support-ticket-webhook",
    name: "Support Ticket → Webhook",
    nametr: "Destek Talebi → Webhook",
    description: "Sends a webhook notification when a support ticket is created",
    descriptionTr: "Destek talebi oluşturulduğunda webhook bildirimi gönderir",
    category: "support",
    icon: "🎫",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "create_support_ticket",
      agentType: "customer-support",
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "Destek Talebi Oluşturuldu",
        config: {},
        nextNodeId: "action-1",
      },
      {
        id: "action-1",
        type: "action",
        actionType: "create_task",
        label: "Görev Oluştur",
        config: {
          title: "Destek talebi: {{subject}}",
          description: "{{description}}",
          agentType: "customer-support",
          priority: "high",
        },
        nextNodeId: "action-2",
      },
      {
        id: "action-2",
        type: "action",
        actionType: "notify_boss",
        label: "Boss Bildirimi",
        config: {
          summary: "Yeni destek talebi: {{subject}} — {{category}}",
          notificationType: "support_ticket",
        },
        nextNodeId: null,
      },
    ],
  },
  {
    id: "efatura-parse-to-db",
    name: "e-Fatura XML → Parse → DB",
    nametr: "e-Fatura XML → Parse → Veritabanına Kayıt",
    description: "Automatically parses uploaded e-Invoice XML and saves to database",
    descriptionTr: "Yüklenen e-Fatura XML dosyasını otomatik parse edip veritabanına kaydeder",
    category: "finance",
    icon: "📄",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "parse_efatura_xml",
      agentType: "bookkeeping",
      actionType: "efatura_parsed",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "e-Fatura Parse Edildi", config: {}, nextNodeId: "action-1" },
      { id: "action-1", type: "send_notification", label: "Bildirim Gönder", config: { message: "📄 e-Fatura parse edildi: {{belgeNo}} - Satıcı: {{saticiUnvani}} - KDV: {{kdvTutari}} ₺" }, nextNodeId: null },
    ],
  },
  {
    id: "kdv-listesi-to-email",
    name: "KDV List → Email",
    nametr: "KDV Listesi → E-posta Gönder",
    description: "Sends KDV list report via email when generated",
    descriptionTr: "İndirilecek KDV Listesi oluşturulduğunda otomatik e-posta gönderir",
    category: "finance",
    icon: "📋",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "generate_kdv_listesi",
      agentType: "bookkeeping",
      actionType: "kdv_listesi_generated",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "KDV Listesi Oluşturuldu", config: {}, nextNodeId: "action-1" },
      { id: "action-1", type: "send_email", label: "Mali Müşavire Gönder", config: { subject: "İndirilecek KDV Listesi - {{donem}}", body: "{{donem}} dönemi İndirilecek KDV Listesi hazırdır. Toplam {{toplamFatura}} fatura, Genel KDV: {{toplamKDV}} ₺" }, nextNodeId: null },
    ],
  },
  {
    id: "kdv-batch-parse-notify",
    name: "Batch Parse → Summary",
    nametr: "Toplu Fatura Parse → Özet Bildirim",
    description: "Sends summary notification after batch invoice parsing",
    descriptionTr: "Toplu fatura parse işlemi sonrası özet bildirim gönderir",
    category: "finance",
    icon: "📊",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "parse_efatura_xml",
      agentType: "bookkeeping",
      actionType: "efatura_parsed",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Parse Tamamlandı", config: {}, nextNodeId: "action-1" },
      { id: "action-1", type: "webhook_call", label: "Webhook Bildirim", config: { url: "{{webhookUrl}}", method: "POST" }, nextNodeId: null },
    ],
  },
];

export function getTemplateById(templateId: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === templateId);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.category === category);
}

export function getAllTemplateCategories(): string[] {
  return [...new Set(workflowTemplates.map((t) => t.category))];
}
