import type { Express } from "express";
import { createServer, type Server } from "http";
import { chatMessageSchema, contactFormSchema } from "@shared/schema";

// TODO: AI MODEL ENTEGRASYONU
const agentResponses: Record<string, string> = {
  "musteri-hizmetleri": "Merhaba! Ben AI Müşteri Hizmetleri Asistanınızım. Size nasıl yardımcı olabilirim? Sipariş takibi, şikayet yönetimi veya genel sorularınız için buradayım.",
  "satis-pazarlama": "Merhaba! Ben AI Satış ve Pazarlama Uzmanınızım. Lead toplama, teklif hazırlama veya CRM yönetimi konularında size nasıl destek olabilirim?",
  "sosyal-medya": "Merhaba! Ben AI Sosyal Medya Yöneticinizim. İçerik planlama, post yazma veya sosyal medya analitiği konularında yardımcı olabilirim.",
  "muhasebe": "Merhaba! Ben AI Muhasebe Asistanınızım. Fatura işleme, gider takibi veya finansal raporlama konularında size nasıl yardımcı olabilirim?",
  "randevu-rezervasyon": "Merhaba! Ben AI Randevu ve Rezervasyon Asistanınızım. Randevu oluşturma, hatırlatma gönderme veya takvim yönetimi konularında yardımcı olabilirim.",
  "insan-kaynaklari": "Merhaba! Ben AI İnsan Kaynakları Asistanınızım. CV tarama, aday ön eleme veya mülakat planlama konularında size destek olabilirim.",
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // BURAYA AI MODEL API BAĞLANTISI YAPILACAK
  app.post("/api/chat", (req, res) => {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz istek" });
    }

    const { message, agentType } = parsed.data;

    // TODO: AI MODEL ENTEGRASYONU
    // Gerçek API bağlantısı yapıldığında aşağıdaki mock yanıt kaldırılacak
    const defaultReply = "Merhaba! Ben AI asistanınızım. Bu bir demo versiyonudur. Gerçek AI çalışanlarımız çok daha kapsamlı yanıtlar verebilir.";
    const reply = agentResponses[agentType] || defaultReply;

    res.json({ reply: `${reply}\n\nSorunuz: "${message}" — Bu demo modunda sabit yanıtlar verilmektedir. Gerçek AI entegrasyonu için bizimle iletişime geçin.` });
  });

  app.post("/api/contact", (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Form verilerini kontrol ediniz", details: parsed.error.flatten() });
    }

    res.json({ success: true, message: "Mesajınız başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz." });
  });

  return httpServer;
}
