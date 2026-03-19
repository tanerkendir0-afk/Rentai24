# RentAI 24 - Kullanim Kilavuzu

## Icindekiler
1. Platform Genel Bakis
2. Kayit ve Giris
3. AI Ajanlari Kullanma
4. Otomasyon Motoru (Workflow Engine)
5. CRM ve Satis Araclari
6. Muhasebe (Finn) Ozellikleri
7. Pazar Yeri Entegrasyonlari
8. Abonelik Planlari ve Fiyatlandirma
9. Ayarlar ve Yapilandirma

---

## 1. Platform Genel Bakis

RentAI 24, isletmelere hazir egitilmis yapay zeka ajanlari sunan bir AI personel platformudur. 9 farkli AI ajani ile musteri destegindan muhasabeye, satisindan veri analizine kadar pek cok is surecini otomatize edebilirsiniz.

### Mevcut AI Ajanlari:
- **Ava** - Musteri destegi (ticket, email, WhatsApp, canlı sohbet)
- **Rex** - Satis ve CRM (lead yonetimi, takip, musteri iliskileri)
- **Maya** - Sosyal medya yonetimi (icerik planlama, gorsel uretimi)
- **Finn** - Muhasebe ve finans (KDV, fatura, bordro, yevmiye)
- **Cal** - Takvim ve randevu yonetimi
- **Harper** - Insan kaynaklari ve ise alim
- **DataBot** - Veri analizi (Excel/CSV analizi, grafik olusturma)
- **ShopBot** - E-ticaret (Trendyol, Shopify entegrasyonu)
- **Reno** - Gayrimenkul (mulk arama, piyasa analizi)

---

## 2. Kayit ve Giris

### Hesap Olusturma
1. Ana sayfada **Kayit Ol** butonuna tiklayin
2. E-posta, sifre ve isim bilgilerinizi girin
3. Alternatif olarak **Google ile Giris** secenegini kullanabilirsiniz

### Giris Yapma
1. **/login** sayfasina gidin
2. E-posta ve sifrenizi girin
3. Basarili giristen sonra Dashboard'a yonlendirilirsiniz

### Profil Bilgileri
Ilk giris sonrasi bir onboarding formu cikabilir. Sektorunuz, sirket buyuklugu ve kullanmak istediginiz ajanlari secin. Bu bilgiler deneyiminizi kisisellestirir.

---

## 3. AI Ajanlari Kullanma

### Sohbete Baslama
1. **/demo** veya **/chat** sayfasina gidin
2. Sol panelden kullanmak istediginiz ajani secin
3. Mesajinizi yazip gonderin

### Onemli Ipuclari
- **Hizli Yanit Butonlari**: Ajanlar bazen secenekler sunar (ornegin KDV orani, para birimi). Bu butonlara tiklayarak hizlica cevap verebilirsiniz.
- **Dosya Yukleme**: DataBot'a Excel/CSV dosyasi yukleyerek veri analizi yaptirabilirsiniz (max 10MB)
- **PDF Olusturma**: Ajanlar fatura, rapor, teklif gibi PDF belgeleri olusturabilir
- **E-posta Gonderme**: Ajanlar sizin adiniza e-posta gonderebilir (Gmail baglantisi gerekir)

### Akim Ornekleri
- Ava'ya "Destek talebi olustur" deyin → Musteri sorusunu cozumler
- Rex'e "Yeni lead ekle" deyin → Musteri bilgilerini alir ve CRM'e kaydeder
- Maya'ya "Instagram postu olustur" deyin → Icerik ve gorsel olusturur
- Finn'e "Fatura olustur" deyin → Adim adim fatura bilgilerini sorar
- Cal'a "Yarin saat 14:00 toplanti ayarla" deyin → Takvime ekler
- Harper'a "Aday degerlendirme raporu hazirla" deyin → Ozgecmis analizi yapar
- DataBot'a Excel yukleyin → Otomatik analiz yapar, grafik olusturur
- ShopBot'a "Siparis durumunu kontrol et" deyin → E-ticaret bilgilerini getirir
- Reno'ya "Istanbul'da kiralik daire ara" deyin → Piyasa analizi yapar

