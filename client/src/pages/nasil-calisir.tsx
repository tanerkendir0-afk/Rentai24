import { motion } from "framer-motion";
import {
  Phone,
  UserCheck,
  Settings,
  Plug,
  Rocket,
  TrendingUp,
} from "lucide-react";
import SectionCTA from "@/components/section-cta";

const steps = [
  {
    icon: Phone,
    title: "Ücretsiz Danışma",
    desc: "İşletmenizin ihtiyaçlarını birlikte analiz ediyoruz. Hangi süreçleri otomatize edebileceğinizi keşfediyoruz.",
    detail: "15 dakikalık ücretsiz danışma görüşmemizde işletmenizin mevcut süreçlerini, karşılaştığınız zorlukları ve hedeflerinizi detaylı olarak inceliyoruz.",
  },
  {
    icon: UserCheck,
    title: "AI Çalışan Eşleştirme",
    desc: "İşletmenize en uygun AI çalışanı belirliyoruz. Sektörünüze özel eğitilmiş ajanlarımızdan en doğru eşleşmeyi yapıyoruz.",
    detail: "Kapsamlı ajan havuzumuzdan sektörünüze, iş süreçlerinize ve müşteri profilinize en uygun AI çalışanı seçiyoruz.",
  },
  {
    icon: Settings,
    title: "Özelleştirme & Eğitim",
    desc: "Seçilen AI çalışanı şirketinize özel eğitiyoruz. Markanızın dili, tonlaması ve süreçlerinize uyum sağlıyor.",
    detail: "AI çalışanınız şirketinizin ürün/hizmet bilgilerini, SSS cevaplarını ve iş süreçlerinizi öğrenir. Firma kültürünüze uygun yanıtlar verecek şekilde ince ayar yapılır.",
  },
  {
    icon: Plug,
    title: "Entegrasyon",
    desc: "AI çalışanınızı mevcut sistemlerinize bağlıyoruz. WhatsApp, CRM, web sitesi ve daha fazlası.",
    detail: "Teknik entegrasyon sürecinin tamamı bizim tarafımızdan yönetilir. Mevcut iş akışlarınıza sorunsuz bir şekilde dahil olur.",
  },
  {
    icon: Rocket,
    title: "Canlıya Alma",
    desc: "Test sürecinin ardından AI çalışanınızı devreye alıyoruz. İlk günden itibaren kesintisiz hizmet.",
    detail: "Kapsamlı test senaryoları ile AI çalışanınızın performansını doğruluyoruz. Her şey hazır olduğunda canlıya alıyoruz.",
  },
  {
    icon: TrendingUp,
    title: "Sürekli İyileştirme",
    desc: "AI çalışanınızın performansını sürekli takip ediyor ve optimize ediyoruz. Zaman geçtikçe daha da iyi hale gelir.",
    detail: "Haftalık performans raporları, müşteri memnuniyet analizleri ve sürekli öğrenme algoritmaları ile AI çalışanınız her geçen gün daha etkili olur.",
  },
];

export default function NasilCalisir() {
  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-nasil-title">
              Nasıl{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Çalışır?
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI çalışanınızı işe alma süreci adım adım
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500 hidden sm:block" />

            <div className="space-y-12 sm:space-y-16">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  className={`relative flex flex-col sm:flex-row items-start gap-6 sm:gap-12 ${
                    i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  data-testid={`step-${i + 1}`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? "sm:text-right" : "sm:text-left"}`}>
                    <div className={`inline-flex items-center gap-2 mb-3 ${i % 2 === 0 ? "sm:flex-row-reverse" : ""}`}>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                        Adım {i + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                    <p className="text-sm text-muted-foreground/70 leading-relaxed">{step.detail}</p>
                  </div>

                  <div className="relative z-10 shrink-0 hidden sm:flex">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ring-4 ring-background">
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 hidden sm:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
