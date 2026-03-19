# ============================================================
#         RentAI 24 — DETAYLI KULLANIM KILAVUZU
#         Otomasyon Motoru + Platform Rehberi
# ============================================================


# BOLUM 1: PLATFORM GENEL YAPISI
# ============================================================

Platformun temel yapisi su sekilde calisir:

```
   [Kullanici]
       |
       v
   [Web Arayuzu]  ──────────────────────────────┐
       |                                         |
       v                                         v
   [AI Ajan Secimi]                    [Otomasyon Yonetimi]
       |                                         |
       ├── Ava (Musteri Destek)                  ├── Sablon Galerisi
       ├── Rex (Satis/CRM)                       ├── Ozel Otomasyon
       ├── Maya (Sosyal Medya)                   ├── Calisma Gecmisi
       ├── Finn (Muhasebe)                       └── Webhook Yonetimi
       ├── Cal (Takvim)
       ├── Harper (IK/Ise Alim)
       ├── DataBot (Veri Analiz)
       ├── ShopBot (E-Ticaret)
       └── Reno (Gayrimenkul)
```


# BOLUM 2: KAYIT VE GIRIS AKISI
# ============================================================

```
   [Ana Sayfa]
       |
       ├──> [Kayit Ol] ──> E-posta + Sifre Gir ──> Hesap Olustur ──> Dashboard
       |
       ├──> [Google ile Giris] ──> Google Yetkilendirme ──> Dashboard
       |
       └──> [Giris Yap] ──> E-posta + Sifre ──> Dashboard
```

### Adimlar:
```
   1. Tarayicida siteyi acin
          |
          v
   2. Sag ustteki "Kayit Ol" veya "Giris Yap" butonuna tiklayin
          |
          v
   3. Bilgilerinizi girin
          |
          v
   4. Basarili giris ──> Dashboard sayfasina yonlendirilirsiniz
```


# BOLUM 3: AI AJANLARI ILE SOHBET
# ============================================================

### Sohbet Baslama Akisi:

```
   [/demo veya /chat sayfasi]
          |
          v
   [Sol Panelden Ajan Sec]
          |
          ├──> Ava    → "Destek talebi olustur", "Musteri sorusu cevapla"
          ├──> Rex    → "Yeni lead ekle", "Takip planla"
          ├──> Maya   → "Sosyal medya postu olustur", "Gorsel uret"
          ├──> Finn   → "Fatura olustur", "KDV hesapla"
          ├──> Cal    → "Randevu olustur", "Takvim kontrol et"
          ├──> Harper → "Aday degerlendirmesi yap", "Is ilani olustur"
          ├──> DataBot → Excel yukle → Analiz ve grafik
          ├──> ShopBot → "Siparis durumu", "Stok guncelle"
          └──> Reno   → "Mulk ara", "Piyasa analizi yap"
          |
          v
   [Mesajinizi Yazin ve Gonderin]
          |
          v
   [Ajan Yanit Verir]
          |
          ├──> Metin yaniti
          ├──> Hizli yanit butonlari (secenekler sunar)
          ├──> PDF belgesi (fatura, rapor)
          ├──> Excel dosyasi
          └──> Grafik/tablo
```

### Fatura Olusturma Akisi (Finn):

```
   "Fatura olustur" deyin
          |
          v
   [Fatura Turu Sec]  ←── Butonlar: Yurtici | Ihracat | Proforma
          |
          v
   [Para Birimi Sec]  ←── Butonlar: TRY | USD | EUR | GBP
          |
          v
   (Eger Ihracat ise)
   [Incoterm Sec]     ←── Butonlar: FOB | CIF | EXW | CFR | DDP
          |
          v
   [Urun Bilgileri Gir]  ←── Urun adi, miktar, birim fiyat
          |
          v
   [KDV Orani Sec]    ←── Butonlar: %20 | %10 | %1 | KDV Muaf
          |
          v
   [Onay]             ←── Butonlar: Onayla | Duzenle
          |
          v
   [Fatura Olusturuldu] ──> PDF Indir + Excel Indir
```


# BOLUM 4: OTOMASYON MOTORU (EN ONEMLI BOLUM)
# ============================================================