---

## 4. Otomasyon Motoru (Workflow Engine)

Otomasyon motoru, ajan aksiyonlarini otomatik zincirlere baglamaniza olanak tanir. Ornegin: fatura olusturulunca otomatik e-posta gonder, yeni lead gelince puan hesapla ve takip planla.

### Otomasyonlar Sayfasina Erisim
1. Ust menuden **Otomasyonlar** butonuna tiklayin (simge ikonu)
2. Veya tarayicida **/automations** adresine gidin
3. Giris yapmis olmaniz gerekir

### Sablon Galerisinden Otomasyon Olusturma (Onerilen Yol)
1. Otomasyonlar sayfasinda **Sablonlar** butonuna tiklayin
2. 6 hazir sablon kategoriye gore listelenir:

| Sablon | Kategori | Aciklama |
|--------|----------|----------|
| Fatura → E-posta | Finans | Fatura olusturulunca otomatik e-posta gonderir |
| Yeni Lead → Puanlama + Takip | Satis | Yeni lead eklenince puan hesaplar, yuksek puanlilara takip olusturur |
| Siparis → Kargo Takibi | E-Ticaret | Siparis onaylaninca kargo bildirim webhook'u cagirir |
| Gunluk Ozet Rapor | Yonetim | Her gun belirli saatte ozet rapor olusturur |
| E-posta Gonderildi Bildirimi | Iletisim | E-posta gonderilince patrona bildirim gonderir |
| Destek Talebi → Webhook | Destek | Destek talebi olusturulunca harici sisteme bildirir |

3. Istediginiz sablonun yanindaki **Kullan** butonuna tiklayin
4. Sablon otomatik olarak hesabiniza eklenir (pasif olarak)
5. Aktif etmek icin toggle dugmesini acin

### Sifirdan Otomasyon Olusturma
1. Otomasyonlar sayfasinda **Yeni** butonuna tiklayin
2. Otomasyona bir isim verin (ornegin: "Fatura sonrasi bildirim")
3. Aciklama ekleyin (istege bagli)
4. **Olustur** butonuna tiklayin
5. Varsayilan olarak manuel tetikleyici ve log aksiyonu ile olusturulur

### Tetikleyici Turleri
- **Ajan Aksiyonu (agent_tool_complete)**: Bir ajan araci basarili oldugunda otomatik calisir
  - Ornek: Finn fatura olusturdugunda, Rex lead eklediginde
- **Webhook**: Dis sistemlerden HTTP istegi geldiginde calisir
  - Her webhook icin otomatik bir gizli anahtar (secret) olusturulur
  - Webhook URL: `/api/automations/webhook/{sizin-path}`
  - Header'da `x-webhook-secret` gonderilmesi gerekir
- **Zamanli (schedule)**: Belirli zamanlarda otomatik calisir
  - Cron ifadesi kullanilir (ornegin: `0 18 * * *` = her gun saat 18:00)
  - Dakika, saat, gun, ay, hafta gunu desteklenir
- **Manuel**: Sadece siz calistirdiginizda calisir

### Workflow Adimlari (Node Turleri)
Her otomasyon bir veya birden fazla adimdan olusur:

1. **Tetikleyici (trigger)**: Workflow'u baslatir
2. **Aksiyon (action)**: Bir is yapar
   - `send_email` - E-posta gonderir
   - `create_task` - Gorev olusturur
   - `notify_boss` - Patrona bildirim gonderir
   - `update_lead` - Lead bilgilerini gunceller
   - `webhook_call` - Harici bir API'ye istek gonderir
   - `log_action` - Aksiyon kaydeder
   - `calculate` - Matematiksel hesaplama yapar
3. **Kosul (condition)**: Belirli bir sart kontrol eder, dogru/yanlis dallarına ayirir
4. **Bekleme (delay)**: Belirli sure bekler (saniye cinsinden)

