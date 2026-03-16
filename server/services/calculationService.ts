interface KdvResult {
  netTutar: number;
  kdvOrani: number;
  kdvTutari: number;
  toplamTutar: number;
  tevkifatOrani?: string;
  tevkifatTutari?: number;
  tahsilEdilecekKdv?: number;
  tahsilEdilecekToplam?: number;
}

export function hesaplaKDV(
  tutar: number,
  kdvOrani: number = 20,
  dahilMi: boolean = false,
  tevkifatOrani?: string
): KdvResult {
  let netTutar: number;
  let kdvTutari: number;

  if (dahilMi) {
    netTutar = tutar / (1 + kdvOrani / 100);
    kdvTutari = tutar - netTutar;
  } else {
    netTutar = tutar;
    kdvTutari = tutar * (kdvOrani / 100);
  }

  const toplamTutar = netTutar + kdvTutari;

  const result: KdvResult = {
    netTutar: round2(netTutar),
    kdvOrani,
    kdvTutari: round2(kdvTutari),
    toplamTutar: round2(toplamTutar)
  };

  if (tevkifatOrani) {
    const [pay, payda] = tevkifatOrani.split('/').map(Number);
    const tevkifatTutari = kdvTutari * (pay / payda);
    const tahsilEdilecekKdv = kdvTutari - tevkifatTutari;

    result.tevkifatOrani = tevkifatOrani;
    result.tevkifatTutari = round2(tevkifatTutari);
    result.tahsilEdilecekKdv = round2(tahsilEdilecekKdv);
    result.tahsilEdilecekToplam = round2(netTutar + tahsilEdilecekKdv);
  }

  return result;
}

interface BordroInput {
  brutUcret: number;
  cocukSayisi?: number;
  medeniDurum?: 'bekar' | 'evli';
  besOrani?: number;
  kumulatifGvMatrahi?: number;
  engellilikDerece?: number;
}

interface BordroResult {
  brutUcret: number;
  sgkIsciPay: number;
  issizlikIsciPay: number;
  besKesinti: number;
  gvMatrahi: number;
  gelirVergisiOrani: number;
  gelirVergisi: number;
  agiTutari: number;
  damgaVergisi: number;
  toplamKesinti: number;
  netUcret: number;
  sgkIsverenPay: number;
  issizlikIsverenPay: number;
  toplamIsverenMaliyet: number;
  kumulatifGvMatrahiYeni: number;
  uyguladigiGvDilimi: string;
}

export function hesaplaBordro(input: BordroInput): BordroResult {
  const {
    brutUcret,
    cocukSayisi = 0,
    medeniDurum = 'bekar',
    besOrani = 0,
    kumulatifGvMatrahi = 0,
    engellilikDerece = 0
  } = input;

  const SGK_ISCI_ORANI = 0.14;
  const ISSIZLIK_ISCI_ORANI = 0.01;
  const SGK_ISVEREN_ORANI = 0.2025;
  const ISSIZLIK_ISVEREN_ORANI = 0.02;
  const DAMGA_VERGISI_ORANI = 0.00759;
  const ASGARI_UCRET_2026 = 33030;
  const SGK_TAVAN = 330300;

  const sgkMatrahi = Math.min(brutUcret, SGK_TAVAN);
  const sgkIsciPay = round2(sgkMatrahi * SGK_ISCI_ORANI);
  const issizlikIsciPay = round2(sgkMatrahi * ISSIZLIK_ISCI_ORANI);

  const besKesinti = round2(brutUcret * (besOrani / 100));

  const gvMatrahi = round2(brutUcret - sgkIsciPay - issizlikIsciPay - besKesinti);

  const yeniKumulatif = kumulatifGvMatrahi + gvMatrahi;
  const { vergi: gelirVergisi, oran: gvOrani, dilim: gvDilimi } = hesaplaGelirVergisi(
    gvMatrahi, kumulatifGvMatrahi
  );

  const agiTutari = hesaplaAGI(cocukSayisi, medeniDurum, ASGARI_UCRET_2026);

  const damgaVergisi = round2(brutUcret * DAMGA_VERGISI_ORANI);

  const netGelirVergisi = round2(Math.max(0, gelirVergisi - agiTutari));

  const toplamKesinti = round2(sgkIsciPay + issizlikIsciPay + besKesinti + netGelirVergisi + damgaVergisi);

  const netUcret = round2(brutUcret - toplamKesinti);

  const sgkIsverenPay = round2(sgkMatrahi * SGK_ISVEREN_ORANI);
  const issizlikIsverenPay = round2(sgkMatrahi * ISSIZLIK_ISVEREN_ORANI);
  const toplamIsverenMaliyet = round2(brutUcret + sgkIsverenPay + issizlikIsverenPay);

  return {
    brutUcret,
    sgkIsciPay,
    issizlikIsciPay,
    besKesinti,
    gvMatrahi,
    gelirVergisiOrani: gvOrani,
    gelirVergisi: netGelirVergisi,
    agiTutari,
    damgaVergisi,
    toplamKesinti,
    netUcret,
    sgkIsverenPay,
    issizlikIsverenPay,
    toplamIsverenMaliyet,
    kumulatifGvMatrahiYeni: round2(yeniKumulatif),
    uyguladigiGvDilimi: gvDilimi
  };
}

