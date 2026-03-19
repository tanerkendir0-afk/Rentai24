# RentAI 24 — Admin Paneli & Boss AI Kullanma Kılavuzu

---

## 1. Admin Paneline Giriş

**URL:** `/admin`

1. Tarayıcınızda `/admin` sayfasına gidin
2. Admin şifresini girin (sunucu tarafında `ADMIN_PASSWORD` olarak ayarlanmış)
3. **"Access Admin Panel"** butonuna tıklayın
4. Giriş başarılıysa admin paneli yüklenir

> **Not:** Admin oturumu sunucu bellekte tutulur. Sunucu yeniden başlarsa tekrar giriş yapmanız gerekir.

---

## 2. Boss AI — Platform Komutanı

Boss AI, admin panelinin ilk sekmesidir ve platformun tüm yönetim AI asistanıdır.

### 2.1 Boss AI Nedir?

Boss, diğer 9 AI ajanın (Ava, Rex, Maya, Finn, Cal, Harper, DataBot, ShopBot, Reno) "patronu" olan özel bir AI asistanıdır. Platform hakkında her şeyi bilir:

- Dosya yapısı ve kod mimarisi
- Veritabanı tabloları ve şemaları
- Tüm 9 ajanın yetenekleri, araçları ve kuralları
- Tech stack (React, Express, PostgreSQL, OpenAI, Stripe...)
- API endpoint'leri
- Abonelik planları ve fiyatlandırma

### 2.2 Boss AI Nasıl Kullanılır?

1. Admin panelinde **"Boss AI"** sekmesine tıklayın (taç ikonu)
2. Alt kısımdaki metin kutusuna sorunuzu yazın
3. **Enter** tuşuna basın veya gönder butonuna tıklayın
4. Boss, sorunuzu analiz eder ve gerektiğinde veritabanından canlı veri çeker

### 2.3 Boss AI'a Sorulabilecek Örnek Sorular

| Kategori | Örnek Sorular |
|----------|---------------|
| **Platform İstatistikleri** | "Kaç kullanıcımız var?", "Aktif kiralama sayısı nedir?", "Bu haftaki yeni kullanıcılar?" |
| **Maliyet Analizi** | "Toplam API maliyetimiz ne kadar?", "Model bazında maliyet dağılımı göster", "Günlük maliyet trendi?" |
| **Ajan Performansı** | "Hangi ajan en çok kullanılıyor?", "Rex'in performans metrikleri nedir?", "Ajan bazlı mesaj kullanımı?" |
| **Son Aktiviteler** | "Son kayıt olan kullanıcılar kimler?", "Son yapılan ajan işlemleri neler?" |
| **Geliştirme Rehberliği** | "Yeni bir özellik eklemek istiyorum, nereden başlamalıyım?", "Veritabanı şemasını açıkla", "Routes.ts nasıl yapılandırılmış?" |
| **Mimari Sorular** | "RAG sistemi nasıl çalışıyor?", "Fine-tuning süreci nasıl?", "Tool calling mekanizması ne?" |

### 2.4 Boss AI'ın Araçları

Boss, gerçek veritabanı sorgularıyla canlı veri çekebilir. Araçlarını kullandığında mesajda **"live data"** rozeti görünür.

| Araç | Ne Yapar |
|------|----------|
| `query_platform_stats` | Kullanıcı sayıları, kiralama dağılımları, toplam gelir ve maliyet |
| `query_agent_performance` | Belirli bir ajanın veya tüm ajanların performans metrikleri |
| `query_recent_activity` | Son kayıt olan kullanıcılar, son yapılan ajan işlemleri |
| `query_cost_breakdown` | Model/ajan/günlük bazda token kullanımı ve maliyet dağılımı |

### 2.5 Hızlı Başlangıç Önerileri

İlk açılışta 4 hazır öneri butonu göreceksiniz:
- "How many active users do we have?"
- "Which agent is most popular?"
- "What's our total API cost?"
- "Show me recent platform activity"

Bunlara tıklayarak hızlıca input alanını doldurabilirsiniz.

### 2.6 Önemli Notlar

- Boss, hangi dilde yazarsanız o dilde cevap verir (Türkçe/İngilizce)
- Sohbet geçmişi sekme açık olduğu sürece korunur, sayfa yenilenirse sıfırlanır
- Boss asla kod yazmaz veya dosya düzenlemez — sadece rehberlik ve analiz yapar
- Her mesajda güncel platform verileri otomatik olarak Boss'a iletilir