## 4.1 Otomasyon Nedir?

Otomasyon = Bir olay olunca, otomatik olarak baska isler yap

```
   [TETIKLEYICI]  ──>  [ADIM 1]  ──>  [ADIM 2]  ──>  [ADIM 3]
       |                   |              |              |
   "Ne zaman?"        "Ne yap?"      "Sonra?"       "Sonra?"
```

### Ornek Senaryo:
```
   Finn fatura olusturdu
          |
          v
   Otomatik olarak museteriye e-posta gonder
          |
          v
   Patrona bildirim gonder
          |
          v
   CRM'de notu guncelle
```


## 4.2 Otomasyonlar Sayfasina Erisim

```
   [Giris Yap]
       |
       v
   [Ust Menude "Otomasyonlar" (simge) Butonuna Tikla]
       |
       v
   [/automations Sayfasi Acilir]
       |
       ├──> Mevcut otomasyonlariniz listelenir
       ├──> "Sablonlar" butonu → Hazir sablonlar
       └──> "Yeni" butonu → Sifirdan olustur
```


## 4.3 Sablondan Otomasyon Olusturma (Kolay Yol)

```
   [Otomasyonlar Sayfasi]
          |
          v
   ["Sablonlar" butonuna tikla]
          |
          v
   [Sablon Galerisi Acilir]
          |
          ├── Finans Kategorisi
          │      └── "Fatura → E-posta" sablonu
          │
          ├── Satis Kategorisi
          │      └── "Yeni Lead → Puanlama + Takip" sablonu
          │
          ├── E-Ticaret Kategorisi
          │      └── "Siparis → Kargo Takibi" sablonu
          │
          ├── Yonetim Kategorisi
          │      └── "Gunluk Ozet Rapor" sablonu
          │
          ├── Iletisim Kategorisi
          │      └── "E-posta Gonderildi Bildirimi" sablonu
          │
          └── Destek Kategorisi
                 └── "Destek Talebi → Webhook" sablonu
          |
          v
   [Istediginiz sablonun "Kullan" butonuna tiklayin]
          |
          v
   [Otomasyon hesabiniza eklenir (PASIF olarak)]
          |
          v
   [Toggle dugmesini acarak AKTIF yapin]
          |
          v
   [Artik otomatik calismaya hazir!]
```


## 4.4 Sifirdan Otomasyon Olusturma

```
   [Otomasyonlar Sayfasi]
          |
          v
   ["Yeni" butonuna tikla]
          |
          v
   [Isim girin]  ←── Ornek: "Fatura sonrasi bildirim"
          |
          v
   [Aciklama girin]  ←── Ornek: "Fatura olusturulunca e-posta atar"
          |
          v
   ["Olustur" butonuna tikla]
          |
          v
   [Otomasyon olusturuldu - Manuel tetikleyici ile]
          |
          v
   [Detay sayfasindan duzenleyebilirsiniz]
```


## 4.5 Tetikleyici Turleri Detayli Aciklama

### Ajan Aksiyonu Tetikleyicisi:
```
   [Herhangi bir ajan bir araci basariyla kullanir]
          |
          v
   [Sistem otomatik olarak eslesme kontrolu yapar]
          |
          ├── Arac adi eslesiyor mu?
          ├── Ajan turu eslesiyor mu?
          └── Aksiyon turu eslesiyor mu?
          |
          v
   [Eslesen AKTIF otomasyonlar calistirilir]
```

**Ornek:**
```
   Finn "create_invoice" aracini kullanir
          |
          v
   Sistem kontrol eder:
   "create_invoice" ile eslesecek aktif otomasyon var mi?
          |
          ├── EVET ──> Otomasyon calistirilir
          └── HAYIR ──> Hicbir sey olmaz
```

### Webhook Tetikleyicisi:
```
   [Dis Sistem (ornek: Trendyol, ERP)]
          |
          v
   HTTP POST istegi gonderir:
   URL: /api/automations/webhook/{sizin-path}
   Header: x-webhook-secret: {gizli-anahtar}
   Body: { siparis bilgileri }
          |
          v
   [Sistem gizli anahtari dogrular]
          |
          ├── DOGRU ──> Otomasyon calistirilir
          └── YANLIS ──> 404 Hata doner
```

