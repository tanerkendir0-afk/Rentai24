import type { SupportedLang } from "./i18n";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const templates: Record<string, Record<SupportedLang, EmailTemplate>> = {
  cold_outreach: {
    en: {
      id: "cold_outreach",
      name: "Cold Outreach",
      subject: "Quick question for {{company}}",
      body: `Hi {{name}},

I came across {{company}} and was impressed by what you're building. I wanted to reach out because we help companies like yours achieve better results with AI-powered solutions.

I'd love to learn more about your current challenges and explore if there's a fit. Would you be open to a quick 15-minute call this week?

Looking forward to connecting.

Best regards`,
    },
    tr: {
      id: "cold_outreach",
      name: "Soğuk İletişim",
      subject: "{{company}} için kısa bir soru",
      body: `Merhaba {{name}},

{{company}} hakkında araştırma yaparken yaptıklarınızdan çok etkilendim. AI destekli çözümlerimizle sizin gibi şirketlerin daha iyi sonuçlar elde etmesine yardımcı oluyoruz.

Mevcut ihtiyaçlarınız hakkında daha fazla bilgi edinmek ve uygun bir çözüm sunup sunamayacağımızı değerlendirmek isterim. Bu hafta 15 dakikalık kısa bir görüşmeye müsait olur musunuz?

İletişime geçmeyi sabırsızlıkla bekliyorum.

Saygılarımla`,
    },
  },
  follow_up: {
    en: {
      id: "follow_up",
      name: "Follow Up",
      subject: "Following up — {{company}}",
      body: `Hi {{name}},

I wanted to follow up on my previous message. I understand you're busy, but I believe there's a real opportunity for {{company}} to benefit from what we offer.

Here's a quick summary of how we've helped similar companies:
- Reduced operational costs by 40%
- Increased team productivity by 3x
- Automated repetitive tasks saving 20+ hours/week

Would a brief conversation make sense? I'm happy to work around your schedule.

Best regards`,
    },
    tr: {
      id: "follow_up",
      name: "Takip",
      subject: "Takip — {{company}}",
      body: `Merhaba {{name}},

Önceki mesajımla ilgili takip yapmak istedim. Yoğun olduğunuzu biliyorum, ancak {{company}} için sunduğumuz çözümlerden gerçekten fayda sağlayabileceğinize inanıyorum.

Benzer şirketlere nasıl yardımcı olduğumuzun kısa bir özeti:
- Operasyonel maliyetlerde %40 azalma
- Ekip verimliliğinde 3 kat artış
- Tekrarlayan görevlerin otomasyonuyla haftada 20+ saat tasarruf

Kısa bir görüşme yapmamız mantıklı olur mu? Programınıza göre ayarlayabilirim.

Saygılarımla`,
    },
  },
  value_proposition: {
    en: {
      id: "value_proposition",
      name: "Value Proposition",
      subject: "How {{company}} can save 20+ hours/week",
      body: `Hi {{name}},

Companies like {{company}} often face these challenges:
- Teams spending too much time on repetitive tasks
- Difficulty scaling operations without scaling headcount
- Inconsistent quality when workload increases

We've built AI-powered solutions that address exactly these pain points. Our clients typically see:
- 40% reduction in operational costs
- 3x increase in throughput
- ROI within the first 30 days

I'd love to show you a quick demo tailored to {{company}}'s needs. Are you available for a 20-minute call this week?

Best regards`,
    },
    tr: {
      id: "value_proposition",
      name: "Değer Önerisi",
      subject: "{{company}} haftada 20+ saat nasıl tasarruf edebilir?",
      body: `Merhaba {{name}},

{{company}} gibi şirketler genellikle şu zorluklarla karşılaşır:
- Ekiplerin tekrarlayan görevlere çok fazla zaman harcaması
- Kadro artırmadan operasyonları ölçeklendirme zorluğu
- İş yükü arttığında kalitede tutarsızlık

Tam olarak bu sorunları çözen AI destekli çözümler geliştirdik. Müşterilerimiz genellikle şu sonuçları elde ediyor:
- Operasyonel maliyetlerde %40 azalma
- Verimlikte 3 kat artış
- İlk 30 gün içinde yatırım getirisi

{{company}}'nin ihtiyaçlarına özel kısa bir demo göstermek isterim. Bu hafta 20 dakikalık bir görüşmeye müsait misiniz?

Saygılarımla`,
    },
  },
  meeting_request: {
    en: {
      id: "meeting_request",
      name: "Meeting Request",
      subject: "Demo request — AI solutions for {{company}}",
      body: `Hi {{name}},

Thank you for your interest in our AI solutions. I'd like to schedule a personalized demo to show you exactly how we can help {{company}}.

In the demo, I'll cover:
- How our AI workers handle tasks specific to your industry
- Live examples of automation in action
- Custom pricing based on your needs

Would any of these times work for you?
- [Time slot 1]
- [Time slot 2]
- [Time slot 3]

If none of these work, just let me know your availability and I'll find a time that suits you.

Best regards`,
    },
    tr: {
      id: "meeting_request",
      name: "Toplantı Talebi",
      subject: "Demo talebi — {{company}} için AI çözümleri",
      body: `Merhaba {{name}},

AI çözümlerimize gösterdiğiniz ilgi için teşekkür ederim. {{company}}'ye nasıl yardımcı olabileceğimizi göstermek için size özel bir demo planlamak istiyorum.

Demo'da şunları ele alacağım:
- AI çalışanlarımızın sektörünüze özel görevleri nasıl yönettiği
- Otomasyonun canlı örnekleri
- İhtiyaçlarınıza göre özel fiyatlandırma

Aşağıdaki saatlerden herhangi biri size uygun olur mu?
- [Saat seçeneği 1]
- [Saat seçeneği 2]
- [Saat seçeneği 3]

Bunlardan hiçbiri uygun değilse, müsaitlik durumunuzu bildirmeniz yeterli.

Saygılarımla`,
    },
  },
  proposal: {
    en: {
      id: "proposal",
      name: "Proposal",
      subject: "Proposal: AI Solutions for {{company}}",
      body: `Hi {{name}},

Following our discussion, I'm pleased to share a tailored proposal for {{company}}.

EXECUTIVE SUMMARY
We propose implementing AI-powered workforce solutions to help {{company}} streamline operations, reduce costs, and accelerate growth.

RECOMMENDED SOLUTION
Based on your needs, we recommend:
- AI Workers tailored to your specific workflows
- 24/7 availability with no downtime
- Seamless integration with your existing tools

INVESTMENT
Our solutions start at $49/month per AI worker, with volume discounts available for multiple deployments.

NEXT STEPS
1. Review this proposal
2. Schedule a final Q&A call
3. Begin onboarding (typically 24-48 hours)

I'm confident this partnership will deliver significant value to {{company}}. Let me know if you have any questions.

Best regards`,
    },
    tr: {
      id: "proposal",
      name: "Teklif",
      subject: "Teklif: {{company}} için AI Çözümleri",
      body: `Merhaba {{name}},

Görüşmemizin ardından {{company}} için hazırladığımız özel teklifi paylaşmaktan memnuniyet duyarım.

YÖNETİCİ ÖZETİ
{{company}}'nin operasyonlarını düzene koymak, maliyetleri azaltmak ve büyümeyi hızlandırmak için AI destekli iş gücü çözümleri uygulamayı öneriyoruz.

ÖNERİLEN ÇÖZÜM
İhtiyaçlarınıza göre önerilerimiz:
- İş akışlarınıza özel AI Çalışanlar
- Kesintisiz 7/24 hizmet
- Mevcut araçlarınızla sorunsuz entegrasyon

YATIRIM
Çözümlerimiz AI çalışan başına aylık 49$'dan başlamaktadır. Birden fazla kullanım için hacim indirimleri mevcuttur.

SONRAKİ ADIMLAR
1. Bu teklifi inceleyin
2. Son soru-cevap görüşmesini planlayın
3. Başlangıç süreci (genellikle 24-48 saat)

Bu ortaklığın {{company}} için önemli bir değer yaratacağına eminim. Sorularınız varsa lütfen bildirin.

Saygılarımla`,
    },
  },
};

