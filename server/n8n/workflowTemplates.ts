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
  {
    id: "hr-cv-evaluation",
    name: "CV Received → Evaluate & Notify",
    nametr: "CV Geldi → Değerlendir & Bildir",
    description: "When a new application/CV is received, creates evaluation task and notifies HR",
    descriptionTr: "Yeni başvuru/CV geldiğinde değerlendirme görevi oluşturur ve İK'ya bildirir",
    category: "hr",
    icon: "👤",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "create_application",
      agentType: "hr-recruiting",
      actionType: "application_created",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Yeni Başvuru Alındı", config: {}, nextNodeId: "condition-1", position: { x: 250, y: 50 } },
      {
        id: "condition-1", type: "condition", label: "Deneyim Kontrolü", config: { field: "experience", operator: "greater_than", value: "3" },
        conditionTrueNodeId: "action-1", conditionFalseNodeId: "action-3", nextNodeId: null, position: { x: 250, y: 180 },
      },
      { id: "action-1", type: "action", actionType: "create_task", label: "Mülakat Planla", config: { title: "Mülakat: {{name}} - {{position}}", description: "3+ yıl deneyimli aday. Mülakat sürecini başlat.", agentType: "hr-recruiting", priority: "high" }, nextNodeId: "action-2", position: { x: 100, y: 310 } },
      { id: "action-2", type: "action", actionType: "notify_boss", label: "Boss Bildirimi", config: { summary: "Güçlü aday: {{name}} ({{position}}) — {{experience}} yıl deneyim", notificationType: "strong_candidate" }, nextNodeId: null, position: { x: 100, y: 440 } },
      { id: "action-3", type: "action", actionType: "log_action", label: "Arşive Al", config: { description: "Başvuru arşivlendi: {{name}} — yetersiz deneyim", agentType: "hr-recruiting" }, nextNodeId: null, position: { x: 400, y: 310 } },
    ],
  },
  {
    id: "social-media-analytics",
    name: "Post Published → Analytics Log",
    nametr: "Gönderi Yayınlandı → Analitik Kayıt",
    description: "Logs analytics and notifies when social media post is published",
    descriptionTr: "Sosyal medya gönderisi yayınlandığında analitik kayıt tutar ve bildirir",
    category: "marketing",
    icon: "📱",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "create_social_post",
      agentType: "social-media",
      actionType: "post_published",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Gönderi Yayınlandı", config: {}, nextNodeId: "action-1", position: { x: 250, y: 50 } },
      { id: "action-1", type: "action", actionType: "log_action", label: "Analitik Kayıt", config: { description: "Sosyal medya gönderisi: {{platform}} — {{content}}", agentType: "social-media" }, nextNodeId: "action-2", position: { x: 250, y: 180 } },
      { id: "action-2", type: "action", actionType: "create_task", label: "Etkileşim Takibi", config: { title: "Etkileşim analizi: {{platform}} gönderisi", description: "24 saat sonra etkileşim metriklerini kontrol et", agentType: "data-analyst", priority: "medium" }, nextNodeId: null, position: { x: 250, y: 310 } },
    ],
  },
  {
    id: "ecommerce-order-chain",
    name: "Order → Invoice + Shipping + Notify",
    nametr: "Sipariş → Fatura + Kargo + Bildirim",
    description: "Complete order processing chain: invoice, shipping task, and boss notification",
    descriptionTr: "Tam sipariş işleme zinciri: fatura, kargo görevi ve bildirim",
    category: "ecommerce",
    icon: "🛒",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "marketplace_get_orders",
      agentType: "ecommerce-ops",
      actionType: "new_order",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Yeni Sipariş", config: {}, nextNodeId: "action-1", position: { x: 250, y: 50 } },
      { id: "action-1", type: "action", actionType: "log_action", label: "Sipariş Kayıt", config: { description: "Yeni sipariş: {{orderId}} — {{customerName}} — {{total}} ₺", agentType: "ecommerce-ops" }, nextNodeId: "action-2", position: { x: 250, y: 180 } },
      { id: "action-2", type: "action", actionType: "create_task", label: "Kargo Hazırla", config: { title: "Kargo: Sipariş #{{orderId}}", description: "{{customerName}} — {{address}} — Toplam: {{total}} ₺", agentType: "ecommerce-ops", priority: "high" }, nextNodeId: "action-3", position: { x: 250, y: 310 } },
      { id: "action-3", type: "action", actionType: "send_email", label: "Onay E-postası", config: { to: "{{customerEmail}}", subject: "Sipariş Onayı #{{orderId}}", body: "Sayın {{customerName}}, siparişiniz alınmıştır. Sipariş No: {{orderId}}, Toplam: {{total}} ₺. Kargoya verildiğinde bilgilendirileceksiniz." }, nextNodeId: "action-4", position: { x: 250, y: 440 } },
      { id: "action-4", type: "action", actionType: "notify_boss", label: "Boss Bildirimi", config: { summary: "Yeni sipariş #{{orderId}} — {{customerName}} — {{total}} ₺", notificationType: "new_order" }, nextNodeId: null, position: { x: 250, y: 570 } },
    ],
  },
  {
    id: "accounting-period-end",
    name: "Period End → Checklist",
    nametr: "Dönem Sonu → Kontrol Listesi",
    description: "Monthly accounting period-end checklist and reminder tasks",
    descriptionTr: "Aylık muhasebe dönem sonu kontrol listesi ve hatırlatma görevleri",
    category: "finance",
    icon: "📋",
    triggerType: "schedule",
    triggerConfig: {
      scheduleType: "monthly",
      scheduleDayOfMonth: 28,
      scheduleHour: 9,
      scheduleMinute: 0,
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Ay Sonu (28.)", config: {}, nextNodeId: "action-1", position: { x: 250, y: 50 } },
      { id: "action-1", type: "action", actionType: "create_task", label: "KDV Beyannamesi Hatırlatma", config: { title: "KDV Beyannamesi Hazırla", description: "Bu ayın KDV beyannamesini hazırla ve kontrol et. Son gün: ayın son iş günü.", agentType: "bookkeeping", priority: "high" }, nextNodeId: "action-2", position: { x: 250, y: 180 } },
      { id: "action-2", type: "action", actionType: "create_task", label: "Ba-Bs Formu Kontrol", config: { title: "Ba-Bs Formlarını Kontrol Et", description: "Bu ayki Ba-Bs formlarını kontrol et ve e-beyanname sistemine yükle.", agentType: "bookkeeping", priority: "medium" }, nextNodeId: "action-3", position: { x: 250, y: 310 } },
      { id: "action-3", type: "action", actionType: "notify_boss", label: "Dönem Sonu Bildirimi", config: { summary: "Dönem sonu kontrol listesi oluşturuldu — KDV beyannamesi ve Ba-Bs formu görevleri atandı", notificationType: "period_end" }, nextNodeId: null, position: { x: 250, y: 440 } },
    ],
  },
  {
    id: "support-sla-warning",
    name: "Support SLA → Warning",
    nametr: "Destek SLA → Uyarı",
    description: "Monitors support ticket response times and alerts on SLA breaches",
    descriptionTr: "Destek talebi yanıt sürelerini izler ve SLA ihlallerinde uyarı gönderir",
    category: "support",
    icon: "⏰",
    triggerType: "agent_tool_complete",
    triggerConfig: {
      toolName: "create_support_ticket",
      agentType: "customer-support",
      actionType: "ticket_created",
    },
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Destek Talebi Oluşturuldu", config: {}, nextNodeId: "condition-1", position: { x: 250, y: 50 } },
      {
        id: "condition-1", type: "condition", label: "Öncelik Kontrolü", config: { field: "priority", operator: "equals", value: "high" },
        conditionTrueNodeId: "action-1", conditionFalseNodeId: "action-2", nextNodeId: null, position: { x: 250, y: 180 },
      },
      { id: "action-1", type: "action", actionType: "notify_boss", label: "Acil SLA Uyarısı", config: { summary: "🚨 Yüksek öncelikli destek talebi: {{subject}} — 2 saat SLA", notificationType: "sla_urgent" }, nextNodeId: "action-3", position: { x: 100, y: 310 } },
      { id: "action-2", type: "action", actionType: "create_task", label: "Normal Takip", config: { title: "Destek takibi: {{subject}}", description: "Normal öncelikli talep — 24 saat içinde yanıt ver", agentType: "customer-support", priority: "medium" }, nextNodeId: null, position: { x: 400, y: 310 } },
      { id: "action-3", type: "action", actionType: "create_task", label: "Acil Görev", config: { title: "ACİL: {{subject}}", description: "Yüksek öncelikli talep — 2 saat içinde yanıt gerekli!", agentType: "customer-support", priority: "high" }, nextNodeId: null, position: { x: 100, y: 440 } },
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