**Onemli:** Her webhook otomasyonuna otomatik bir gizli anahtar atanir.
Bu anahtar olmadan webhook calismaz (guvenlik icin).

### Zamanli (Cron) Tetikleyici:
```
   [Her dakika sistem kontrol eder]
          |
          v
   [Cron ifadesi simdi eslesiyor mu?]
          |
          ├── EVET ──> Otomasyon calistirilir
          └── HAYIR ──> Bir sonraki dakika tekrar kontrol
```

**Cron Ifadesi Ornekleri:**
```
   Dakika  Saat  Gun  Ay  HaftaGunu
     |       |    |    |      |
     v       v    v    v      v
   "0       18    *    *      *"    = Her gun saat 18:00
   "*/30     *    *    *      *"    = Her 30 dakikada bir
   "0        9    1    *      *"    = Her ayin 1'i saat 09:00
   "0       10    *    *      1"    = Her Pazartesi saat 10:00
   "0      8,18   *    *      *"    = Her gun saat 08:00 ve 18:00
```

### Manuel Tetikleyici:
```
   [Otomasyon detay sayfasi]
          |
          v
   ["Manuel Calistir" butonuna tikla]
          |
          v
   [Otomasyon hemen calisir]
```


## 4.6 Workflow Adim Turleri

```
   ┌─────────────────────────────────────────────────────┐
   │                  WORKFLOW AKISI                      │
   │                                                     │
   │   [TETIKLEYICI] ──> [AKSIYON] ──> [KOSUL]          │
   │                                      |              │
   │                          ┌───────────┴──────────┐   │
   │                          v                      v   │
   │                      [DOGRU]                [YANLIS] │
   │                          |                      |   │
   │                          v                      v   │
   │                    [AKSIYON 2]            [AKSIYON 3]│
   │                          |                      |   │
   │                          v                      v   │
   │                    [BEKLEME]                  [SON]  │
   │                          |                          │
   │                          v                          │
   │                    [AKSIYON 4]                       │
   │                          |                          │
   │                          v                          │
   │                        [SON]                        │
   └─────────────────────────────────────────────────────┘
```

### Aksiyon Turleri Tablosu:

```
   ┌──────────────────┬──────────────────────────────────────────┐
   │ Aksiyon Adi      │ Ne Yapar?                                │
   ├──────────────────┼──────────────────────────────────────────┤
   │ send_email       │ Belirtilen adrese e-posta gonderir       │
   │ create_task      │ Ajan gorev listesine yeni gorev ekler    │
   │ notify_boss      │ Patrona/yoneticiye bildirim gonderir     │
   │ update_lead      │ CRM'deki lead bilgilerini gunceller      │
   │ webhook_call     │ Dis bir API'ye HTTP istegi gonderir      │
   │ log_action       │ Islemi kayit altina alir                 │
   │ calculate        │ Matematiksel hesaplama yapar              │
   └──────────────────┴──────────────────────────────────────────┘
```


## 4.7 6 Hazir Sablon Detayli Akislari

### Sablon 1: Fatura → E-posta
```
   [Fatura olusturuldu]
          |
          v
   [E-posta gonder]
   Kime: Musteriye
   Konu: "Faturaniz olusturulmustur"
   Icerik: Fatura detaylari
          |
          v
   [Aksiyon kaydet]
   "Fatura e-postasi gonderildi"
```

### Sablon 2: Yeni Lead → Puanlama + Takip
```
   [Yeni lead eklendi]
          |
          v
   [Lead puani hesapla]
          |
          v
   [Kosul kontrol: Puan > 70 mi?]
          |
          ├── EVET ──> [Takip gorevi olustur]
          │                    |
          │                    v
          │             [Patrona bildir: "Yuksek puanli lead!"]
          │
          └── HAYIR ──> [Aksiyon kaydet: "Dusuk puanli lead"]
```

### Sablon 3: Siparis → Kargo Takibi
```
   [Siparis onaylandi]
          |
          v
   [1 saat bekle]
          |
          v
   [Webhook ile kargo sistemine bildir]
          |
          v
   [Aksiyon kaydet]
```

