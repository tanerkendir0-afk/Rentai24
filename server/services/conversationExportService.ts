import { db } from "../db";
import { sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { Writable } from "stream";

interface ExportMessage {
  role: string;
  content: string;
  createdAt: string;
  agentType: string;
}

export async function exportConversationAsCSV(
  conversationId: number,
  userId: number,
): Promise<string> {
  const messages = await getConversationMessages(conversationId, userId);
  if (messages.length === 0) return "";

  const header = "Date,Role,Agent,Message";
  const rows = messages.map(m => {
    const date = new Date(m.createdAt).toISOString();
    const content = `"${m.content.replace(/"/g, '""').replace(/\n/g, " ")}"`;
    return `${date},${m.role},${m.agentType},${content}`;
  });

  return [header, ...rows].join("\n");
}

export async function exportConversationAsPDF(
  conversationId: number,
  userId: number,
  options?: { title?: string; companyName?: string },
): Promise<Buffer> {
  const messages = await getConversationMessages(conversationId, userId);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(writable);

    doc.fontSize(18).font("Helvetica-Bold")
      .text(options?.title || "Conversation Export", { align: "center" });
    doc.moveDown(0.5);

    if (options?.companyName) {
      doc.fontSize(10).font("Helvetica").fillColor("#666")
        .text(options.companyName, { align: "center" });
    }

    doc.fontSize(9).fillColor("#999")
      .text(`Exported: ${new Date().toLocaleDateString("tr-TR")} | Messages: ${messages.length}`, { align: "center" });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
    doc.moveDown(0.5);

    for (const msg of messages) {
      if (doc.y > 700) doc.addPage();

      const isUser = msg.role === "user";
      const date = new Date(msg.createdAt).toLocaleString("tr-TR");

      doc.fontSize(8).fillColor("#999").text(date);
      doc.fontSize(10).font("Helvetica-Bold")
        .fillColor(isUser ? "#2563eb" : "#059669")
        .text(isUser ? "You" : getAgentName(msg.agentType));

      doc.font("Helvetica").fontSize(10).fillColor("#333")
        .text(msg.content, { width: 495 });
      doc.moveDown(0.5);
    }

    doc.end();
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
  });
}

export async function exportAllConversationsAsCSV(
  userId: number,
  agentType?: string,
  days?: number,
): Promise<string> {
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;
  const agentFilter = agentType ? sql`AND cm.agent_type = ${agentType}` : sql``;
  const dateFilter = since ? sql`AND cm.created_at >= ${since}` : sql``;

  const result = await db.execute(sql`
    SELECT cm.role, cm.content, cm.agent_type, cm.created_at, cm.session_id
    FROM chat_messages cm
    WHERE cm.user_id = ${userId} ${agentFilter} ${dateFilter}
    ORDER BY cm.created_at ASC
  `);

  const rows = result.rows as any[];
  if (rows.length === 0) return "";

  const header = "Date,Session,Role,Agent,Message";
  const csvRows = rows.map(r => {
    const date = new Date(r.created_at).toISOString();
    const content = `"${String(r.content).replace(/"/g, '""').replace(/\n/g, " ")}"`;
    return `${date},${r.session_id || ""},${r.role},${r.agent_type},${content}`;
  });

  return [header, ...csvRows].join("\n");
}

async function getConversationMessages(conversationId: number, userId: number): Promise<ExportMessage[]> {
  const result = await db.execute(sql`
    SELECT cm.role, cm.content, cm.agent_type, cm.created_at
    FROM chat_messages cm
    JOIN conversations c ON cm.session_id = c.session_id
    WHERE c.id = ${conversationId} AND c.user_id = ${userId}
    ORDER BY cm.created_at ASC
  `);

  return (result.rows as any[]).map(r => ({
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
    agentType: r.agent_type,
  }));
}

function getAgentName(agentType: string): string {
  const names: Record<string, string> = {
    "customer-support": "Ava",
    "sales-sdr": "Rex",
    "social-media": "Maya",
    "bookkeeping": "Finn",
    "scheduling": "Cal",
    "hr-recruiting": "Harper",
    "data-analyst": "DataBot",
    "ecommerce-ops": "ShopBot",
    "real-estate": "Reno",
  };
  return names[agentType] || agentType;
}
