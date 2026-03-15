"""
Demir-Çelik KDV Tevkifat Chunk Güncellemesi
Kullanım: cd ~/workspace/server && python3 update_chunks.py
"""
import os
from pinecone import Pinecone
from openai import OpenAI

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "muhasebe-referans"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
NAMESPACE = "turk-muhasebe"

CHUNKS = [
    {
        "id": "kdv-tevkifat-kismi",
        "text": "Kısmi KDV Tevkifatı Oranları Tablosu (KDVK md. 9, KDV Genel Uygulama Tebliği). Belirli alıcılar (KDV mükellefi veya belirlenmiş alıcılar) aşağıdaki oranları uygular. TAM LİSTE: 1) Yapım işleri ile mühendislik-mimarlık hizmetleri: 4/10. 2) Etüt, plan-proje, danışmanlık, denetim hizmetleri: 9/10. 3) Makine, teçhizat, demirbaş, taşıt bakım-onarım hizmetleri: 7/10. 4) Yemek servis ve organizasyon hizmetleri: 5/10. 5) İşgücü temin hizmetleri, özel güvenlik: 9/10. 6) Yapı denetim hizmetleri: 9/10. 7) Fason tekstil ve konfeksiyon işleri: 8/10. 8) Fason çanta ve ayakkabı dikim işleri: 8/10. 9) Temizlik, çevre ve bahçe bakım hizmetleri: 9/10. 10) Servis taşımacılığı hizmeti: 5/10. 11) Baskı ve basım hizmetleri: 5/10. 12) Hurda ve atık teslimleri (metal, plastik, kâğıt, cam): 7/10. 13) Ağaç ve orman ürünleri teslimleri: 5/10. 14) Külçe metal teslimleri: 7/10. 15) Bakır, çinko, alüminyum ve alaşım ürünleri teslimleri: 7/10. 16) Demir-çelik ve alaşımlarından mamul ürünlerin teslimi: 5/10 (01.11.2022'den itibaren, öncesi 4/10 idi). 17) İstisnadan vazgeçenlerin teslimi: 7/10. 18) Pamuk, tiftik, yün ve yapağı teslimleri: 9/10. 19) Ticari reklam hizmetleri: 3/10. 20) Profesyonel spor kulüplerine sponsorluk: 9/10. ÖNEMLİ ORANLAR: Demir-çelik mamul ürünleri 5/10. Hurda/atık teslimleri 7/10. Külçe metal 7/10. Bakır/alüminyum/çinko 7/10. Bunlar farklı kategoriler ve farklı oranlar, karıştırılmamalı.",
        "metadata": {"category": "kdv", "subcategory": "tevkifat_kismi", "section": "3.2", "keywords": ["kısmi tevkifat", "yapım", "danışmanlık", "işgücü", "temizlik", "hurda", "metal", "tekstil", "fason", "reklam", "bakır", "alüminyum", "demir", "çelik", "4/10", "9/10", "7/10", "5/10", "8/10", "3/10"], "year": "evergreen"}
    },
    {
        "id": "demir-celik-tevkifat-detay",
        "text": "DEMİR-ÇELİK ÜRÜNLERİNDE KDV TEVKİFATI DETAYLI REHBER (KDV Genel Uygulama Tebliği Bölüm I/C-2.1.3.3.8). TEVKİFAT ORANI: 5/10 (01.11.2022 tarihinden itibaren, öncesi 4/10). Tevkifat kodu: 627. TEVKİFATA TABİ ÜRÜNLER (5/10 uygulanır): Cevherden, hurdadan veya diğer hammaddelerden üretilen demir-çelik ve alaşımlarından mamul her türlü ürün. UZUN ÜRÜNLER: çubuk, inşaat demiri (nervürlü), profil (NPI, NPU, HEA, IPE), kangal demir, filmaşin, tel (galvanizli tel, tavlı tel, dikenli tel, örgü teli, doğrultma teli, PVC galvanizli tel, çekilmiş tel, helozon örgü teli), halat, çelik halat, hasır (nervürlü/düz), boru (dikişli/dikişsiz), lama, köşebent (L profil). YASSI ÜRÜNLER: sac levha, sıcak haddelenmiş yassı (HRC, HR coil), soğuk haddelenmiş yassı (CRC, CR coil), kaplanmış yassı (galvanizli sac, boyalı sac, kalay kaplı sac, alüminyum kaplı sac), plaka. Sac levhanın kesilmesi, delinmesi, bükülmesi sonucu oluşan ürünler de tevkifata tabidir. TEVKİFAT UYGULANMAYAN ÜRÜNLER (mamul eşya — tevkifat YOK): kapı, kapı kolu, vida, somun, dübel, kilit, çivi, flanş, maşon, dirsek, kanca, menteşe, yay, bilya, rulman, zincir, panel çit, çimli çit, çelik konstrüksiyon, çelik çatı, demir kapı/pencere, merdiven korkuluğu, su deposu, döküm parçaları (makine parçası, ızgara, buhar kazanı), çelik bilya/granül, aydınlatma direği, enerji nakil hattı direği. KURAL: Nihai kullanım amacına uygun mamul eşya = tevkifat yok. Yarı mamul/hammadde niteliğinde = tevkifat var. TEVKİFAT UYGULANMAYAN SAFHALAR: 1) İthalatçıların ilk teslimi — tevkifat YOK. Faturada 'Teslim edilen mal doğrudan ithalat yoluyla temin edildiğinden tevkifat uygulanmamıştır' notu ve GB bilgisi yazılır. Sonraki el değiştirmelerde tevkifat UYGULANIR. 2) Münhasıran cevherden üretenlerin ilk teslimi — tevkifat YOK. Faturada 'Teslim edilen mal firmamızca münhasıran cevherden üretildiğinden tevkifat uygulanmamıştır' yazılır. Sonraki teslimde tevkifat UYGULANIR. TEVKİFAT İLK TESLİMDEN İTİBAREN UYGULANAN DURUMLAR: A) Hurdadan üretim yapanlar — ilk teslim DAHİL her safhada 5/10 tevkifat. B) Hurda + cevher karışık üretim yapanlar — ilk teslim DAHİL her safhada 5/10 tevkifat. Bu kural haddehaneler, galvaniz tesisleri ve tel çekme hatları için kritiktir: ürettikleri inşaat demiri, filmaşin, profil, kangal, tel, galvanizli tel, sac vb. satışında İLK TESLİMDEN İTİBAREN 5/10 tevkifat uygulanmalıdır. DİĞER DEMİR-ÇELİK KATEGORİLERİ (FARKLI ORANLAR — KARIŞTIRILMAMALI): Demir-çelik hurda/atık teslimleri: 7/10 (Tebliğ I/C-2.1.3.3.3.2). Külçe metal (demir-çelik külçe) teslimleri: 7/10 (Tebliğ I/C-2.1.3.3.4, kod 817). İsteğe bağlı tam tevkifat: 10/10 (kod 825). Bakır/çinko/alüminyum ürünleri: 7/10 (farklı kategori). ALT SINIR: KDV dahil bedel 2.000 TL'yi aşmadığında tevkifat uygulanmaz. Aşıldığında tamamı üzerinden yapılır. MUHASEBE KAYDI (Satıcı/Üretici): Borç 120 Alıcılar (bedel + tevkifatsız KDV), Borç 136 Diğer Alacaklar (tevkif edilen KDV — iade talep), Alacak 600 Yurtiçi Satışlar, Alacak 391 Hesaplanan KDV (toplam). MUHASEBE KAYDI (Alıcı): Borç 150/153 Stoklar, Borç 191 İndirilecek KDV (toplam), Alacak 320 Satıcılar (bedel + tevkifatsız KDV), Alacak 360 Ödenecek Vergi (tevkif edilen KDV — KDV-2 beyanı).",
        "metadata": {"category": "kdv", "subcategory": "demir_celik_tevkifat", "section": "3.2-sektorel", "keywords": ["demir", "çelik", "tevkifat", "5/10", "7/10", "10/10", "inşaat demiri", "filmaşin", "profil", "kangal", "tel", "galvanizli tel", "sac", "levha", "HRC", "CRC", "boru", "hurda", "cevher", "ithalatçı", "ilk teslim", "haddehane", "galvaniz", "mamul eşya", "panel çit", "vida", "çivi", "kapı", "konstrüksiyon", "2000 TL", "alt sınır", "627", "825", "KDV-2", "iade"], "year": "2026"}
    }
]

print(f"🔄 {len(CHUNKS)} chunk güncelleniyor/ekleniyor...\n")
for chunk in CHUNKS:
    resp = client.embeddings.create(model="text-embedding-3-small", input=[chunk["text"]])
    index.upsert(vectors=[{"id": chunk["id"], "values": resp.data[0].embedding, "metadata": {**chunk["metadata"], "text": chunk["text"]}}], namespace=NAMESPACE)
    print(f"  ✅ {chunk['id']}")

stats = index.describe_index_stats()
ns = stats.get("namespaces", {}).get(NAMESPACE, {})
print(f"\n✅ Güncelleme tamamlandı! Toplam vektör: {ns.get('vector_count', 0)}")