### Sablon 4: Gunluk Ozet Rapor
```
   [Her gun saat 18:00] (Cron: 0 18 * * *)
          |
          v
   [Gorev olustur: "Gunluk ozet raporu hazirlandi"]
          |
          v
   [Patrona bildir: "Gunluk ozet hazir"]
```

### Sablon 5: E-posta Gonderildi Bildirimi
```
   [E-posta basariyla gonderildi]
          |
          v
   [Patrona bildir: "E-posta gonderildi"]
          |
          v
   [Aksiyon kaydet]
```

### Sablon 6: Destek Talebi → Webhook
```
   [Destek talebi olusturuldu]
          |
          v
   [Webhook ile dis destek sistemine bildir]
          |
          v
   [Gorev olustur: "Destek talebi acildi"]
```


## 4.8 Otomasyon Detay Sayfasi

```
   [Otomasyon kartina tiklayin]
          |
          v
   ┌─────────────────────────────────────────────┐
   │          OTOMASYON DETAY SAYFASI              │
   │                                               │
   │   [Isim]  [Aktif/Pasif Toggle]               │
   │   [Aciklama]                                  │
   │                                               │
   │   ┌──────────┐ ┌──────────┐ ┌──────────┐    │
   │   │ Toplam   │ │ Son      │ │ Tetik.   │    │
   │   │ Calisma  │ │ Calisma  │ │ Turu     │    │
   │   │   12     │ │ 19.03.26 │ │ Ajan     │    │
   │   └──────────┘ └──────────┘ └──────────┘    │
   │                                               │
   │   [Manuel Calistir]  [Sil]                   │
   │                                               │
   │   --- Workflow Adimlari ---                   │
   │   (1) Tetikleyici                             │
   │       ──>                                     │
   │   (2) E-posta Gonder                          │
   │       ──>                                     │
   │   (3) Aksiyon Kaydet                          │
   │                                               │
   │   --- Calisma Gecmisi ---                     │
   │   ✓ Basarili  19.03.2026 14:30               │
   │   ✓ Basarili  19.03.2026 12:15               │
   │   ✗ Basarisiz 18.03.2026 09:00 (Hata: ...)  │
   └───────────────────────────────────────────────┘
```


# BOLUM 5: AJAN-OTOMASYON ENTEGRASYON AKISI
# ============================================================

Bu bolum, ajan araclari ile otomasyonlarin nasil birlikte calistigini gosterir:

```
   [Kullanici ajan ile sohbet eder]
          |
          v
   [Ajan bir arac calistirir]
   Ornek: Finn → create_invoice
          |
          v
   [Arac basarili mi?]
          |
          ├── HAYIR ──> Hicbir sey olmaz
          │
          └── EVET
                |
                v
          [Otomasyon tetikleme kontrolu]
                |
                v
          [Bu kullanicinin aktif otomasyonlari var mi?]
                |
                ├── HAYIR ──> Biter
                │
                └── EVET
                      |
                      v
                [Eslesme kontrolu]
                Arac adi, ajan turu, aksiyon turu karsilastirilir
                      |
                      ├── ESLESMEDI ──> Biter
                      │
                      └── ESLESTI
                            |
                            v
                      [Otomasyon arka planda calistirilir]
                      (Kullanicinin sohbetini etkilemez)
                            |
                            v
                      [Adimlar sirasiyla yurutulur]
                      Tetik → Aksiyon1 → Kosul → Aksiyon2 → ...
                            |
                            v
                      [Sonuc kaydedilir]
                      Basarili/basarisiz olarak calisma gecmisine eklenir
```


# BOLUM 6: MUHASEBE ARACLARI (FINN) DETAY
# ============================================================

### KDV Hesaplama Akisi:
```
   "KDV hesapla" deyin
          |
          v
   Matrah tutarini girin ──> 10000 TL
          |
          v
   KDV orani secin ──> %20
          |
          v
   Sonuc:
   Matrah:     10.000,00 TL
   KDV:         2.000,00 TL
   Toplam:     12.000,00 TL
```

