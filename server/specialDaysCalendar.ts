export interface SpecialDay {
  date: string;
  name: string;
  nameTR: string;
  type: "official" | "religious" | "commercial" | "international" | "sector";
  contentIdeas: string[];
}

const hijriHolidays: Record<number, { ramazanStart: string; ramazanEnd: string; kurbanStart: string; kurbanEnd: string }> = {
  2025: { ramazanStart: "03-01", ramazanEnd: "03-30", kurbanStart: "06-06", kurbanEnd: "06-09" },
  2026: { ramazanStart: "02-18", ramazanEnd: "03-19", kurbanStart: "05-27", kurbanEnd: "05-30" },
  2027: { ramazanStart: "02-08", ramazanEnd: "03-09", kurbanStart: "05-16", kurbanEnd: "05-19" },
  2028: { ramazanStart: "01-28", ramazanEnd: "02-26", kurbanStart: "05-04", kurbanEnd: "05-07" },
  2029: { ramazanStart: "01-16", ramazanEnd: "02-14", kurbanStart: "04-24", kurbanEnd: "04-27" },
  2030: { ramazanStart: "01-06", ramazanEnd: "02-04", kurbanStart: "04-13", kurbanEnd: "04-16" },
};

const fixedTurkishDays: Array<{ month: number; day: number; name: string; nameTR: string; type: SpecialDay["type"]; contentIdeas: string[] }> = [
  { month: 1, day: 1, name: "New Year's Day", nameTR: "Yılbaşı", type: "official", contentIdeas: ["Yeni yıl mesajı", "Yıl hedefleri paylaşımı", "Yeni yıl indirimi"] },
  { month: 1, day: 6, name: "World Coffee Day (TR)", nameTR: "Dünya Türk Kahvesi Günü", type: "international", contentIdeas: ["Kahve temalı içerik", "Türk kahvesi kültürü"] },
  { month: 2, day: 14, name: "Valentine's Day", nameTR: "Sevgililer Günü", type: "commercial", contentIdeas: ["Çift kampanyaları", "Sevgi temalı içerik", "Hediye önerileri", "Aşk hikayeleri"] },
  { month: 3, day: 8, name: "International Women's Day", nameTR: "Dünya Kadınlar Günü", type: "international", contentIdeas: ["Kadın güçlendirme", "Başarı hikayeleri", "Eşitlik mesajı"] },
  { month: 3, day: 14, name: "Pi Day", nameTR: "Pi Günü", type: "international", contentIdeas: ["Eğlenceli matematik içeriği", "Bilim temalı paylaşım"] },
  { month: 3, day: 18, name: "Çanakkale Victory Day", nameTR: "Çanakkale Zaferi", type: "official", contentIdeas: ["Anma paylaşımı", "Tarihi bilgi", "Şehitleri anma"] },
  { month: 3, day: 21, name: "Nevruz", nameTR: "Nevruz Bayramı", type: "official", contentIdeas: ["Bahar kutlaması", "Nevruz gelenekleri"] },
  { month: 3, day: 22, name: "World Water Day", nameTR: "Dünya Su Günü", type: "international", contentIdeas: ["Su tasarrufu", "Çevre farkındalığı"] },
  { month: 4, day: 1, name: "April Fools' Day", nameTR: "1 Nisan Şakaları", type: "commercial", contentIdeas: ["Eğlenceli paylaşım", "Şaka kampanyası", "Komik içerik"] },
  { month: 4, day: 7, name: "World Health Day", nameTR: "Dünya Sağlık Günü", type: "international", contentIdeas: ["Sağlık bilinci", "Sağlıklı yaşam önerileri"] },
  { month: 4, day: 22, name: "Earth Day", nameTR: "Dünya Günü", type: "international", contentIdeas: ["Sürdürülebilirlik", "Çevre koruma", "Yeşil kampanya"] },
  { month: 4, day: 23, name: "National Sovereignty & Children's Day", nameTR: "Ulusal Egemenlik ve Çocuk Bayramı", type: "official", contentIdeas: ["Çocuk bayramı kutlama", "23 Nisan etkinlikleri", "Atatürk anısı"] },
  { month: 5, day: 1, name: "Labour Day", nameTR: "Emek ve Dayanışma Günü", type: "official", contentIdeas: ["İşçi hakları", "Emek mesajı", "Dayanışma"] },
  { month: 5, day: 4, name: "Star Wars Day", nameTR: "Star Wars Günü", type: "commercial", contentIdeas: ["Pop kültür içeriği", "May the 4th teması"] },
  { month: 5, day: 11, name: "Mother's Day", nameTR: "Anneler Günü", type: "commercial", contentIdeas: ["Anne hediye kampanyası", "Duygusal içerik", "Anneye mesaj", "Anneler Günü indirimi"] },
  { month: 5, day: 19, name: "Youth & Sports Day", nameTR: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", type: "official", contentIdeas: ["Gençlik mesajı", "Spor temalı içerik", "19 Mayıs kutlama"] },
  { month: 6, day: 5, name: "World Environment Day", nameTR: "Dünya Çevre Günü", type: "international", contentIdeas: ["Çevre bilinci", "Sürdürülebilirlik", "Doğa koruma"] },
  { month: 6, day: 15, name: "Father's Day", nameTR: "Babalar Günü", type: "commercial", contentIdeas: ["Baba hediye kampanyası", "Duygusal içerik", "Babalar Günü indirimi"] },
  { month: 6, day: 21, name: "World Music Day", nameTR: "Dünya Müzik Günü", type: "international", contentIdeas: ["Müzik temalı içerik", "Playlist paylaşımı"] },
  { month: 6, day: 30, name: "World Social Media Day", nameTR: "Dünya Sosyal Medya Günü", type: "international", contentIdeas: ["Sosyal medya istatistikleri", "Dijital pazarlama önerileri"] },
  { month: 7, day: 1, name: "Cabotage Day", nameTR: "Kabotaj Bayramı / Denizcilik Günü", type: "official", contentIdeas: ["Denizcilik mesajı", "Türk denizciliği"] },
  { month: 7, day: 15, name: "Democracy and National Unity Day", nameTR: "Demokrasi ve Milli Birlik Günü", type: "official", contentIdeas: ["Demokrasi mesajı", "Milli birlik", "15 Temmuz anma"] },
  { month: 8, day: 26, name: "Women's Equality Day", nameTR: "Kadın Eşitliği Günü", type: "international", contentIdeas: ["Eşitlik mesajı", "Kadın hakları"] },
  { month: 8, day: 30, name: "Victory Day", nameTR: "Zafer Bayramı", type: "official", contentIdeas: ["Zafer kutlama", "30 Ağustos mesajı", "Atatürk anısı"] },
  { month: 9, day: 1, name: "Back to School Season", nameTR: "Okul Başlangıcı Sezonu", type: "commercial", contentIdeas: ["Okula dönüş kampanyası", "Kırtasiye indirimi", "Eğitim içeriği"] },
  { month: 9, day: 21, name: "International Peace Day", nameTR: "Dünya Barış Günü", type: "international", contentIdeas: ["Barış mesajı", "Birlik ve beraberlik"] },
  { month: 10, day: 1, name: "World Elderly Day", nameTR: "Dünya Yaşlılar Günü", type: "international", contentIdeas: ["Yaşlılara saygı", "Nesiller arası bağ"] },
  { month: 10, day: 29, name: "Republic Day", nameTR: "Cumhuriyet Bayramı", type: "official", contentIdeas: ["Cumhuriyet kutlama", "29 Ekim mesajı", "Atatürk paylaşımı", "Bayrak temalı içerik"] },
  { month: 10, day: 31, name: "Halloween", nameTR: "Cadılar Bayramı", type: "commercial", contentIdeas: ["Eğlenceli kostüm içeriği", "Korku temalı kampanya"] },
  { month: 11, day: 10, name: "Atatürk Remembrance Day", nameTR: "Atatürk'ü Anma Günü", type: "official", contentIdeas: ["09:05 saygı duruşu", "Atatürk anısı", "Siyah beyaz paylaşım"] },
  { month: 11, day: 24, name: "Teachers' Day", nameTR: "Öğretmenler Günü", type: "official", contentIdeas: ["Öğretmenlere teşekkür", "Eğitim içeriği", "Öğretmen hikayeleri"] },
  { month: 11, day: 25, name: "Black Friday (approx)", nameTR: "Black Friday / Efsane Cuma", type: "commercial", contentIdeas: ["Dev indirim kampanyası", "Sınırlı süre fırsatları", "Geri sayım paylaşımları"] },
  { month: 11, day: 28, name: "Cyber Monday (approx)", nameTR: "Cyber Monday / Siber Pazartesi", type: "commercial", contentIdeas: ["Online indirimler", "Dijital kampanya"] },
  { month: 12, day: 10, name: "Human Rights Day", nameTR: "İnsan Hakları Günü", type: "international", contentIdeas: ["İnsan hakları farkındalığı", "Eşitlik mesajı"] },
  { month: 12, day: 25, name: "Christmas", nameTR: "Noel", type: "commercial", contentIdeas: ["Kış temalı içerik", "Yılsonu kampanyası"] },
  { month: 12, day: 31, name: "New Year's Eve", nameTR: "Yılbaşı Gecesi", type: "commercial", contentIdeas: ["Yılbaşı geri sayımı", "Yıl özeti", "Teşekkür mesajı"] },
];

function getReligiousHolidays(year: number): SpecialDay[] {
  const h = hijriHolidays[year];
  if (!h) return [];
  const days: SpecialDay[] = [];

  const [rsm, rsd] = h.ramazanStart.split("-").map(Number);
  days.push({
    date: `${year}-${h.ramazanStart}`,
    name: "Ramadan Begins",
    nameTR: "Ramazan Başlangıcı",
    type: "religious",
    contentIdeas: ["Ramazan mesajı", "İftar davetiyesi", "Ramazan kampanyası"],
  });

  const [rem, red] = h.ramazanEnd.split("-").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = new Date(year, rem - 1, red + i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push({
      date: `${year}-${mm}-${dd}`,
      name: `Eid al-Fitr (Day ${i + 1})`,
      nameTR: `Ramazan Bayramı (${i + 1}. Gün)`,
      type: "religious",
      contentIdeas: i === 0
        ? ["Bayram kutlama mesajı", "Bayram indirimi", "Bayram tebrik görseli"]
        : ["Bayram sürer", "Aile temalı içerik"],
    });
  }

  const [ksm, ksd] = h.kurbanStart.split("-").map(Number);
  for (let i = 0; i < 4; i++) {
    const d = new Date(year, ksm - 1, ksd + i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push({
      date: `${year}-${mm}-${dd}`,
      name: `Eid al-Adha (Day ${i + 1})`,
      nameTR: `Kurban Bayramı (${i + 1}. Gün)`,
      type: "religious",
      contentIdeas: i === 0
        ? ["Kurban Bayramı kutlama", "Bayram tebriği", "Bayram kampanyası"]
        : ["Bayram devam", "Paylaşım ve dayanışma"],
    });
  }

  return days;
}

const fixedUSDays: Array<{ month: number; day: number; name: string; nameTR: string; type: SpecialDay["type"]; contentIdeas: string[] }> = [
  { month: 1, day: 1, name: "New Year's Day", nameTR: "Yılbaşı", type: "official", contentIdeas: ["New Year message", "Year goals post", "New Year sale"] },
  { month: 1, day: 20, name: "Martin Luther King Jr. Day", nameTR: "MLK Günü", type: "official", contentIdeas: ["Equality message", "Community service", "Inspirational quotes"] },
  { month: 2, day: 2, name: "Groundhog Day", nameTR: "Groundhog Günü", type: "commercial", contentIdeas: ["Fun seasonal content", "Weather predictions"] },
  { month: 2, day: 14, name: "Valentine's Day", nameTR: "Sevgililer Günü", type: "commercial", contentIdeas: ["Couple campaigns", "Love-themed content", "Gift guides"] },
  { month: 2, day: 17, name: "Presidents' Day", nameTR: "Başkanlar Günü", type: "official", contentIdeas: ["Patriotic content", "Presidents' Day sale"] },
  { month: 3, day: 8, name: "International Women's Day", nameTR: "Dünya Kadınlar Günü", type: "international", contentIdeas: ["Women empowerment", "Success stories"] },
  { month: 3, day: 17, name: "St. Patrick's Day", nameTR: "Aziz Patrick Günü", type: "commercial", contentIdeas: ["Green-themed content", "Lucky promotions"] },
  { month: 4, day: 1, name: "April Fools' Day", nameTR: "1 Nisan Şakaları", type: "commercial", contentIdeas: ["Funny post", "Prank campaign"] },
  { month: 4, day: 22, name: "Earth Day", nameTR: "Dünya Günü", type: "international", contentIdeas: ["Sustainability", "Green campaign"] },
  { month: 5, day: 5, name: "Cinco de Mayo", nameTR: "Cinco de Mayo", type: "commercial", contentIdeas: ["Cultural celebration", "Food & drink specials"] },
  { month: 5, day: 11, name: "Mother's Day", nameTR: "Anneler Günü", type: "commercial", contentIdeas: ["Mother's Day campaign", "Gift guides", "Emotional content"] },
  { month: 5, day: 26, name: "Memorial Day", nameTR: "Anma Günü", type: "official", contentIdeas: ["Remembrance post", "Memorial Day sale", "Thank you veterans"] },
  { month: 6, day: 15, name: "Father's Day", nameTR: "Babalar Günü", type: "commercial", contentIdeas: ["Father's Day campaign", "Gift guides"] },
  { month: 6, day: 19, name: "Juneteenth", nameTR: "Juneteenth", type: "official", contentIdeas: ["Freedom celebration", "History & culture"] },
  { month: 7, day: 4, name: "Independence Day", nameTR: "Bağımsızlık Günü", type: "official", contentIdeas: ["4th of July celebration", "Patriotic content", "Summer sale"] },
  { month: 9, day: 1, name: "Labor Day", nameTR: "İşçi Bayramı", type: "official", contentIdeas: ["Labor Day sale", "Back to work motivation"] },
  { month: 10, day: 14, name: "Columbus Day / Indigenous Peoples' Day", nameTR: "Kolomb / Yerli Halklar Günü", type: "official", contentIdeas: ["Cultural awareness", "History content"] },
  { month: 10, day: 31, name: "Halloween", nameTR: "Cadılar Bayramı", type: "commercial", contentIdeas: ["Halloween costume content", "Spooky campaign", "Trick or treat deals"] },
  { month: 11, day: 11, name: "Veterans Day", nameTR: "Gaziler Günü", type: "official", contentIdeas: ["Thank you veterans", "Patriotic content"] },
  { month: 11, day: 27, name: "Thanksgiving", nameTR: "Şükran Günü", type: "official", contentIdeas: ["Gratitude post", "Thanksgiving feast content", "Family values"] },
  { month: 11, day: 28, name: "Black Friday", nameTR: "Black Friday", type: "commercial", contentIdeas: ["Massive sale campaign", "Limited time deals", "Countdown posts"] },
  { month: 12, day: 1, name: "Cyber Monday", nameTR: "Siber Pazartesi", type: "commercial", contentIdeas: ["Online deals", "Digital campaign"] },
  { month: 12, day: 25, name: "Christmas", nameTR: "Noel", type: "official", contentIdeas: ["Christmas campaign", "Holiday deals", "Gift guides", "Festive content"] },
  { month: 12, day: 31, name: "New Year's Eve", nameTR: "Yılbaşı Gecesi", type: "commercial", contentIdeas: ["Year in review", "New Year countdown", "Thank you message"] },
];

export function getSpecialDays(month: number, year: number, country: string = "TR"): SpecialDay[] {
  const days: SpecialDay[] = [];
  const fixedDays = country === "US" ? fixedUSDays : fixedTurkishDays;

  for (const fd of fixedDays) {
    if (fd.month === month) {
      days.push({
        date: `${year}-${String(month).padStart(2, "0")}-${String(fd.day).padStart(2, "0")}`,
        name: fd.name,
        nameTR: fd.nameTR,
        type: fd.type,
        contentIdeas: fd.contentIdeas,
      });
    }
  }

  if (country === "TR") {
    const religious = getReligiousHolidays(year);
    for (const rd of religious) {
      const [, m] = rd.date.split("-").map(Number);
      if (m === month) {
        days.push(rd);
      }
    }
  }

  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

export function getSpecialDaysRange(startMonth: number, endMonth: number, year: number, country: string = "TR"): SpecialDay[] {
  const all: SpecialDay[] = [];
  for (let m = startMonth; m <= endMonth; m++) {
    all.push(...getSpecialDays(m, year, country));
  }
  return all;
}

export function formatSpecialDaysForAgent(days: SpecialDay[]): string {
  if (days.length === 0) return "Bu dönemde kayıtlı özel gün bulunamadı.";

  const typeLabels: Record<string, string> = {
    official: "🇹🇷 Resmi",
    religious: "🌙 Dini",
    commercial: "🛍️ Ticari",
    international: "🌍 Uluslararası",
    sector: "💼 Sektörel",
  };

  return days.map(d => {
    const dateStr = d.date.split("-").reverse().join(".");
    const label = typeLabels[d.type] || d.type;
    const ideas = d.contentIdeas.slice(0, 3).join(", ");
    return `- **${dateStr}** — ${d.nameTR} (${d.name}) [${label}]\n  İçerik fikirleri: ${ideas}`;
  }).join("\n");
}

export const bestPostingTimes: Record<string, Record<string, { weekday: string[]; weekend: string[]; notes: string }>> = {
  TR: {
    instagram: {
      weekday: ["08:00-09:00", "12:00-13:00", "19:00-21:00"],
      weekend: ["10:00-12:00", "19:00-22:00"],
      notes: "Türkiye'de Instagram kullanımı akşam 19-21 arası zirve yapar. Öğle arası (12-13) da yüksek etkileşim alır.",
    },
    twitter: {
      weekday: ["08:00-10:00", "12:00-13:00", "17:00-18:00"],
      weekend: ["10:00-12:00", "20:00-22:00"],
      notes: "Twitter'da gündem takibi sabah erken başlar. İş çıkışı (17-18) ve öğle arası ideal.",
    },
    linkedin: {
      weekday: ["08:00-10:00", "12:00-13:00", "17:00-18:00"],
      weekend: ["10:00-12:00"],
      notes: "LinkedIn profesyonel bir platform, hafta içi mesai saatleri başlangıcı ve bitişi en etkili. Hafta sonu etkileşim düşer.",
    },
    facebook: {
      weekday: ["09:00-11:00", "13:00-15:00", "19:00-21:00"],
      weekend: ["10:00-13:00", "19:00-22:00"],
      notes: "Facebook'ta etkileşim öğleden sonra ve akşam saatlerinde artar.",
    },
    tiktok: {
      weekday: ["12:00-13:00", "19:00-22:00"],
      weekend: ["11:00-14:00", "19:00-23:00"],
      notes: "TikTok genç kitle ağırlıklı, akşam ve gece saatleri en yüksek etkileşim.",
    },
    youtube: {
      weekday: ["12:00-14:00", "17:00-20:00"],
      weekend: ["10:00-14:00", "18:00-22:00"],
      notes: "YouTube'da video yükleme öğle arası veya akşam saatleri önerilir. Hafta sonu izlenme oranları yüksektir.",
    },
  },
  US: {
    instagram: {
      weekday: ["06:00-09:00", "12:00-14:00", "17:00-19:00"],
      weekend: ["09:00-11:00", "17:00-20:00"],
      notes: "US Instagram peaks early morning and lunch. Evening commute hours also perform well.",
    },
    twitter: {
      weekday: ["08:00-10:00", "12:00-13:00", "17:00-18:00"],
      weekend: ["09:00-12:00"],
      notes: "Twitter engagement highest during morning commute and lunch breaks.",
    },
    linkedin: {
      weekday: ["07:00-08:00", "12:00-13:00", "17:00-18:00"],
      weekend: [],
      notes: "LinkedIn is a weekday platform. Best before/after work and during lunch.",
    },
    facebook: {
      weekday: ["09:00-11:00", "13:00-15:00"],
      weekend: ["10:00-13:00"],
      notes: "Facebook engagement peaks mid-morning on weekdays.",
    },
    tiktok: {
      weekday: ["10:00-12:00", "19:00-23:00"],
      weekend: ["10:00-14:00", "19:00-24:00"],
      notes: "TikTok audience is most active late evening and weekends.",
    },
    youtube: {
      weekday: ["12:00-15:00", "17:00-21:00"],
      weekend: ["09:00-12:00", "17:00-22:00"],
      notes: "YouTube videos published Thursday-Saturday tend to perform best.",
    },
  },
};
