import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  Trash2,
  Calculator,
  ArrowLeft,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  FileDown,
  Calendar,
  History,
  Settings,
  Plug,
  Play,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ParseDetail {
  file: string;
  status: "ok" | "error" | "duplicate";
  belgeNo?: string;
  kdv?: number;
  errors?: string[];
}

interface OranOzeti {
  kdv_orani: number;
  adet: number;
  matrah: string;
  kdv: string;
}

interface UploadResult {
  message: string;
  toplam: number;
  basarili: number;
  hatali: number;
  mukerrer: number;
  oranOzeti: OranOzeti[];
  detaylar: ParseDetail[];
}

interface Fatura {
  id: number;
  sira_no: number;
  fatura_tarihi: string;
  belge_no: string;
  satici_unvani: string;
  satici_vkn: string;
  belge_turu: string;
  matrah: string;
  kdv_orani: string;
  kdv_tutari: string;
  hesap_kodu: string;
  para_birimi: string;
  fatura_tipi_kodu?: string;
  tevkifat_orani?: string;
  tevkifat_tutari?: string;
  tevkifat_kodu?: string;
}

function formatTL(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrentDonem() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function EFatura() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [donem, setDonem] = useState(getCurrentDonem());
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("fatura_tarihi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showDetails, setShowDetails] = useState(false);
  const [detailFatura, setDetailFatura] = useState<Fatura | null>(null);
  const [activeTab, setActiveTab] = useState<"faturalar" | "entegrasyonlar">("faturalar");

  const [noAccess, setNoAccess] = useState(false);
  const [showDonemler, setShowDonemler] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Fetch dönem geçmişi
  const { data: donemlerData } = useQuery({
    queryKey: ["/api/efatura/donemler"],
    queryFn: async () => {
      const res = await fetch("/api/efatura/donemler", { credentials: "include" });
      if (!res.ok) return { donemler: [] };
      return res.json() as Promise<{ donemler: { donem: string; fatura_adedi: string; toplam_kdv: string }[] }>;
    },
    enabled: !!user,
  });

  // Fetch KDV listesi
  const { data: kdvData, isLoading: listLoading, refetch } = useQuery({
    queryKey: ["/api/efatura/kdv-listesi", donem],
    queryFn: async () => {
      const res = await fetch(`/api/efatura/kdv-listesi/${encodeURIComponent(donem)}`, { credentials: "include" });
      if (res.status === 403) { setNoAccess(true); return { donem, faturalar: [], ozet: [], toplam: 0 }; }
      if (!res.ok) throw new Error("KDV listesi yüklenemedi");
      setNoAccess(false);
      return res.json() as Promise<{ donem: string; faturalar: Fatura[]; ozet: OranOzeti[]; toplam: number }>;
    },
    enabled: !!user,
  });

  // Upload handler
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".xml"));
    if (xmlFiles.length === 0) {
      toast({ title: "Hata", description: "Sadece XML dosyaları kabul edilir", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("donem", donem);
    xmlFiles.forEach(f => formData.append("files", f));

    try {
      const res = await fetch("/api/efatura/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data: UploadResult = await res.json();
      setUploadResult(data);
      setShowDetails(true);
      refetch();
      toast({
        title: "Faturalar Yüklendi",
        description: `${data.basarili} başarılı, ${data.hatali} hata, ${data.mukerrer} mükerrer`,
      });
    } catch (err) {
      toast({ title: "Yükleme Hatası", description: "Dosyalar yüklenirken hata oluştu", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [donem, refetch, toast]);

  // Fatura silme
  const deleteFatura = async (id: number) => {
    if (!confirm("Bu faturayı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/efatura/fatura/${id}`, { method: "DELETE", credentials: "include" });
      refetch();
      qc.invalidateQueries({ queryKey: ["/api/efatura/donemler"] });
      toast({ title: "Silindi", description: "Fatura başarıyla silindi" });
    } catch { toast({ title: "Hata", description: "Silinemedi", variant: "destructive" }); }
  };

  const deleteDonem = async () => {
    if (!confirm(`${donem} dönemindeki TÜM faturaları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      const res = await fetch(`/api/efatura/donem/${encodeURIComponent(donem)}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      refetch();
      qc.invalidateQueries({ queryKey: ["/api/efatura/donemler"] });
      toast({ title: "Dönem Silindi", description: `${data.deleted} fatura silindi` });
    } catch { toast({ title: "Hata", description: "Dönem silinemedi", variant: "destructive" }); }
  };

  const deleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`${selectedRows.size} faturayı silmek istediğinize emin misiniz?`)) return;
    for (const id of selectedRows) {
      await fetch(`/api/efatura/fatura/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
    }
    setSelectedRows(new Set());
    refetch();
    qc.invalidateQueries({ queryKey: ["/api/efatura/donemler"] });
    toast({ title: "Silindi", description: `${selectedRows.size} fatura silindi` });
  };

  // Drag & drop
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }, []);
  const onDragLeave = useCallback(() => setDragActive(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  // Sorting
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    sortField === field
      ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : null
  );

  // Filtered & sorted data
  const faturalar = (kdvData?.faturalar || [])
    .filter(f => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return f.belge_no.toLowerCase().includes(s) ||
        f.satici_unvani.toLowerCase().includes(s) ||
        f.satici_vkn.includes(s);
    })
    .sort((a: any, b: any) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv), "tr");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const ozet = kdvData?.ozet || [];
  const genelMatrah = ozet.reduce((s, o) => s + Number(o.matrah), 0);
  const genelKDV = ozet.reduce((s, o) => s + Number(o.kdv), 0);

  if (!user) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Calculator className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Giriş Gerekli</h2>
          <p className="text-muted-foreground mb-4">e-Fatura modülünü kullanmak için giriş yapmalısınız.</p>
          <Link href="/login"><Button>Giriş Yap</Button></Link>
        </Card>
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Calculator className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Finn Planı Gerekli</h2>
          <p className="text-muted-foreground mb-4">
            e-Fatura & KDV modülünü kullanmak için <strong>Finn (Muhasebe Asistanı)</strong> planına sahip olmalısınız.
          </p>
          <Link href="/pricing"><Button className="bg-emerald-600 hover:bg-emerald-700">Planları İncele</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Finn'e Dön</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Calculator className="w-6 h-6 text-emerald-500" />
                e-Fatura & KDV Yönetimi
              </h1>
              <p className="text-sm text-muted-foreground">GİB e-Fatura XML dosyalarını yükleyin, İndirilecek KDV Listesi oluşturun</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Dönem:</label>
            <Input
              value={donem}
              onChange={e => setDonem(e.target.value)}
              placeholder="AA/YYYY"
              className="w-28 text-center font-mono"
            />
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowDonemler(!showDonemler)}>
                <History className="w-3.5 h-3.5 mr-1" /> Geçmiş
              </Button>
              {showDonemler && donemlerData?.donemler && donemlerData.donemler.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                  {donemlerData.donemler.map(d => (
                    <button
                      key={d.donem}
                      onClick={() => { setDonem(d.donem); setShowDonemler(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all hover:bg-muted/50 ${donem === d.donem ? "bg-emerald-50 text-emerald-700" : ""}`}
                    >
                      <span className="font-mono font-medium">{d.donem}</span>
                      <span className="text-muted-foreground">{d.fatura_adedi} fatura | {formatTL(d.toplam_kdv)} TL KDV</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Yenile
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab("faturalar")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "faturalar" ? "border-emerald-500 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Faturalar & KDV
          </button>
          <button
            onClick={() => setActiveTab("entegrasyonlar")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "entegrasyonlar" ? "border-blue-500 text-blue-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Plug className="w-3.5 h-3.5 inline mr-1.5" />
            Entegrasyonlar
          </button>
        </div>

        {activeTab === "faturalar" && (<>
        {/* Upload Zone */}
        <Card className="mb-6 overflow-hidden">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-sm font-medium text-emerald-700">Faturalar işleniyor...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    XML Faturalarını Sürükle & Bırak
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    veya tıklayarak dosya seçin (200 dosyaya kadar)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> UBL-TR XML</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Otomatik parse</span>
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Mükerrer kontrolü</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Upload Result */}
        <AnimatePresence>
          {uploadResult && showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="mb-6 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Yükleme Sonucu
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{uploadResult.toplam}</p>
                    <p className="text-xs text-muted-foreground">Toplam Dosya</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{uploadResult.basarili}</p>
                    <p className="text-xs text-emerald-600">Başarılı</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{uploadResult.mukerrer}</p>
                    <p className="text-xs text-amber-600">Mükerrer</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{uploadResult.hatali}</p>
                    <p className="text-xs text-red-600">Hatalı</p>
                  </div>
                </div>
                {uploadResult.detaylar.some(d => d.status !== "ok") && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {uploadResult.detaylar.filter(d => d.status !== "ok").map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-slate-50">
                        {d.status === "duplicate" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        )}
                        <span className="font-mono truncate">{d.file}</span>
                        <span className="text-muted-foreground">
                          {d.status === "duplicate" ? `Mükerrer: ${d.belgeNo}` : d.errors?.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KDV Summary Cards */}
        {ozet.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {ozet.map(o => (
              <Card key={o.kdv_orani} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    %{o.kdv_orani} KDV
                  </Badge>
                  <span className="text-xs text-muted-foreground">{o.adet} fatura</span>
                </div>
                <p className="text-xs text-muted-foreground">Matrah</p>
                <p className="text-sm font-semibold">{formatTL(o.matrah)} TL</p>
                <p className="text-xs text-muted-foreground mt-1">KDV Tutarı</p>
                <p className="text-sm font-bold text-emerald-600">{formatTL(o.kdv)} TL</p>
              </Card>
            ))}
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-emerald-600 text-xs">TOPLAM</Badge>
                <span className="text-xs text-muted-foreground">{kdvData?.toplam || 0} fatura</span>
              </div>
              <p className="text-xs text-muted-foreground">Genel Matrah</p>
              <p className="text-sm font-semibold">{formatTL(genelMatrah)} TL</p>
              <p className="text-xs text-muted-foreground mt-1">Genel KDV</p>
              <p className="text-lg font-bold text-emerald-700">{formatTL(genelKDV)} TL</p>
            </Card>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Belge no, unvan veya VKN ara..."
                className="pl-8 w-72 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedRows.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> {selectedRows.size} Seçili Sil
              </Button>
            )}
            {faturalar.length > 0 && (
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={deleteDonem}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Dönemi Temizle
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/efatura/kdv-listesi/${encodeURIComponent(donem)}/excel`;
                link.download = `KDV_Listesi_${donem.replace(/\//g, "-")}.xlsx`;
                link.click();
              }}
              disabled={!faturalar.length}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/efatura/kdv-listesi/${encodeURIComponent(donem)}/pdf`;
                link.download = `KDV_Listesi_${donem.replace(/\//g, "-")}.pdf`;
                link.click();
              }}
              disabled={!faturalar.length}
            >
              <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/efatura/kdv-listesi/${encodeURIComponent(donem)}`, "_blank")}
              disabled={!faturalar.length}
            >
              <Download className="w-3.5 h-3.5 mr-1" /> JSON
            </Button>
          </div>
        </div>

        {/* Invoice Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-left">
                  <th className="px-2 py-2.5 w-8">
                    <input type="checkbox" className="rounded"
                      checked={faturalar.length > 0 && selectedRows.size === faturalar.length}
                      onChange={e => {
                        if (e.target.checked) setSelectedRows(new Set(faturalar.map((f: Fatura) => f.id)));
                        else setSelectedRows(new Set());
                      }}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("sira_no")}>
                    # <SortIcon field="sira_no" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("fatura_tarihi")}>
                    Tarih <SortIcon field="fatura_tarihi" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("belge_no")}>
                    Belge No <SortIcon field="belge_no" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer min-w-[200px]" onClick={() => toggleSort("satici_unvani")}>
                    Satıcı Unvanı <SortIcon field="satici_unvani" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">VKN</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Tür</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort("matrah")}>
                    Matrah (TL) <SortIcon field="matrah" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground text-center">KDV %</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort("kdv_tutari")}>
                    KDV (TL) <SortIcon field="kdv_tutari" />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Hesap</th>
                  <th className="px-2 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                      <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                    </td>
                  </tr>
                ) : faturalar.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center">
                      <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {searchTerm ? "Aramayla eşleşen fatura bulunamadı" : "Bu dönemde henüz fatura yok"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {!searchTerm && "Yukarıdan XML dosyalarınızı yükleyin"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  faturalar.map((f, i) => (
                    <tr key={f.id} onClick={() => setDetailFatura(f)} className={`border-b hover:bg-slate-50/50 transition-colors cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${detailFatura?.id === f.id ? "ring-1 ring-emerald-400 bg-emerald-50/30" : ""}`}>
                      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded"
                          checked={selectedRows.has(f.id)}
                          onChange={e => {
                            const next = new Set(selectedRows);
                            if (e.target.checked) next.add(f.id); else next.delete(f.id);
                            setSelectedRows(next);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.sira_no}</td>
                      <td className="px-3 py-2 text-xs font-mono">
                        {f.fatura_tarihi ? new Date(f.fatura_tarihi).toLocaleDateString("tr-TR") : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-medium">{f.belge_no}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[250px]" title={f.satici_unvani}>{f.satici_unvani}</td>
                      <td className="px-3 py-2 text-xs font-mono">{f.satici_vkn}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">{f.belge_turu}</Badge>
                        {f.tevkifat_tutari && Number(f.tevkifat_tutari) > 0 && (
                          <Badge className="ml-1 text-[9px] bg-amber-100 text-amber-700 border-amber-300" variant="outline">
                            TVK {f.tevkifat_orani ? `${f.tevkifat_orani}%` : ""} {formatTL(f.tevkifat_tutari)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{formatTL(f.matrah)}</td>
                      <td className="px-3 py-2 text-xs text-center">
                        <Badge variant="secondary" className="text-[10px]">%{f.kdv_orani}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-semibold text-emerald-700">{formatTL(f.kdv_tutari)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{f.hesap_kodu}</td>
                      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteFatura(f.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Sil">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {faturalar.length > 0 && (
                <tfoot>
                  <tr className="bg-emerald-50 font-semibold border-t-2 border-emerald-200">
                    <td colSpan={7} className="px-3 py-2.5 text-xs text-right">TOPLAM ({faturalar.length} fatura):</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono">{formatTL(genelMatrah)}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono text-emerald-700">{formatTL(genelKDV)}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Fatura Detay Paneli */}
          <AnimatePresence>
            {detailFatura && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t bg-slate-50 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Fatura Detayı — {detailFatura.belge_no}
                    </h3>
                    <button onClick={() => setDetailFatura(null)} className="text-muted-foreground hover:text-foreground">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Satıcı Unvanı</p>
                      <p className="text-sm font-medium">{detailFatura.satici_unvani || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">VKN / TCKN</p>
                      <p className="text-sm font-mono">{detailFatura.satici_vkn || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fatura Tarihi</p>
                      <p className="text-sm">{detailFatura.fatura_tarihi ? new Date(detailFatura.fatura_tarihi).toLocaleDateString("tr-TR") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Belge No</p>
                      <p className="text-sm font-mono">{detailFatura.belge_no}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Belge Türü</p>
                      <p className="text-sm">{detailFatura.belge_turu}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fatura Tipi</p>
                      <p className="text-sm">{detailFatura.fatura_tipi_kodu || "SATIS"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Para Birimi</p>
                      <p className="text-sm">{detailFatura.para_birimi || "TRY"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hesap Kodu</p>
                      <p className="text-sm font-mono">{detailFatura.hesap_kodu}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t">
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-[10px] text-muted-foreground uppercase">Matrah</p>
                      <p className="text-lg font-bold">{formatTL(detailFatura.matrah)} TL</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-[10px] text-muted-foreground uppercase">KDV Oranı</p>
                      <p className="text-lg font-bold">%{detailFatura.kdv_orani}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <p className="text-[10px] text-emerald-600 uppercase">KDV Tutarı</p>
                      <p className="text-lg font-bold text-emerald-700">{formatTL(detailFatura.kdv_tutari)} TL</p>
                    </div>
                  </div>
                  {detailFatura.tevkifat_tutari && Number(detailFatura.tevkifat_tutari) > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-[10px] text-amber-600 uppercase">Tevkifat Oranı</p>
                        <p className="text-lg font-bold text-amber-700">%{detailFatura.tevkifat_orani}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-[10px] text-amber-600 uppercase">Tevkifat Tutarı</p>
                        <p className="text-lg font-bold text-amber-700">{formatTL(detailFatura.tevkifat_tutari)} TL</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-[10px] text-amber-600 uppercase">Tevkifat Kodu</p>
                        <p className="text-lg font-bold text-amber-700">{detailFatura.tevkifat_kodu || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Beyanname Hazırlık Raporu */}
        <BeyannameRaporu donem={donem} faturalar={faturalar} />
        </>)}

        {activeTab === "entegrasyonlar" && (
          <div className="space-y-6">
            {/* GİB Entegrasyon */}
            <GibEntegrasyonPanel donem={donem} onSyncComplete={() => { setActiveTab("faturalar"); refetch(); }} />

            {/* ERP Entegrasyon */}
            <ErpEntegrasyonPanel donem={donem} onSyncComplete={() => { setActiveTab("faturalar"); refetch(); }} />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Hesap Kodları: 191.01 = %1 KDV, 191.02 = %10 KDV, 191.03 = %20 KDV</span>
          </div>
          <span>Finn Muhasebe Asistanı - e-Fatura Modülü</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BEYANNAME HAZIRLIK RAPORU COMPONENTI
// ============================================================

function BeyannameRaporu({ donem, faturalar }: { donem: string; faturalar: Fatura[] }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/efatura/beyanname", donem],
    queryFn: async () => {
      const res = await fetch(`/api/efatura/beyanname/${encodeURIComponent(donem)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open && faturalar.length > 0,
  });

  if (faturalar.length === 0) return null;

  return (
    <Card className="mt-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold">KDV Beyanname Hazırlık Raporu</span>
          <Badge variant="outline" className="text-[10px]">{donem}</Badge>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                <p className="text-xs text-muted-foreground">Rapor hazırlanıyor...</p>
              </div>
            ) : data ? (
              <div className="p-4 space-y-4">
                {/* Özet Kartları */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Toplam Fatura</p>
                    <p className="text-xl font-bold text-blue-700">{data.toplamFatura}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">Toplam Matrah</p>
                    <p className="text-xl font-bold">{formatTL(data.toplamMatrah)} TL</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-medium">İndirilecek KDV</p>
                    <p className="text-xl font-bold text-emerald-700">{formatTL(data.toplamIndirilecekKdv)} TL</p>
                  </div>
                  {data.toplamTevkifat > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-600 font-medium">Tevkifat KDV ({data.tevkifatliFaturaAdedi} fatura)</p>
                      <p className="text-xl font-bold text-amber-700">{formatTL(data.toplamTevkifat)} TL</p>
                    </div>
                  )}
                </div>

                {/* Oran Bazlı Dağılım */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">İNDİRİLECEK KDV DAĞILIMI</h4>
                  <div className="space-y-1">
                    {(data.indirilecekKdvOzet || []).map((o: any) => {
                      const hesap = Number(o.kdv_orani) === 1 ? "191.01" : Number(o.kdv_orani) === 10 ? "191.02" : "191.03";
                      return (
                        <div key={o.kdv_orani} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">%{o.kdv_orani}</Badge>
                            <span className="font-mono text-muted-foreground">{hesap}</span>
                            <span className="text-muted-foreground">{o.fatura_adedi} fatura</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span>Matrah: <strong>{formatTL(o.toplam_matrah)}</strong></span>
                            <span className="text-emerald-600 font-semibold">KDV: {formatTL(o.toplam_kdv)} TL</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Yevmiye Kayıt Önerileri */}
                {data.yevmiyeOnerileri && data.yevmiyeOnerileri.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">YEVMİYE KAYIT ÖNERİLERİ</h4>
                    {data.yevmiyeOnerileri.map((y: any, yi: number) => (
                      <div key={yi} className="mb-3 border rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1.5 text-xs font-medium">{y.aciklama}</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b">
                              <th className="px-3 py-1.5 text-left font-medium">Hesap Kodu</th>
                              <th className="px-3 py-1.5 text-left font-medium">Hesap Adı</th>
                              <th className="px-3 py-1.5 text-right font-medium">Borç</th>
                              <th className="px-3 py-1.5 text-right font-medium">Alacak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {y.satirlar.map((s: any, si: number) => (
                              <tr key={si} className="border-b last:border-0">
                                <td className="px-3 py-1.5 font-mono">{s.hesapKodu}</td>
                                <td className="px-3 py-1.5">{s.hesapAdi}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{s.borc > 0 ? formatTL(s.borc) : ""}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{s.alacak > 0 ? formatTL(s.alacak) : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  * Bu rapor bilgi amaçlıdır. Kesinleşmiş beyanname için mali müşavirinize danışınız.
                  Hesaplanan KDV bilgisi satış faturalarınızdan ayrıca hesaplanmalıdır.
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================
// GİB ENTEGRASYON PANELİ
// ============================================================

function GibEntegrasyonPanel({ donem, onSyncComplete }: { donem: string; onSyncComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("orkestra");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: providers } = useQuery({
    queryKey: ["/api/efatura/gib/providers"],
    queryFn: async () => {
      const res = await fetch("/api/efatura/gib/providers", { credentials: "include" });
      if (!res.ok) return { providers: {} };
      return res.json();
    },
    enabled: open,
  });

  const providerList = providers?.providers || {};
  const currentProvider = providerList[provider] || {};

  // Dönemden tarih aralığı oluştur
  useState(() => {
    const parts = donem.split("/");
    if (parts.length === 2) {
      const m = parts[0];
      const y = parts[1];
      setStartDate(`${y}-${m}-01`);
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
    }
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/efatura/gib/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, apiUrl, apiKey }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Bağlantı hatası" });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!apiUrl || !apiKey) {
      toast({ title: "Eksik Bilgi", description: "API URL ve API Key gerekli", variant: "destructive" });
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/efatura/gib/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, apiUrl, apiKey, startDate, endDate, donem }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.newInvoices > 0) onSyncComplete();
      toast({ title: "Senkronizasyon Tamamlandı", description: `${data.fetched} fatura çekildi, ${data.newInvoices} yeni eklendi` });
    } catch {
      toast({ title: "Hata", description: "Senkronizasyon başarısız", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="mt-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold">GİB Entegrasyon Ayarları</span>
          <Badge variant="outline" className="text-[10px]">Orkestra / Foriba / QNB</Badge>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                e-Fatura entegratörünüzün API bilgilerini girerek faturalarınızı otomatik çekebilirsiniz.
                Manuel XML yüklemeye gerek kalmaz.
              </p>

              {/* Provider Seçimi */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(providerList).map(([key, val]: [string, any]) => (
                  <button
                    key={key}
                    onClick={() => { setProvider(key); setApiUrl(val.defaultUrl || ""); setTestResult(null); }}
                    className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                      provider === key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {val.name}
                  </button>
                ))}
              </div>

              {/* API Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">API URL</label>
                  <Input
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    placeholder={currentProvider.defaultUrl || "https://api.example.com"}
                    className="mt-1 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">API Key / Token</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="API anahtarınız"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              {/* Tarih Aralığı */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Başlangıç Tarihi</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bitiş Tarihi</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 text-sm" />
                </div>
              </div>

              {currentProvider.docs && (
                <p className="text-[10px] text-muted-foreground bg-blue-50 rounded p-2">
                  <Info className="w-3 h-3 inline mr-1" />
                  {currentProvider.docs}
                </p>
              )}

              {/* Butonlar */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !apiUrl}>
                  {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Settings className="w-3.5 h-3.5 mr-1" />}
                  Bağlantı Test Et
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSync} disabled={syncing || !apiUrl || !apiKey}>
                  {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  Faturaları Çek
                </Button>
              </div>

              {/* Test Sonucu */}
              {testResult && (
                <div className={`flex items-center gap-2 text-xs p-2 rounded ${testResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {testResult.message}
                </div>
              )}

              {/* Sync Sonucu */}
              {syncResult && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                  <p><strong>Çekilen:</strong> {syncResult.fetched} fatura</p>
                  <p><strong>Yeni eklenen:</strong> {syncResult.newInvoices}</p>
                  <p><strong>Mükerrer:</strong> {syncResult.duplicates}</p>
                  {syncResult.errors?.length > 0 && (
                    <p className="text-red-600"><strong>Hatalar:</strong> {syncResult.errors.join(", ")}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================
// ERP ENTEGRASYON PANELİ
// ============================================================

function ErpEntegrasyonPanel({ donem, onSyncComplete }: { donem: string; onSyncComplete: () => void }) {
  const [provider, setProvider] = useState("parasut");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [dbHost, setDbHost] = useState("");
  const [dbPort, setDbPort] = useState("5432");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPw, setDbPw] = useState("");
  const [dbQuery, setDbQuery] = useState("SELECT invoice_no, issue_date, vendor_name, vendor_vkn, net_amount as matrah, vat_rate as kdv_orani, vat_amount as kdv_tutari FROM invoices WHERE issue_date BETWEEN $1 AND $2");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success:boolean;message:string}|null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: providers } = useQuery({
    queryKey: ["/api/efatura/erp/providers"],
    queryFn: async () => { const r = await fetch("/api/efatura/erp/providers",{credentials:"include"}); return r.ok ? r.json() : {providers:{}}; },
  });
  const providerList: Record<string,any> = providers?.providers || {};
  const cp = providerList[provider] || {};
  const fields: string[] = cp.fields || [];
  const creds = () => ({provider,apiUrl,apiKey,clientId,clientSecret,companyId,username,password:pw,dbType:"postgresql",dbHost,dbPort:parseInt(dbPort),dbName,dbUser,dbPassword:dbPw,dbQuery});

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try { const r = await fetch("/api/efatura/erp/test",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(creds())}); setTestResult(await r.json()); }
    catch { setTestResult({success:false,message:"Bağlantı hatası"}); }
    finally { setTesting(false); }
  };
  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try { const r = await fetch("/api/efatura/erp/sync",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({...creds(),startDate,endDate,donem})}); const d = await r.json(); setSyncResult(d); if(d.imported>0) onSyncComplete(); toast({title:"ERP Sync",description:`${d.fetched} fatura, ${d.imported} eklendi`}); }
    catch { toast({title:"Hata",description:"Sync başarısız",variant:"destructive"}); }
    finally { setSyncing(false); }
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-violet-600" /><span className="text-sm font-semibold">ERP / Muhasebe Yazılımı & Veritabanı Bağlantısı</span></div>
        <p className="text-xs text-muted-foreground mt-1">Muhasebe yazılımınızdan veya kendi veritabanınızdan fatura verilerini çekin</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(providerList).map(([k,v]:[string,any]) => (
            <button key={k} onClick={() => {setProvider(k);setTestResult(null);setSyncResult(null);}} className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${provider===k?"border-violet-500 bg-violet-50 text-violet-700":"border-slate-200 hover:border-slate-300"}`}>
              <span className="text-lg block mb-0.5">{v.icon}</span>{v.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.includes("apiUrl") && <div><label className="text-xs font-medium text-muted-foreground">API URL</label><Input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="https://..." className="mt-1 text-sm font-mono" /></div>}
          {fields.includes("apiKey") && <div><label className="text-xs font-medium text-muted-foreground">API Key</label><Input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("clientId") && <div><label className="text-xs font-medium text-muted-foreground">Client ID</label><Input value={clientId} onChange={e=>setClientId(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("clientSecret") && <div><label className="text-xs font-medium text-muted-foreground">Client Secret</label><Input type="password" value={clientSecret} onChange={e=>setClientSecret(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("companyId") && <div><label className="text-xs font-medium text-muted-foreground">Company ID</label><Input value={companyId} onChange={e=>setCompanyId(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("username") && <div><label className="text-xs font-medium text-muted-foreground">Kullanıcı Adı</label><Input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("password") && <div><label className="text-xs font-medium text-muted-foreground">Şifre</label><Input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="mt-1 text-sm" /></div>}
          {fields.includes("dbHost") && (<>
            <div><label className="text-xs font-medium text-muted-foreground">DB Host</label><Input value={dbHost} onChange={e=>setDbHost(e.target.value)} placeholder="localhost" className="mt-1 text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">DB Port</label><Input value={dbPort} onChange={e=>setDbPort(e.target.value)} className="mt-1 text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">DB Adı</label><Input value={dbName} onChange={e=>setDbName(e.target.value)} className="mt-1 text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">DB Kullanıcı</label><Input value={dbUser} onChange={e=>setDbUser(e.target.value)} className="mt-1 text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">DB Şifre</label><Input type="password" value={dbPw} onChange={e=>setDbPw(e.target.value)} className="mt-1 text-sm" /></div>
          </>)}
          {fields.includes("dbQuery") && (
            <div className="md:col-span-2"><label className="text-xs font-medium text-muted-foreground">SQL Sorgusu ($1=başlangıç, $2=bitiş)</label>
              <textarea value={dbQuery} onChange={e=>setDbQuery(e.target.value)} rows={3} className="mt-1 w-full text-xs font-mono p-2 border rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-violet-400" /></div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground">Başlangıç</label><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-1 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Bitiş</label><Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-1 text-sm" /></div>
        </div>
        {cp.docs && <p className="text-[10px] text-muted-foreground bg-violet-50 rounded p-2"><Info className="w-3 h-3 inline mr-1" />{cp.docs}</p>}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>{testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Settings className="w-3.5 h-3.5 mr-1" />} Test Et</Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={handleSync} disabled={syncing}>{syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />} Faturaları Çek</Button>
        </div>
        {testResult && <div className={`flex items-center gap-2 text-xs p-2 rounded ${testResult.success?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {testResult.message}</div>}
        {syncResult && <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1"><p><strong>Çekilen:</strong> {syncResult.fetched}</p><p><strong>Eklenen:</strong> {syncResult.imported}</p>{syncResult.errors?.length>0 && <p className="text-red-600">{syncResult.errors.join(", ")}</p>}</div>}
      </div>
    </Card>
  );
}