### Otomasyon Yonetimi
- **Aktif/Pasif**: Her otomasyon kartindaki toggle ile acip kapatabilirsiniz
- **Manuel Calistirma**: Detay sayfasinda **Manuel Calistir** butonu ile test edebilirsiniz
- **Calisma Gecmisi**: Detay sayfasinda son 20 calismanin sonuclarini gorebilirsiniz
  - Yesil tik = Basarili
  - Kirmizi X = Basarisiz (hata mesaji gosterilir)
  - Mavi dongu = Calisiyor
- **Silme**: Detay sayfasindaki **Sil** butonu ile otomasyonu kaldirir

### Ajan-Otomasyon Entegrasyonu
Otomasyonlar, ajan araclarinin basarili sonuclarini otomatik olarak dinler:

1. Finn'de fatura olusturuldugunda → otomasyon tetiklenir
2. Rex'de yeni lead eklediginde → otomasyon tetiklenir
3. Herhangi bir ajan araci basarili oldugunda → eslesme kontrolu yapilir

Bu entegrasyon otomatiktir. Yalnizca uygun tetikleyici turune sahip **aktif** otomasyonlar calistirilir.

---

## 5. CRM ve Satis Araclari (Rex)

### Lead Yonetimi
- Rex'e "Yeni musteri ekle" veya "Lead olustur" deyin
- Musteri bilgileri (isim, e-posta, sirket, kaynak) istenir
- Otomatik lead puanlama (0-100 arasi skor)

### Deal Takibi
- Firsatlar (deals) pipeline'da takip edilir
- Asamalar: Prospecting → Qualification → Proposal → Negotiation → Closed Won/Lost

### Takip Planlama
- "3 gun sonra takip e-postasi gonder" seklinde talimat verin
- Otomatik zamanlanmis takip e-postalari

---

## 6. Muhasebe Ozellikleri (Finn)

### Fatura Olusturma
1. Finn'e "Fatura olustur" veya "Yeni fatura" deyin
2. Fatura turu secin (Yurtici / Ihracat / Proforma)
3. Para birimi secin (TRY, USD, EUR, GBP)
4. Ihracat ise Incoterm secin (FOB, CIF, EXW, CFR, DDP)
5. Urun/hizmet bilgilerini girin
6. KDV orani ve tevkifat bilgilerini secin
7. Fatura PDF ve Excel olarak indirilir

### Diger Muhasebe Araclari
- **KDV Hesaplama**: Matrah ve orana gore KDV hesaplama
- **Bordro Hesaplama**: Brut/net maas hesabi (SGK, gelir vergisi dahil)
- **Amortisman**: Duzeltme bakiye ve normal amortisman hesabi
- **Kur Degerleme**: TCMB kurlarindan otomatik degerle
- **Yevmiye Kaydi**: Borc/alacak formati ile muhasebe kaydi olusturma
- **Stopaj Hesaplama**: Gelir turine gore stopaj
- **e-Fatura Parse**: UBL-TR XML dosyalarindan otomatik veri cikarma

### Raporlar
- Mizan raporu (Excel)
- Bilanco (Excel)
- Gelir tablosu (Excel)
- Bordro raporu (Excel)
- KDV ozet raporu (Excel)

---

## 7. Pazar Yeri Entegrasyonlari (ShopBot)

### Baglanti Kurma
1. **/settings** sayfasina gidin
2. "Pazaryeri Baglantilari" bolumunu bulun
3. **Yeni Baglanti** ile Trendyol veya Shopify hesabinizi baglayın
4. API anahtarlarinizi girin (sifrelenerek saklanir)

### Kullanim
- ShopBot'a urun, siparis, stok sorulari sorun
- Fiyat guncelleme, stok yonetimi, siparis takibi
- Musteri sorularina otomatik cevap

---

## 8. Abonelik Planlari ve Fiyatlandirma

### Mevcut Planlar