function hesaplaGelirVergisi(
  matrah: number,
  kumulatif: number
): { vergi: number; oran: number; dilim: string } {
  const dilimler = [
    { ust: 190000,   oran: 0.15, ad: '%15 (0 - 190.000 ₺)' },
    { ust: 490000,   oran: 0.20, ad: '%20 (190.001 - 490.000 ₺)' },
    { ust: 1200000,  oran: 0.27, ad: '%27 (490.001 - 1.200.000 ₺)' },
    { ust: 4800000,  oran: 0.35, ad: '%35 (1.200.001 - 4.800.000 ₺)' },
    { ust: Infinity, oran: 0.40, ad: '%40 (4.800.000 ₺ üzeri)' }
  ];

  let kalanMatrah = matrah;
  let toplamVergi = 0;
  let gecerliOran = 0.15;
  let gecerliDilim = dilimler[0].ad;
  let oncekiDilimUst = 0;

  for (const dilim of dilimler) {
    if (kumulatif >= dilim.ust) {
      oncekiDilimUst = dilim.ust;
      continue;
    }

    const dilimdeKalan = dilim.ust - Math.max(kumulatif, oncekiDilimUst);
    const buDilimdekiMatrah = Math.min(kalanMatrah, dilimdeKalan);

    if (buDilimdekiMatrah > 0) {
      toplamVergi += buDilimdekiMatrah * dilim.oran;
      gecerliOran = dilim.oran;
      gecerliDilim = dilim.ad;
      kalanMatrah -= buDilimdekiMatrah;
    }

    if (kalanMatrah <= 0) break;
    oncekiDilimUst = dilim.ust;
  }

  return {
    vergi: round2(toplamVergi),
    oran: gecerliOran * 100,
    dilim: gecerliDilim
  };
}

function hesaplaAGI(
  cocukSayisi: number,
  medeniDurum: string,
  asgariUcret: number
): number {
  let agiOrani = 0.50;

  if (medeniDurum === 'evli') {
    agiOrani = 0.50;
  }

  if (cocukSayisi >= 1) agiOrani += 0.075;
  if (cocukSayisi >= 2) agiOrani += 0.075;
  if (cocukSayisi >= 3) agiOrani += 0.05 * (cocukSayisi - 2);

  const yillikAsgariGvMatrahi = asgariUcret * 12 * 0.85;
  const yillikAgi = yillikAsgariGvMatrahi * agiOrani * 0.15;
  const aylikAgi = yillikAgi / 12;

  return round2(aylikAgi);
}

interface AmortismanResult {
  yontem: 'normal' | 'azalan';
  faydaliOmur: number;
  amortismanOrani: number;
  yillikAmortisman: number;
  aylikAmortisman: number;
  tablo: { yil: number; baslangicDeger: number; amortisman: number; birikimli: number; kalanDeger: number }[];
}