---

## 3. Overview (Genel Bakış) Sekmesi

Platform genelindeki temel metrikleri gösterir:

- **Total Users:** Kayıtlı toplam kullanıcı sayısı
- **Active Rentals:** Şu an aktif olan ajan kiralamalarının sayısı
- **Total API Cost:** OpenAI API'ye harcanan toplam tutar (USD)
- **Total Requests:** Yapılan toplam API istek sayısı
- **Contact Messages:** İletişim formundan gelen mesaj sayısı

---

## 4. Users (Kullanıcılar) Sekmesi

Tüm kayıtlı kullanıcıları listeler:

- **Arama:** Üst kısımdaki arama kutusuyla isim, email veya şirket adına göre filtreleyin
- Her kullanıcı için görüntülenen bilgiler:
  - Ad, email, şirket
  - Stripe müşteri ID'si ve abonelik durumu
  - Image credits (görüntü üretim kredisi)
  - Aktif ajan kiralamaları (hangi ajan, hangi plan, mesaj kullanımı)

---

## 5. Knowledge Base (Bilgi Tabanı) Sekmesi

RAG (Retrieval-Augmented Generation) sistemi için doküman yönetimi.

### Nasıl Kullanılır:

1. **Ajan Seçin:** Üst kısımdaki dropdown'dan hangi ajana bilgi ekleyeceğinizi seçin
2. **Dosya Yükleme:** PDF, TXT, DOCX dosyası yükleyin — sistem otomatik olarak parçalar, embedding oluşturur ve vektör DB'ye kaydeder
3. **URL Ekleme:** Bir web sayfası URL'si girin — sistem sayfayı tarar ve içeriği indeksler
4. **Silme:** Artık gerekmeyen dokümanları silebilirsiniz

> Yüklenen dokümanlar, ilgili ajanın konuşmalarında otomatik olarak referans alınır (RAG).

---

## 6. Training Data (Eğitim Verisi) Sekmesi

AI ajanlarınızı fine-tune etmek için eğitim verisi oluşturma ve indirme.

### 6.1 Ajan Kuralları Dokümanı

- **"Download Agent Rules"** butonuna tıklayarak tüm 9 ajanın kurallarını, araçlarını ve davranış rehberlerini içeren kapsamlı bir doküman indirin
- Format: TXT veya PDF

### 6.2 Eğitim Verisi Dışa Aktarma

1. **Ajan Seçin:** Dropdown'dan fine-tune etmek istediğiniz ajanı seçin
2. **Filtreler:**
   - "Tool usage conversations only" — Sadece araç kullanan konuşmaları dahil et
3. **Preview & Validate:** Veriyi önizleyin ve doğrulayın
4. **Download JSONL:** OpenAI fine-tuning uyumlu JSONL dosyasını indirin

> **Format:** Her satır `{"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}` şeklindedir.

### 6.3 İstatistikler

- Toplam konuşma sayısı
- Araç kullanan konuşma sayısı
- Ortalama mesaj sayısı
- Durum göstergesi (Ready / Need more / No data)

---

## 7. Fine-Tuning (İnce Ayar) Sekmesi

OpenAI fine-tuning iş akışı yönetimi.

### 7.1 Yeni Fine-Tuning İşi Başlatma

1. **Ajan Seçin:** Dropdown'dan ajanı seçin
2. **JSONL Yükleyin:** Training Data sekmesinden indirdiğiniz JSONL dosyasını yükleyin
3. **"Start New Fine-Tuning"** butonuna tıklayın
4. OpenAI'da iş oluşturulur ve izlemeye alınır

### 7.2 İş Durumu İzleme

| Durum | Anlamı |
|-------|--------|
| **running** | İş devam ediyor, model eğitiliyor |
| **succeeded** | Eğitim tamamlandı, model kullanıma hazır |
| **failed** | Eğitim başarısız oldu |

- **Sync Status:** OpenAI'dan son durumu güncelle
- **Activate:** Başarılı modeli aktifleştir — artık bu ajan fine-tuned model kullanacak
- **Deactivate:** Baz modele (gpt-4o) geri dön

### 7.3 Model Bilgileri

