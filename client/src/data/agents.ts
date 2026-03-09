export interface Agent {
  id: string;
  name: string;
  position: string;
  description: string;
  skills: string[];
  integrations: string[];
  languages?: string[];
  price: string;
  priceValue: number;
  sectors: string[];
}

export const agents: Agent[] = [
  {
    id: "musteri-hizmetleri",
    name: "Müşteri Hizmetleri Asistanı",
    position: "Müşteri Temsilcisi",
    description: "Müşterilerinizle 7/24 profesyonel iletişim kuran, şikayetleri çözen ve sipariş takibi yapan AI çalışanınız.",
    skills: ["Canlı Chat", "E-posta Yanıtlama", "Şikayet Yönetimi", "Sipariş Takibi"],
    integrations: ["WhatsApp", "Instagram DM", "Web Chat", "E-posta"],
    languages: ["Türkçe", "İngilizce", "Arapça"],
    price: "₺4.999",
    priceValue: 4999,
    sectors: ["E-Ticaret", "Restoran & Kafe", "Turizm & Otel"],
  },
  {
    id: "satis-pazarlama",
    name: "Satış ve Pazarlama Uzmanı",
    position: "Dijital Satış Temsilcisi",
    description: "Lead toplama, takip e-postaları gönderme, teklif hazırlama ve CRM güncelleme işlemlerini otomatize eden AI çalışanınız.",
    skills: ["Lead Toplama", "Takip E-postaları", "Teklif Hazırlama", "CRM Güncelleme"],
    integrations: ["HubSpot", "Salesforce", "LinkedIn", "E-posta"],
    price: "₺6.999",
    priceValue: 6999,
    sectors: ["E-Ticaret", "Gayrimenkul", "Hukuk"],
  },
  {
    id: "sosyal-medya",
    name: "Sosyal Medya Yöneticisi",
    position: "Content & Social Media Manager",
    description: "Sosyal medya hesaplarınızı profesyonelce yöneten, içerik planlayan ve analiz raporları sunan AI çalışanınız.",
    skills: ["İçerik Planlama", "Post Yazma", "Yorum Yönetimi", "Analiz Raporu"],
    integrations: ["Instagram", "Twitter/X", "Facebook", "LinkedIn", "TikTok"],
    price: "₺5.499",
    priceValue: 5499,
    sectors: ["E-Ticaret", "Restoran & Kafe", "Turizm & Otel", "Eğitim"],
  },
  {
    id: "muhasebe",
    name: "Muhasebe Asistanı",
    position: "Finansal Asistan",
    description: "Faturalarınızı işleyen, giderlerinizi takip eden ve finansal raporlarınızı hazırlayan AI çalışanınız.",
    skills: ["Fatura İşleme", "Gider Takibi", "Raporlama", "Vergi Hatırlatmaları"],
    integrations: ["Paraşüt", "Logo", "Excel", "e-Fatura"],
    price: "₺5.999",
    priceValue: 5999,
    sectors: ["Muhasebe & Finans", "E-Ticaret", "Hukuk"],
  },
  {
    id: "randevu-rezervasyon",
    name: "Randevu ve Rezervasyon Asistanı",
    position: "Planlama Asistanı",
    description: "Online randevu alan, hatırlatma gönderen ve takvim yönetimini üstlenen AI çalışanınız.",
    skills: ["Online Randevu Alma", "Hatırlatma Gönderme", "Takvim Yönetimi", "İptal/Değişiklik"],
    integrations: ["Google Calendar", "WhatsApp", "SMS", "Web"],
    price: "₺3.999",
    priceValue: 3999,
    sectors: ["Sağlık", "Restoran & Kafe", "Turizm & Otel", "Eğitim"],
  },
  {
    id: "insan-kaynaklari",
    name: "İnsan Kaynakları Asistanı",
    position: "İK Koordinatörü",
    description: "CV tarayan, aday ön eleme yapan, mülakat planlayan ve onboarding süreçlerini yöneten AI çalışanınız.",
    skills: ["CV Tarama", "Aday Ön Eleme", "Mülakat Planlama", "Onboarding"],
    integrations: ["LinkedIn", "Kariyer.net", "E-posta", "ATS"],
    price: "₺6.499",
    priceValue: 6499,
    sectors: ["E-Ticaret", "Muhasebe & Finans", "Hukuk", "Eğitim"],
  },
];