| Plan | Aylik Fiyat | Icerik |
|------|-------------|--------|
| **Standard** | $300 | 3'e kadar AI ajan (Finn haric), ajan basi gunluk 100 mesaj, temel entegrasyonlar, e-posta destegi |
| **Professional** | $600 | 7'ye kadar AI ajan (Finn haric), ajan basi gunluk 150 mesaj, gelismis entegrasyonlar, oncelikli destek, API erisimi, cok dilli destek |
| **All-in-One** | $1,200 | 9 AI ajanin tamami dahil, ajan basi gunluk 150 mesaj, tum entegrasyonlar, 7/24 ozel destek, ozel AI egitimi, SLA garantisi, ozel hesap yoneticisi |
| **Sadece Muhasebe (Finn)** | $500 | Sadece Finn (muhasebe ajani), gunluk 200 mesaj, dokuman olusturma ve faturalama, mali raporlama, oncelikli destek, Turk muhasebe mevzuati uyumlu |

### Eklentiler

| Eklenti | Fiyat | Aciklama |
|---------|-------|----------|
| Ek Dil Paketi | $19/ay | Herhangi bir ajana ek dil destegi |
| Ozel Entegrasyon | $99 (tek seferlik) | Herhangi bir arac veya platforma baglanti |
| Oncelikli Baslangic | $199 (tek seferlik) | Ozel baslangic uzmani |
| Ozel Hesap Yoneticisi | $299/ay | Adanmis hesap yonetimi |

### Onemli Notlar
- Tum fiyatlara KDV ve vergiler dahil degildir
- Istediginiz zaman iptal edebilirsiniz
- 14 gunluk ucretsiz deneme suresi vardir
- Guvenli odeme altyapisi (Stripe)
- Para iade garantisi

---

## 9. Ayarlar ve Yapilandirma

### Genel Ayarlar (/settings)
- Profil bilgileri guncelleme
- Dil tercihi (Turkce/Ingilizce)
- Gmail baglantisi (e-posta gonderme icin)
- Marka bilgileri (sirket adi, logo, tema renkleri)

### Gmail Baglantisi
1. Ayarlar sayfasindaki "Gmail Bagla" butonuna tiklayin
2. Google hesabinizla yetkilendirin
3. Artik ajanlar sizin adiniza e-posta gonderebilir

### Dashboard (/dashboard)
- Aktif ajan kiralama durumu
- Son ajan aksiyonlari
- Kullanim istatistikleri
- Token harcama limiti bilgisi

---

## Sik Sorulan Sorular

**S: Otomasyonlar ne zaman calisir?**
C: Ajan aksiyonu tetikleyicili otomasyonlar, ilgili ajan araci basariyla tamamlandiginda aninda calisir. Zamanli olanlar cron ifadesine gore calisir. Manuel olanlar sadece siz baslattiginizda calisir.

**S: Kac otomasyon olusturabilirim?**
C: Sinirsiz otomasyon olusturabilirsiniz. Ancak performans icin gercekten ihtiyac duyduklarinizi aktif tutun.

**S: Webhook guvenli mi?**
C: Evet. Her webhook otomasyonu icin benzersiz bir gizli anahtar (secret) otomatik olusturulur. Webhook cagirisinda bu anahtarin `x-webhook-secret` header'i ile gonderilmesi zorunludur.

**S: Otomasyon hata verirse ne olur?**
C: Hata detaylari calisma gecmisinde goruntulenir. Otomasyon pasif olmaz, sadece o calisma basarisiz olarak kaydedilir.

**S: Token limiti nedir?**
C: Her kullanicinin belirli bir token harcama limiti vardir (varsayilan $5.00). Bu limit admin tarafindan kullanici bazinda ayarlanabilir.

---

## Destek

Herhangi bir sorunuz veya sorununuz icin:
- **/contact** sayfasindan bize ulasin
- Uygulama ici sohbette herhangi bir ajana sorun
- Geri bildirim formunu kullanin