export function hesaplaAmortisman(
  maliyet: number,
  faydaliOmur: number = 5,
  yontem: 'normal' | 'azalan' = 'normal'
): AmortismanResult {
  const oran = 1 / faydaliOmur;
  const tablo = [];

  if (yontem === 'normal') {
    const yillikAmortisman = round2(maliyet * oran);

    for (let yil = 1; yil <= faydaliOmur; yil++) {
      const birikimli = round2(yillikAmortisman * yil);
      tablo.push({
        yil,
        baslangicDeger: round2(maliyet - yillikAmortisman * (yil - 1)),
        amortisman: yillikAmortisman,
        birikimli,
        kalanDeger: round2(maliyet - birikimli)
      });
    }

    return {
      yontem,
      faydaliOmur,
      amortismanOrani: round2(oran * 100),
      yillikAmortisman,
      aylikAmortisman: round2(yillikAmortisman / 12),
      tablo
    };
  } else {
    const azalanOran = Math.min(oran * 2, 0.50);
    let kalanDeger = maliyet;

    for (let yil = 1; yil <= faydaliOmur; yil++) {
      let amortisman: number;
      if (yil === faydaliOmur) {
        amortisman = kalanDeger;
      } else {
        amortisman = round2(kalanDeger * azalanOran);
      }

      const birikimli = round2(maliyet - kalanDeger + amortisman);
      tablo.push({
        yil,
        baslangicDeger: round2(kalanDeger),
        amortisman,
        birikimli,
        kalanDeger: round2(kalanDeger - amortisman)
      });
      kalanDeger -= amortisman;
    }

    return {
      yontem,
      faydaliOmur,
      amortismanOrani: round2(azalanOran * 100),
      yillikAmortisman: tablo[0].amortisman,
      aylikAmortisman: round2(tablo[0].amortisman / 12),
      tablo
    };
  }
}

export interface YevmiyeSatiri {
  hesapKodu: string;
  hesapAdi: string;
  borc: number;
  alacak: number;
}

interface KurDegerlemeResult {
  dovizTutar: number;
  dovizCinsi: string;
  kayitKuru: number;
  degerlemeKuru: number;
  kayitDegeri: number;
  degerlemeDegeri: number;
  kurFarki: number;
  kurFarkiTuru: 'kambiyo_kari' | 'kambiyo_zarari';
  yevmiyeKaydi: YevmiyeSatiri[];
}

export function hesaplaKurDegerlemesi(
  dovizTutar: number,
  dovizCinsi: string,
  kayitKuru: number,
  degerlemeKuru: number,
  hesapTuru: 'alacak' | 'borc'
): KurDegerlemeResult {
  const kayitDegeri = round2(dovizTutar * kayitKuru);
  const degerlemeDegeri = round2(dovizTutar * degerlemeKuru);
  const kurFarki = round2(Math.abs(degerlemeDegeri - kayitDegeri));

  let kurFarkiTuru: 'kambiyo_kari' | 'kambiyo_zarari';
  const yevmiyeKaydi: YevmiyeSatiri[] = [];

  if (hesapTuru === 'alacak') {
    if (degerlemeKuru > kayitKuru) {
      kurFarkiTuru = 'kambiyo_kari';
      yevmiyeKaydi.push(
        { hesapKodu: '120', hesapAdi: 'Alıcılar', borc: kurFarki, alacak: 0 },
        { hesapKodu: '646', hesapAdi: 'Kambiyo Kârları', borc: 0, alacak: kurFarki }
      );
    } else {
      kurFarkiTuru = 'kambiyo_zarari';
      yevmiyeKaydi.push(
        { hesapKodu: '656', hesapAdi: 'Kambiyo Zararları', borc: kurFarki, alacak: 0 },
        { hesapKodu: '120', hesapAdi: 'Alıcılar', borc: 0, alacak: kurFarki }
      );
    }
  } else {
    if (degerlemeKuru > kayitKuru) {
      kurFarkiTuru = 'kambiyo_zarari';
      yevmiyeKaydi.push(
        { hesapKodu: '656', hesapAdi: 'Kambiyo Zararları', borc: kurFarki, alacak: 0 },
        { hesapKodu: '320', hesapAdi: 'Satıcılar', borc: 0, alacak: kurFarki }
      );
    } else {
      kurFarkiTuru = 'kambiyo_kari';
      yevmiyeKaydi.push(
        { hesapKodu: '320', hesapAdi: 'Satıcılar', borc: kurFarki, alacak: 0 },
        { hesapKodu: '646', hesapAdi: 'Kambiyo Kârları', borc: 0, alacak: kurFarki }
      );
    }
  }

  return {
    dovizTutar, dovizCinsi, kayitKuru, degerlemeKuru,
    kayitDegeri, degerlemeDegeri, kurFarki, kurFarkiTuru, yevmiyeKaydi
  };
}

interface YevmiyeKaydi {
  tarih: string;
  aciklama: string;
  satirlar: YevmiyeSatiri[];
  toplamBorc: number;
  toplamAlacak: number;
  dengeli: boolean;
}