export const sectors = [
  { name: "E-Ticaret", icon: "ShoppingCart" },
  { name: "Restoran & Kafe", icon: "UtensilsCrossed" },
  { name: "Sağlık", icon: "Heart" },
  { name: "Hukuk", icon: "Scale" },
  { name: "Muhasebe & Finans", icon: "Calculator" },
  { name: "Gayrimenkul", icon: "Building2" },
  { name: "Eğitim", icon: "GraduationCap" },
  { name: "Turizm & Otel", icon: "Plane" },
];

export const testimonials = [
  {
    name: "Ahmet Yılmaz",
    company: "TechMart E-Ticaret",
    role: "Genel Müdür",
    text: "AI müşteri hizmetleri asistanımız sayesinde müşteri memnuniyetimiz %35 arttı. 7/24 kesintisiz hizmet veriyoruz artık.",
    rating: 5,
  },
  {
    name: "Elif Kaya",
    company: "Kaya Hukuk Bürosu",
    role: "Kurucu Ortak",
    text: "İK asistanımız CV tarama sürecimizi günlerden dakikalara indirdi. Artık en iyi adayları çok daha hızlı buluyoruz.",
    rating: 5,
  },
  {
    name: "Mehmet Demir",
    company: "Lezzet Durağı Restoran",
    role: "İşletme Sahibi",
    text: "Randevu asistanımız rezervasyon yönetimimizi tamamen otomatize etti. Müşterilerimiz WhatsApp'tan kolayca rezervasyon yapabiliyor.",
    rating: 5,
  },
  {
    name: "Zeynep Arslan",
    company: "Arslan Gayrimenkul",
    role: "Satış Direktörü",
    text: "Satış AI'ımız lead toplama ve takip süreçlerimizi devrim niteliğinde değiştirdi. Satışlarımız %50 arttı.",
    rating: 5,
  },
];

export const faqItems = [
  {
    question: "AI çalışan nedir?",
    answer: "AI çalışan, belirli iş süreçlerini otomatize etmek için eğitilmiş yapay zeka ajanıdır. Tıpkı bir insan çalışan gibi görevlerini yerine getirir, ancak 7/24 kesintisiz çalışır ve asla yorulmaz.",
  },
  {
    question: "Verilerim güvende mi?",
    answer: "Evet, tüm verileriniz uçtan uca şifreleme ile korunmaktadır. KVKK ve GDPR uyumlu altyapımız, verilerinizin güvenliğini en üst düzeyde sağlar. Verileriniz yalnızca sizin belirlediğiniz amaçlar doğrultusunda kullanılır.",
  },
  {
    question: "Mevcut sistemlerimle entegre olur mu?",
    answer: "Evet, AI çalışanlarımız WhatsApp, Instagram, CRM sistemleri, muhasebe yazılımları ve daha birçok platform ile kolayca entegre olabilir. Entegrasyon süreci tamamen bizim tarafımızdan yönetilir.",
  },
  {
    question: "İnsan çalışanlarımın yerini mi alacak?",
    answer: "Hayır, AI çalışanlar insan çalışanlarınızın yerini almak için değil, onları desteklemek için tasarlanmıştır. Tekrarlayan ve zaman alan görevleri AI'a devredip, ekibinizin daha stratejik işlere odaklanmasını sağlarsınız.",
  },
  {
    question: "Fiyatlandırma nasıl?",
    answer: "Aylık abonelik modeliyle çalışıyoruz. Başlangıç paketi ₺4.999/ay'dan başlamaktadır. İhtiyaçlarınıza göre özelleştirilebilir paketlerimiz mevcuttur. Detaylı bilgi için fiyatlandırma sayfamızı inceleyebilirsiniz.",
  },
];