### Bordro Hesaplama Akisi:
```
   "Bordro hesapla" deyin
          |
          v
   Brut maas girin ──> 30000 TL
          |
          v
   Sonuc:
   Brut Maas:         30.000,00 TL
   SGK Isci:          -4.200,00 TL
   Issizlik Isci:       -300,00 TL
   Gelir Vergisi:     -3.825,00 TL
   Damga Vergisi:       -227,70 TL
   Net Maas:          21.447,30 TL
   Isveren Maliyeti:  37.050,00 TL
```


# BOLUM 7: AYARLAR VE YAPILANDIRMA
# ============================================================

```
   [/settings sayfasi]
          |
          ├──> Profil Bilgileri
          │       └── Isim, e-posta guncelleme
          │
          ├──> Dil Tercihi
          │       └── Turkce / Ingilizce
          │
          ├──> Gmail Baglantisi
          │       └── Google ile yetkilendir → Ajanlar e-posta gonderebilir
          │
          ├──> Marka Bilgileri
          │       ├── Sirket adi
          │       ├── Logo yukleme
          │       └── Tema renkleri
          │
          └──> Pazaryeri Baglantilari
                  ├── Trendyol API anahtarlari
                  └── Shopify API anahtarlari
```


# BOLUM 8: GUVENLIK BILGILERI
# ============================================================

```
   ┌─────────────────────────────────────────────┐
   │            GUVENLIK KATMANLARI               │
   │                                               │
   │   1. Oturum Tabanli Kimlik Dogrulama         │
   │      └── Her istek icin oturum kontrolu      │
   │                                               │
   │   2. Webhook Gizli Anahtarlari               │
   │      └── Her webhook icin benzersiz token    │
   │                                               │
   │   3. SSRF Korumasi                            │
   │      └── Ic ag adreslerine istek engeli      │
   │                                               │
   │   4. Giris Dogrulama                          │
   │      └── Tum API'lerde veri kontrolu         │
   │                                               │
   │   5. Hiz Sinirlamasi                          │
   │      └── Webhook: 10 istek/dakika            │
   │      └── Chat: 20 mesaj/dakika               │
   │                                               │
   │   6. Sifreleme                                │
   │      └── Pazaryeri API anahtarlari AES-256    │
   └───────────────────────────────────────────────┘
```


# BOLUM 9: SORUN GIDERME
# ============================================================

```
   Sorun: Otomasyon calismiyor
          |
          v
   [Otomasyon AKTIF mi?] ──> HAYIR ──> Toggle ile aktif yapin
          |
          v (EVET)
   [Tetikleyici dogru mu?] ──> HAYIR ──> Dogru turu secin
          |
          v (EVET)
   [Calisma gecmisinde hata var mi?] ──> EVET ──> Hata mesajini okuyun
          |
          v (HAYIR)
   [Tetikleyici olayı gerceklesti mi?]
          |
          ├── Ajan aksiyonu: Ajan o araci kullanmis mi?
          ├── Webhook: Dogru URL ve secret ile istek gonderiliyor mu?
          ├── Zamanli: Cron ifadesi dogru mu?
          └── Manuel: "Manuel Calistir" butonuna tikladiniz mi?
```

```
   Sorun: E-posta gonderilemiyor
          |
          v
   [Gmail baglantisi yapilmis mi?] ──> HAYIR ──> Ayarlardan baglayin
          |
          v (EVET)
   [Gmail izni hala gecerli mi?] ──> HAYIR ──> Tekrar yetkilendirin
```

```
   Sorun: Fatura PDF acilamiyor
          |
          v
   [Tarayici PDF destekliyor mu?] ──> Farkli tarayici deneyin
          |
          v
   [Dosya indirme tamamlandi mi?] ──> Tekrar indirin
```


# HIZLI BASLANGIC KONTROL LISTESI
# ============================================================

```
   [ ] 1. Hesap olusturun veya giris yapin
   [ ] 2. /settings'den Gmail baglantisi yapin
   [ ] 3. /demo'dan bir ajan ile sohbet edin
   [ ] 4. /automations'dan bir sablon ekleyin
   [ ] 5. Sablonu AKTIF yapin
   [ ] 6. Ajani kullanin ve otomasyonun calistigini gorun
   [ ] 7. Calisma gecmisinden sonuclari kontrol edin
```