export function formatYevmiyeKaydi(
  tarih: string,
  aciklama: string,
  satirlar: YevmiyeSatiri[]
): YevmiyeKaydi {
  const toplamBorc = round2(satirlar.reduce((sum, s) => sum + s.borc, 0));
  const toplamAlacak = round2(satirlar.reduce((sum, s) => sum + s.alacak, 0));

  return {
    tarih,
    aciklama,
    satirlar,
    toplamBorc,
    toplamAlacak,
    dengeli: Math.abs(toplamBorc - toplamAlacak) < 0.01
  };
}

export function yevmiyeToMarkdown(kayit: YevmiyeKaydi): string {
  let md = `**Yevmiye Kaydı** — ${kayit.tarih}\n`;
  md += `*${kayit.aciklama}*\n\n`;
  md += `| Hesap | Açıklama | Borç (₺) | Alacak (₺) |\n`;
  md += `|-------|----------|----------|------------|\n`;

  for (const satir of kayit.satirlar) {
    const borcStr = satir.borc > 0 ? formatTL(satir.borc) : '';
    const alacakStr = satir.alacak > 0 ? formatTL(satir.alacak) : '';
    md += `| ${satir.hesapKodu} | ${satir.hesapAdi} | ${borcStr} | ${alacakStr} |\n`;
  }

  md += `| | **TOPLAM** | **${formatTL(kayit.toplamBorc)}** | **${formatTL(kayit.toplamAlacak)}** |\n`;

  if (!kayit.dengeli) {
    md += `\n⚠️ **UYARI: Borç-Alacak dengesi tutmuyor!** Fark: ${formatTL(Math.abs(kayit.toplamBorc - kayit.toplamAlacak))}`;
  }

  return md;
}

interface StopajResult {
  brutTutar: number;
  stopajOrani: number;
  stopajTutari: number;
  kdvOrani: number;
  kdvTutari: number;
  kdvTevkifatOrani?: string;
  kdvTevkifatTutari?: number;
  odenecekTutar: number;
  yevmiyeKaydi: YevmiyeSatiri[];
}

export function hesaplaStopaj(
  brutTutar: number,
  gelirTuru: 'serbest_meslek' | 'kira' | 'royalty' | 'insaat' | 'diger',
  kdvOrani: number = 20,
  kdvTevkifatOrani?: string
): StopajResult {
  const stopajOranlari: Record<string, number> = {
    'serbest_meslek': 0.20,
    'kira': 0.20,
    'royalty': 0.17,
    'insaat': 0.05,
    'diger': 0.20
  };

  const stopajOrani = stopajOranlari[gelirTuru] || 0.20;
  const stopajTutari = round2(brutTutar * stopajOrani);
  const kdvTutari = round2(brutTutar * (kdvOrani / 100));

  let kdvTevkifatTutari = 0;
  let tahsilEdilecekKdv = kdvTutari;

  if (kdvTevkifatOrani) {
    const [pay, payda] = kdvTevkifatOrani.split('/').map(Number);
    kdvTevkifatTutari = round2(kdvTutari * (pay / payda));
    tahsilEdilecekKdv = round2(kdvTutari - kdvTevkifatTutari);
  }

  const odenecekTutar = round2(brutTutar + tahsilEdilecekKdv - stopajTutari);

  const yevmiyeKaydi: YevmiyeSatiri[] = [
    { hesapKodu: '770', hesapAdi: 'Genel Yönetim Giderleri', borc: brutTutar, alacak: 0 },
    { hesapKodu: '191', hesapAdi: 'İndirilecek KDV', borc: kdvTutari, alacak: 0 },
  ];

  if (kdvTevkifatTutari > 0) {
    yevmiyeKaydi.push(
      { hesapKodu: '360', hesapAdi: 'Ödenecek Vergi (KDV Tevkifat)', borc: 0, alacak: kdvTevkifatTutari }
    );
  }

  yevmiyeKaydi.push(
    { hesapKodu: '360', hesapAdi: 'Ödenecek Vergi (Stopaj)', borc: 0, alacak: stopajTutari },
    { hesapKodu: '320', hesapAdi: 'Satıcılar / Borçlar', borc: 0, alacak: odenecekTutar }
  );

  return {
    brutTutar, stopajOrani: stopajOrani * 100, stopajTutari,
    kdvOrani, kdvTutari,
    kdvTevkifatOrani, kdvTevkifatTutari: kdvTevkifatTutari || undefined,
    odenecekTutar, yevmiyeKaydi
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatTL(tutar: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(tutar) + ' ₺';
}
