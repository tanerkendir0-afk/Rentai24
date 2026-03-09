# AI İK Ajansı - Web Sitesi

## Proje Hakkında
Türkiye'nin ilk AI İK Ajansı web sitesi. İşletmelere eğitimi tamamlanmış hazır AI ajanları (çalışanlar) kiralama hizmeti sunan bir şirketin tanıtım sitesi.

## Teknoloji Stack
- **Frontend:** React + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Express.js
- **Routing:** wouter (client-side)
- **UI Components:** Shadcn/ui
- **State Management:** TanStack React Query
- **Form Handling:** react-hook-form + zod validation
- **Icons:** lucide-react + react-icons

## Sayfa Yapısı
- `/` - Ana Sayfa (Landing Page): Hero, nasıl çalışır, AI çalışan önizleme, istatistikler, sektörler, yorumlar, SSS
- `/calisanlar` - AI Çalışanlar katalogu (filtreleme destekli)
- `/nasil-calisir` - Süreç açıklaması (timeline formatında)
- `/fiyatlandirma` - 3 paket halinde fiyatlandırma
- `/demo` - Canlı chat demo sayfası (mock API)
- `/hakkimizda` - Şirket hikayesi ve karşılaştırma tablosu
- `/iletisim` - İletişim formu ve bilgileri

## API Endpoints
- `POST /api/chat` - Demo chat endpoint (mock yanıtlar, AI entegrasyonu için hazır)
- `POST /api/contact` - İletişim formu gönderimi

## Önemli Dosyalar
- `client/src/data/agents.ts` - Tüm AI çalışan verileri, sektörler, yorumlar, SSS
- `shared/schema.ts` - Zod validasyon şemaları (chat, contact)
- `server/routes.ts` - API endpoint'leri (TODO: AI model entegrasyonu)

## Tasarım
- Koyu tema (dark mode) - her zaman aktif
- Renk paleti: Koyu lacivert arka plan, mavi (#3B82F6) ve mor (#8B5CF6) aksanlar
- Font: Inter
- Responsive tasarım, mobil uyumlu
- Framer Motion ile scroll-triggered animasyonlar

## AI Model Entegrasyonu
`/api/chat` endpoint'inde `// TODO: AI MODEL ENTEGRASYONU` yorumu var. Gerçek AI API bağlantısı için bu bölüm güncellenmeli.