export function getTemplate(templateId: string, lang: SupportedLang = "en"): EmailTemplate | null {
  const entry = templates[templateId];
  if (!entry) return null;
  return entry[lang] || entry.en;
}

export function listTemplates(lang: SupportedLang = "en"): EmailTemplate[] {
  return Object.values(templates).map(entry => entry[lang] || entry.en);
}

export function fillTemplate(template: EmailTemplate, params: { name?: string; company?: string; lang?: SupportedLang }): { subject: string; body: string } {
  const fallbackName = (params.lang === "tr") ? "değerli müşteri" : "there";
  const fallbackCompany = (params.lang === "tr") ? "şirketiniz" : "your company";
  const name = params.name || fallbackName;
  const company = params.company || fallbackCompany;
  return {
    subject: template.subject.replace(/\{\{name\}\}/g, name).replace(/\{\{company\}\}/g, company),
    body: template.body.replace(/\{\{name\}\}/g, name).replace(/\{\{company\}\}/g, company),
  };
}

export const DRIP_SEQUENCES: Record<string, Array<{ delayDays: number; templateId: string; stepName: string }>> = {
  standard: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Initial Outreach" },
    { delayDays: 3, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 7, templateId: "meeting_request", stepName: "Meeting Request" },
  ],
  aggressive: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Initial Outreach" },
    { delayDays: 2, templateId: "follow_up", stepName: "Quick Follow-up" },
    { delayDays: 3, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 5, templateId: "meeting_request", stepName: "Meeting Request" },
    { delayDays: 7, templateId: "proposal", stepName: "Proposal" },
  ],
  gentle: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Introduction" },
    { delayDays: 7, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 14, templateId: "meeting_request", stepName: "Meeting Request" },
  ],
};