- Fine-tune edilen model: `gpt-4o-mini`
- Model ismi formatı: `ft:gpt-4o-mini-2024-07-18:rentai-{agentType}`
- Minimum önerilen eğitim verisi: 50 konuşma

---

## 8. Messages (Mesajlar) Sekmesi

İki bölümden oluşur:

### 8.1 İletişim Mesajları
- Web sitesindeki iletişim formundan gelen mesajlar
- Gönderenin adı, emaili, şirketi, şirket büyüklüğü ve ilgilendiği ajan

### 8.2 Bülten Aboneleri
- Newsletter'a abone olan email adresleri listesi

---

## 9. Cost Tracker (Maliyet Takibi) Sekmesi

OpenAI API kullanım maliyetlerinin detaylı takibi.

### 9.1 Özet Görünüm

- Toplam istek sayısı
- Toplam prompt + completion token sayısı
- Toplam maliyet (USD)
- Benzersiz kullanıcı sayısı
- Pahalı istekler ($0.01+ filtresi)

### 9.2 Maliyet Dağılımı

- **Kullanıcı bazlı:** Hangi kullanıcı ne kadar harcamış
- **Ajan bazlı:** Hangi ajan ne kadar maliyetli
- **Model bazlı:** gpt-4o vs diğer modellerin maliyeti

### 9.3 Detaylı İstek Günlüğü

Her API isteğinin detaylı kaydı:
- Tarih/saat
- Kullanıcı
- Ajan tipi
- Model
- Prompt tokens / Completion tokens / Toplam tokens
- Maliyet (USD)

---

## 10. Hızlı Referans Tablosu

### 9 AI Ajan

| Ajan | Tür | Uzmanlık |
|------|------|----------|
| **Ava** | customer-support | Müşteri destek, ticket, email |
| **Rex** | sales-sdr | Satış, lead, kampanya, teklif |
| **Maya** | social-media | Sosyal medya, görüntü üretimi |
| **Finn** | bookkeeping | Muhasebe, fatura, gider |
| **Cal** | scheduling | Takvim, toplantı, hatırlatıcı |
| **Harper** | hr-recruiting | İK, işe alım, aday değerlendirme |
| **DataBot** | data-analyst | Veri analizi, rapor, dashboard |
| **ShopBot** | ecommerce-ops | E-ticaret, envanter, sipariş |
| **Reno** | real-estate | Emlak, mülk arama, piyasa analizi |

### Abonelik Planları

| Plan | Fiyat | Detay |
|------|-------|-------|
| **Standard** | $300/ay | 3'e kadar AI ajan (Finn hariç), günlük 100 mesaj, temel entegrasyonlar |
| **Professional** | $600/ay | 7'ye kadar AI ajan (Finn hariç), günlük 150 mesaj, gelişmiş entegrasyonlar, API erişimi |
| **All-in-One** | $1,200/ay | 9 ajanın tamamı dahil, günlük 150 mesaj, özel eğitim, SLA garantisi, özel hesap yöneticisi |
| **Sadece Muhasebe (Finn)** | $500/ay | Sadece Finn ajanı, günlük 200 mesaj, mali raporlama, Türk muhasebe mevzuatı uyumlu |

### Test Kart Numaraları (Ödeme Testi)

| Kart | Numara |
|------|--------|
| Visa | `4242 4242 4242 4242` |
| Visa (debit) | `4000 0000 0000 0077` |
| Mastercard | `5555 5555 5555 4444` |
| Amex | `3782 822463 10005` |

> Son kullanma: Gelecek herhangi bir tarih. CVV: Herhangi 3 rakam. ZIP: Herhangi 5 rakam.

---

## 11. Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Admin girişi çalışmıyor | `ADMIN_PASSWORD` env değişkeninin doğru ayarlandığından emin olun |
| Boss AI cevap vermiyor | OpenAI API key'inin ayarlı olduğunu kontrol edin |
| Fine-tuning başarısız | JSONL dosyasının en az 10 örnek içerdiğinden emin olun |
| Ajan araçları çalışmıyor | İlgili servis bağlantılarını kontrol edin (Gmail, Calendar vb.) |
| Maliyet takibi boş görünüyor | Henüz chat yapılmamış olabilir, birkaç konuşma başlatın |

---

*Bu kılavuz RentAI 24 v1.0 için hazırlanmıştır.*
*Son güncelleme: 19 Mart 2026*
