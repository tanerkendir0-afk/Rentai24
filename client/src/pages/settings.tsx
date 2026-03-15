import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Building2,
  Shield,
  CreditCard,
  Bot,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Link2,
  Sparkles,
  ShoppingCart,
  Users,
  Plus,
  Trash2,
  Pencil,
  Phone,
  Briefcase,
  Bell,
  Package,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Smartphone,
  Copy,
  ExternalLink,
  Zap,
  Share2,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

interface Rental {
  id: number;
  agentType: string;
  agentName: string;
  plan: string;
  status: string;
  messagesUsed: number;
  messagesLimit: number;
}

interface TeamMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  position: string | null;
  department: string | null;
  skills: string | null;
  responsibilities: string | null;
  phone: string | null;
  createdAt: string;
}

interface SocialAccount {
  id: number;
  userId: number;
  platform: string;
  username: string;
  profileUrl: string | null;
  accessToken: string | null;
  status: string;
  connectedAt: string;
}

interface ShippingProvider {
  id: number;
  userId: number;
  provider: string;
  apiKey: string;
  customerCode: string | null;
  username: string | null;
  password: string | null;
  accountNumber: string | null;
  siteId: string | null;
  status: string;
  createdAt: string;
}

function CrmDocumentsSection() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/crm-documents"],
  });

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  };

  const isAllowedFile = (file: File): boolean => {
    const allowedMimeTypes = [
      "application/pdf", "text/plain", "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (file.type && allowedMimeTypes.includes(file.type)) return true;

    const allowedExtensions = ["pdf", "txt", "csv", "xlsx", "xls", "doc", "docx"];
    const ext = getFileExtension(file.name);
    return allowedExtensions.includes(ext);
  };

  const isTextFile = (file: File): boolean => {
    const textMimeTypes = ["text/plain", "text/csv"];
    if (file.type && textMimeTypes.includes(file.type)) return true;
    const textExtensions = ["txt", "csv"];
    return textExtensions.includes(getFileExtension(file.name));
  };

  const resolveFileType = (file: File): string => {
    const extMap: Record<string, string> = {
      pdf: "application/pdf",
      txt: "text/plain",
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
    };
    const ext = getFileExtension(file.name);
    return extMap[ext] || file.type || "application/octet-stream";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Dosya Boyutu Aşıldı", description: "Maksimum 5MB yükleyebilirsiniz.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    if (!isAllowedFile(file)) {
      const ext = getFileExtension(file.name);
      toast({
        title: "Desteklenmeyen Format",
        description: `"${ext || "bilinmeyen"}" formatı desteklenmiyor. PDF, TXT, CSV, Excel (.xlsx/.xls) veya Word (.doc/.docx) dosyası yükleyin.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onerror = () => {
        toast({ title: "Hata", description: "Dosya okunamadı. Lütfen tekrar deneyin.", variant: "destructive" });
        setUploading(false);
        e.target.value = "";
      };
      reader.onload = async () => {
        try {
          const content = reader.result as string;
          const fileType = resolveFileType(file);
          const res = await apiRequest("POST", "/api/crm-documents", {
            fileName: `${Date.now()}_${file.name}`,
            originalName: file.name,
            fileType,
            fileSize: file.size,
            content,
            encoding: isTextFile(file) ? "text" : "base64",
          });
          if (res.ok) {
            toast({ title: "Yüklendi", description: `${file.name} başarıyla yüklendi.` });
            queryClient.invalidateQueries({ queryKey: ["/api/crm-documents"] });
          } else {
            toast({ title: "Hata", description: "Dosya yüklenirken sunucu hatası oluştu.", variant: "destructive" });
          }
        } catch (err) {
          toast({ title: "Hata", description: "Dosya yüklenirken bir hata oluştu.", variant: "destructive" });
        }
        setUploading(false);
        e.target.value = "";
      };
      if (isTextFile(file)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err) {
      toast({ title: "Hata", description: "Dosya yüklenirken bir hata oluştu.", variant: "destructive" });
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      const res = await apiRequest("DELETE", `/api/crm-documents/${id}`);
      if (res.ok) {
        toast({ title: "Silindi", description: `${name} silindi.` });
        queryClient.invalidateQueries({ queryKey: ["/api/crm-documents"] });
      }
    } catch (err) {
      toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-crm-documents">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-foreground">CRM Dokuman Yonetimi</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Musteri listeleri, satis raporlari ve CRM verilerinizi yukleyin. Ajanlariniz bu dokumanlara erisebilir.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer" data-testid="button-upload-crm-document">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt,.csv,.xlsx,.xls,.doc,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,*/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-400/50 hover:border-blue-400 hover:bg-blue-500/5 transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-blue-400" />}
              <span className="text-sm">{uploading ? "Yukleniyor..." : "Dokuman Yukle"}</span>
            </div>
          </label>
          <span className="text-xs text-muted-foreground">PDF, TXT, CSV, Excel, Word — Maks. 5MB</span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henuz dokuman yuklenmemis</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                data-testid={`crm-document-${doc.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(doc.fileSize)} — {new Date(doc.uploadedAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id, doc.originalName)}
                  className="text-red-400 hover:text-red-300 flex-shrink-0"
                  data-testid={`button-delete-crm-document-${doc.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LanguagePreferenceCard() {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation("common");
  const { toast } = useToast();

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    toast({
      title: t("language.saved"),
      description: t("language.savedDesc"),
    });
  };

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-language">
      <div className="flex items-center gap-2 mb-5">
        <Languages className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-foreground">{t("language.preference")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("language.preferenceDesc")}</p>
      <div className="flex gap-3">
        <Button
          variant={language === "en" ? "default" : "outline"}
          className={language === "en" ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""}
          onClick={() => handleLanguageChange("en")}
          data-testid="button-language-en"
        >
          {t("language.english")}
        </Button>
        <Button
          variant={language === "tr" ? "default" : "outline"}
          className={language === "tr" ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""}
          onClick={() => handleLanguageChange("tr")}
          data-testid="button-language-tr"
        >
          {t("language.turkish")}
        </Button>
      </div>
    </Card>
  );
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [gmailReconnecting, setGmailReconnecting] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [appPasswordForm, setAppPasswordForm] = useState({ gmailAddress: "", gmailAppPassword: "" });
  const [appPasswordSaving, setAppPasswordSaving] = useState(false);
  const [showAppPass, setShowAppPass] = useState(false);


  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", position: "", department: "", skills: "", responsibilities: "", phone: "" });

  const [showAddSocial, setShowAddSocial] = useState(false);
  const [socialForm, setSocialForm] = useState({ platform: "", username: "", profileUrl: "", accountType: "personal" as "personal" | "business", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" });

  const [showAddShipping, setShowAddShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
  const [showShippingApiKey, setShowShippingApiKey] = useState(false);

  const [showWhatsappSetup, setShowWhatsappSetup] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({ phoneNumberId: "", businessAccountId: "", accessToken: "", verifyToken: "", displayName: "" });
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTesting, setWhatsappTesting] = useState(false);

  const [editingSecretId, setEditingSecretId] = useState<number | null>(null);
  const [secretForm, setSecretForm] = useState<Record<string, string>>({});
  const [secretSaving, setSecretSaving] = useState(false);
  const [visibleSecretFields, setVisibleSecretFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setCompany(user.company || "");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  const { data: rentals } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
  });

  const { data: emailStatus } = useQuery<{ provider: string; address: string | null; connected: boolean; canRead?: boolean; canSend?: boolean }>({
    queryKey: ["/api/email-status"],
    enabled: !!user,
  });

  const { data: subscriptionData } = useQuery<{ subscription: any }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: !!user,
  });

  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/image-credits"],
    enabled: !!user,
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
    enabled: !!user,
  });

  const { data: gmailSettings } = useQuery<{ gmailAddress: string | null; hasOAuth: boolean; hasAppPassword: boolean }>({
    queryKey: ["/api/settings/gmail"],
    enabled: !!user,
  });

  const { data: socialAccountsData, isLoading: socialLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social-accounts"],
    enabled: !!user,
  });

  const { data: shippingProvidersData, isLoading: shippingLoading } = useQuery<ShippingProvider[]>({
    queryKey: ["/api/shipping-providers"],
    enabled: !!user,
  });

  const { data: whatsappData, isLoading: whatsappLoading } = useQuery<{
    connected: boolean;
    phoneNumberId?: string;
    businessAccountId?: string;
    displayName?: string;
    hasAccessToken?: boolean;
    hasVerifyToken?: boolean;
    status?: string;
  }>({
    queryKey: ["/api/whatsapp/config"],
    enabled: !!user,
  });

  const { data: creditPrices } = useQuery<{ id: string; credits: number; amount: number; currency: string }[]>({
    queryKey: ["/api/image-credits/prices"],
    enabled: !!user,
  });

  const [selectedCreditPkg, setSelectedCreditPkg] = useState<string | null>(null);
  const [creditCard, setCreditCard] = useState({ number: "", expiry: "", cvc: "" });
  const [creditPurchasing, setCreditPurchasing] = useState(false);

  const buyCredits = async () => {
    if (!selectedCreditPkg || !creditCard.number || !creditCard.expiry || !creditCard.cvc) return;
    setCreditPurchasing(true);
    try {
      const res = await apiRequest("POST", "/api/test-checkout/credits", {
        packageId: selectedCreditPkg,
        cardNumber: creditCard.number.replace(/\s/g, ""),
        expiry: creditCard.expiry,
        cvc: creditCard.cvc,
      });
      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/image-credits"] });
        setSelectedCreditPkg(null);
        setCreditCard({ number: "", expiry: "", cvc: "" });
        toast({ title: "Credits purchased!", description: data.message });
      }
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message || "Failed to purchase credits", variant: "destructive" });
    } finally {
      setCreditPurchasing(false);
    }
  };

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName: string; company: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to change password", variant: "destructive" });
    },
  });

  const resetMemberForm = () => {
    setMemberForm({ name: "", email: "", position: "", department: "", skills: "", responsibilities: "", phone: "" });
    setEditingMember(null);
    setShowAddMember(false);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    try {
      if (editingMember) {
        await apiRequest("PATCH", `/api/team-members/${editingMember.id}`, memberForm);
        toast({ title: "Member updated", description: `${memberForm.name} has been updated.` });
      } else {
        await apiRequest("POST", "/api/team-members", memberForm);
        toast({ title: "Member added", description: `${memberForm.name} has been added to your team.` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      resetMemberForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save team member", variant: "destructive" });
    }
  };

  const handleDeleteMember = async (id: number, name: string) => {
    try {
      await apiRequest("DELETE", `/api/team-members/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Member removed", description: `${name} has been removed from your team.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove team member", variant: "destructive" });
    }
  };

  const handleAddSocialAccount = async () => {
    if (!socialForm.platform || !socialForm.username.trim()) {
      toast({ title: "Error", description: "Platform and username are required", variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        platform: socialForm.platform,
        username: socialForm.username.trim().replace(/^@/, ""),
        profileUrl: socialForm.profileUrl.trim() || null,
        accountType: socialForm.accountType,
      };
      if (socialForm.accountType === "business") {
        if (socialForm.apiKey.trim()) payload.apiKey = socialForm.apiKey.trim();
        if (socialForm.apiSecret.trim()) payload.apiSecret = socialForm.apiSecret.trim();
        if (socialForm.accessToken.trim()) payload.accessToken = socialForm.accessToken.trim();
        if (socialForm.accessTokenSecret.trim()) payload.accessTokenSecret = socialForm.accessTokenSecret.trim();
        if (socialForm.pageId.trim()) payload.pageId = socialForm.pageId.trim();
        if (socialForm.businessAccountId.trim()) payload.businessAccountId = socialForm.businessAccountId.trim();
      }
      await apiRequest("POST", "/api/social-accounts", payload);
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setSocialForm({ platform: "", username: "", profileUrl: "", accountType: "personal", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" });
      setShowAddSocial(false);
      toast({ title: "Account connected", description: `${socialForm.platform} account @${socialForm.username.replace(/^@/, "")} has been added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add account", variant: "destructive" });
    }
  };

  const handleDeleteSocialAccount = async (id: number, platform: string, username: string) => {
    try {
      await apiRequest("DELETE", `/api/social-accounts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      toast({ title: "Account removed", description: `${platform} @${username} has been disconnected.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove account", variant: "destructive" });
    }
  };

  const shippingProviderConfig: Record<string, { name: string; icon: string; color: string; bgColor: string; fields: string[]; guide: string }> = {
    aras: { name: "Aras Kargo", icon: "📦", color: "text-orange-400", bgColor: "bg-orange-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "Aras Kargo API panel: araskargoapi.com > Developer > API Keys" },
    yurtici: { name: "Yurtici Kargo", icon: "🚛", color: "text-blue-400", bgColor: "bg-blue-500/10",
      fields: ["apiKey", "username", "password"],
      guide: "Yurtici Kargo API: yurticikargo.com > Kurumsal > API Entegrasyonu" },
    mng: { name: "MNG Kargo", icon: "📮", color: "text-red-400", bgColor: "bg-red-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "MNG Kargo API: mngkargo.com.tr > Kurumsal > API Basvuru" },
    surat: { name: "Surat Kargo", icon: "⚡", color: "text-yellow-400", bgColor: "bg-yellow-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "Surat Kargo API: suratkargo.com.tr > Kurumsal > Teknoloji" },
    ptt: { name: "PTT Kargo", icon: "🏤", color: "text-amber-400", bgColor: "bg-amber-500/10",
      fields: ["apiKey", "username"],
      guide: "PTT Kargo API: ptt.gov.tr > e-Hizmetler > API Basvuru" },
    ups: { name: "UPS", icon: "🟤", color: "text-amber-600", bgColor: "bg-amber-600/10",
      fields: ["apiKey", "username", "password"],
      guide: "UPS Developer Kit: developer.ups.com > Apps > Create App" },
    fedex: { name: "FedEx", icon: "📬", color: "text-purple-400", bgColor: "bg-purple-500/10",
      fields: ["apiKey", "accountNumber"],
      guide: "FedEx Developer: developer.fedex.com > My Apps > Create API Key" },
    dhl: { name: "DHL", icon: "✈️", color: "text-yellow-500", bgColor: "bg-yellow-600/10",
      fields: ["apiKey", "siteId"],
      guide: "DHL Developer: developer.dhl.com > MyDHL API > Get Started" },
  };

  const shippingFieldLabels: Record<string, string> = {
    apiKey: "API Key",
    customerCode: "Customer Code",
    username: "Username",
    password: "Password",
    accountNumber: "Account Number",
    siteId: "Site ID",
  };

  const handleAddShippingProvider = async () => {
    if (!shippingForm.provider || !shippingForm.apiKey.trim()) {
      toast({ title: "Error", description: "Provider and API key are required", variant: "destructive" });
      return;
    }
    try {
      const body: any = { provider: shippingForm.provider, apiKey: shippingForm.apiKey.trim() };
      if (shippingForm.customerCode.trim()) body.customerCode = shippingForm.customerCode.trim();
      if (shippingForm.username.trim()) body.username = shippingForm.username.trim();
      if (shippingForm.password.trim()) body.password = shippingForm.password.trim();
      if (shippingForm.accountNumber.trim()) body.accountNumber = shippingForm.accountNumber.trim();
      if (shippingForm.siteId.trim()) body.siteId = shippingForm.siteId.trim();
      await apiRequest("POST", "/api/shipping-providers", body);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      setShippingForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
      setShowAddShipping(false);
      const cfg = shippingProviderConfig[shippingForm.provider];
      toast({ title: "Provider connected", description: `${cfg?.name || shippingForm.provider} has been added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add provider", variant: "destructive" });
    }
  };

  const handleUpdateSecret = async (id: number, providerKey: string) => {
    const nonEmpty: Record<string, string> = {};
    for (const [k, v] of Object.entries(secretForm)) {
      if (v.trim()) nonEmpty[k] = v.trim();
    }
    if (Object.keys(nonEmpty).length === 0) {
      toast({ title: "No changes", description: "Enter at least one field to update", variant: "destructive" });
      return;
    }
    setSecretSaving(true);
    try {
      await apiRequest("PATCH", `/api/shipping-providers/${id}`, nonEmpty);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      setEditingSecretId(null);
      setSecretForm({});
      setVisibleSecretFields({});
      const cfg = shippingProviderConfig[providerKey];
      toast({ title: "Secrets updated", description: `${cfg?.name || providerKey} credentials have been updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update secrets", variant: "destructive" });
    } finally {
      setSecretSaving(false);
    }
  };

  const handleDeleteShippingProvider = async (id: number, providerKey: string) => {
    const cfg = shippingProviderConfig[providerKey];
    try {
      await apiRequest("DELETE", `/api/shipping-providers/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      toast({ title: "Provider removed", description: `${cfg?.name || providerKey} has been disconnected.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove provider", variant: "destructive" });
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsappForm.phoneNumberId.trim() || !whatsappForm.accessToken.trim() || !whatsappForm.verifyToken.trim()) {
      toast({ title: "Error", description: "Phone Number ID, Access Token, and Verify Token are required", variant: "destructive" });
      return;
    }
    setWhatsappSaving(true);
    try {
      await apiRequest("POST", "/api/whatsapp/config", {
        phoneNumberId: whatsappForm.phoneNumberId.trim(),
        businessAccountId: whatsappForm.businessAccountId.trim() || null,
        accessToken: whatsappForm.accessToken.trim(),
        verifyToken: whatsappForm.verifyToken.trim(),
        displayName: whatsappForm.displayName.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
      setShowWhatsappSetup(false);
      toast({ title: "WhatsApp Connected", description: "WhatsApp Business API has been configured successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save WhatsApp config", variant: "destructive" });
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestWhatsapp = async () => {
    setWhatsappTesting(true);
    try {
      const res = await apiRequest("POST", "/api/whatsapp/test");
      const data = await res.json();
      if (data.success) {
        toast({ title: "Connection Successful", description: `Phone: ${data.phone}${data.name ? ` (${data.name})` : ""}` });
      } else {
        toast({ title: "Connection Failed", description: data.error || "Could not verify WhatsApp connection", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Test Failed", description: err.message || "Connection test failed", variant: "destructive" });
    } finally {
      setWhatsappTesting(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await apiRequest("DELETE", "/api/whatsapp/config");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
      setWhatsappForm({ phoneNumberId: "", businessAccountId: "", accessToken: "", verifyToken: "", displayName: "" });
      toast({ title: "WhatsApp Disconnected", description: "WhatsApp Business API has been removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to disconnect WhatsApp", variant: "destructive" });
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
  };

  const platformConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
    instagram: { icon: "📸", color: "text-pink-400", bgColor: "bg-pink-500/10" },
    twitter: { icon: "𝕏", color: "text-sky-400", bgColor: "bg-sky-500/10" },
    linkedin: { icon: "💼", color: "text-blue-400", bgColor: "bg-blue-500/10" },
    facebook: { icon: "📘", color: "text-blue-500", bgColor: "bg-blue-600/10" },
    tiktok: { icon: "🎵", color: "text-rose-400", bgColor: "bg-rose-500/10" },
    youtube: { icon: "▶️", color: "text-red-400", bgColor: "bg-red-500/10" },
  };

  const startEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      email: member.email,
      position: member.position || "",
      department: member.department || "",
      skills: member.skills || "",
      responsibilities: member.responsibilities || "",
      phone: member.phone || "",
    });
    setShowAddMember(true);
  };

  const handleProfileSave = () => {
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Full name is required", variant: "destructive" });
      return;
    }
    profileMutation.mutate({ fullName: fullName.trim(), company: company.trim() });
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in all password fields", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  if (authLoading || !user) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRentals = rentals?.filter((r) => r.status === "active") || [];
  const totalMessages = activeRentals.reduce((sum, r) => sum + r.messagesUsed, 0);
  const totalLimit = activeRentals.reduce((sum, r) => sum + r.messagesLimit, 0);
  const subscription = subscriptionData?.subscription;
  const planName = subscription?.metadata?.plan
    ? subscription.metadata.plan.charAt(0).toUpperCase() + subscription.metadata.plan.slice(1)
    : null;

  const settingsSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "language", label: "Language", icon: Languages },
    { id: "integrations", label: "Integrations", icon: Link2 },
    { id: "personal-gmail", label: "Gmail", icon: Mail },
    { id: "social-accounts", label: "Social Media", icon: Share2 },
    { id: "team-members", label: "Team", icon: Users },
    { id: "whatsapp-business", label: "WhatsApp", icon: Phone },
    { id: "shipping-providers", label: "Shipping", icon: Package },
    { id: "crm-documents", label: "CRM", icon: FileText },
    { id: "api-secrets", label: "API Keys", icon: KeyRound },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "image-credits", label: "Image Credits", icon: Sparkles },
    { id: "security", label: "Security", icon: Shield },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-testid="card-${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" data-testid="button-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-settings-title">Settings</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative">
            <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide" data-testid="settings-mobile-nav">
              {settingsSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                    data-testid={`nav-mobile-${section.id}`}
                  >
                    <SectionIcon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/90 to-transparent" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1" data-testid="settings-desktop-nav">
              {settingsSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                    data-testid={`nav-desktop-${section.id}`}
                  >
                    <SectionIcon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-6 sm:space-y-8">
        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-profile">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-sm text-muted-foreground">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-1.5"
                data-testid="input-fullname"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="mt-1.5 opacity-60"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="company" className="text-sm text-muted-foreground">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name (optional)"
                className="mt-1.5"
                data-testid="input-company"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profileMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
              data-testid="button-save-profile"
            >
              {profileMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-1.5" />Save Changes</>
              )}
            </Button>
          </div>
        </Card>

        <LanguagePreferenceCard />

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-integrations">
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Gmail</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emailStatus?.provider === "gmail"
                      ? (emailStatus.address && emailStatus.address !== "Connected" ? emailStatus.address : "Connected via Google")
                      : "Connect your Google account for email"}
                  </p>
                  {emailStatus?.provider === "gmail" && (
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {"✓ Send"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {"✓ Read Inbox"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {emailStatus?.provider === "gmail" ? (
                  <>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1" data-testid="badge-gmail-connected">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      disabled={gmailDisconnecting}
                      onClick={async () => {
                        setGmailDisconnecting(true);
                        try {
                          await apiRequest("DELETE", "/api/settings/gmail");
                          queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                          toast({ title: "Gmail disconnected", description: "Your Google account has been disconnected." });
                        } catch {
                          toast({ title: "Error", description: "Failed to disconnect Gmail.", variant: "destructive" });
                        } finally {
                          setGmailDisconnecting(false);
                        }
                      }}
                      data-testid="button-disconnect-gmail"
                    >
                      {gmailDisconnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Disconnecting...</> : "Disconnect"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1" data-testid="badge-gmail-disconnected">
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
                      disabled={gmailReconnecting}
                      onClick={async () => {
                        setGmailReconnecting(true);
                        try {
                          const res = await apiRequest("GET", "/api/auth/google/url");
                          const data = await res.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            toast({ title: "Error", description: "Could not generate Google auth URL", variant: "destructive" });
                          }
                        } catch {
                          toast({ title: "Error", description: "Failed to start Google authentication.", variant: "destructive" });
                        } finally {
                          setGmailReconnecting(false);
                        }
                      }}
                      data-testid="button-connect-gmail"
                    >
                      {gmailReconnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Connecting...</> : "Connect Gmail"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Platform Email</p>
                  <p className="text-xs text-muted-foreground">Fallback email service for agent communications</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1" data-testid="badge-platform-email">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  onClick={async () => {
                    toast({ title: "Cannot deactivate", description: "Platform email is the default fallback and cannot be disabled.", variant: "destructive" });
                  }}
                  data-testid="button-deactivate-platform-email"
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-personal-gmail">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">Gmail Account</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your Google account to let AI agents send and receive emails on your behalf.
          </p>
          {gmailSettings?.gmailAddress && (gmailSettings?.hasOAuth || gmailSettings?.hasAppPassword) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid="text-user-gmail">{gmailSettings.gmailAddress}</p>
                    <p className="text-xs text-emerald-400">Connected via {gmailSettings.hasOAuth ? "Google OAuth" : "App Password"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={async () => {
                      try {
                        const res = await apiRequest("GET", "/api/settings/gmail/status");
                        const status = await res.json();
                        if (status.connected) {
                          toast({ title: "Connection OK", description: `Gmail (${status.email}) is connected via ${status.method === "oauth" ? "Google OAuth" : "App Password"}.` });
                        } else {
                          toast({ title: "Not connected", description: "Gmail is not connected.", variant: "destructive" });
                        }
                      } catch {
                        toast({ title: "Error", description: "Failed to test Gmail connection.", variant: "destructive" });
                      }
                    }}
                    data-testid="button-test-gmail"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={async () => {
                      try {
                        await apiRequest("DELETE", "/api/settings/gmail");
                        queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                        toast({ title: "Gmail disconnected", description: "Your Google account has been disconnected." });
                      } catch {
                        toast({ title: "Error", description: "Failed to disconnect Gmail.", variant: "destructive" });
                      }
                    }}
                    data-testid="button-remove-gmail"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  setGmailReconnecting(true);
                  try {
                    const res = await apiRequest("GET", "/api/auth/google/url");
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      toast({ title: "Error", description: "Could not start Google authentication", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Error", description: "Failed to start Google authentication.", variant: "destructive" });
                  } finally {
                    setGmailReconnecting(false);
                  }
                }}
                disabled={gmailReconnecting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                data-testid="button-connect-gmail-oauth"
              >
                {gmailReconnecting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Connecting...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-1.5" />Connect with Google</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                You will be redirected to Google to authorize access to your Gmail account.
              </p>
              <Separator className="my-3" />
              <button
                onClick={() => setShowAppPassword(!showAppPassword)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid="button-toggle-app-password"
              >
                <KeyRound className="w-3 h-3" />
                {showAppPassword ? "Hide" : "Or use"} App Password
                <ChevronDown className={`w-3 h-3 transition-transform ${showAppPassword ? "rotate-180" : ""}`} />
              </button>
              {showAppPassword && (
                <div className="mt-3 space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">
                    Use a Gmail App Password if you cannot connect via Google OAuth. Generate one at myaccount.google.com &gt; Security &gt; App passwords.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Gmail Address</Label>
                      <Input
                        type="email"
                        placeholder="your@gmail.com"
                        value={appPasswordForm.gmailAddress}
                        onChange={(e) => setAppPasswordForm(f => ({ ...f, gmailAddress: e.target.value }))}
                        className="h-8 text-xs"
                        data-testid="input-gmail-address"
                      />
                    </div>
                    <div className="relative">
                      <Label className="text-xs text-muted-foreground">App Password</Label>
                      <Input
                        type={showAppPass ? "text" : "password"}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={appPasswordForm.gmailAppPassword}
                        onChange={(e) => setAppPasswordForm(f => ({ ...f, gmailAppPassword: e.target.value }))}
                        className="h-8 text-xs pr-8"
                        data-testid="input-gmail-app-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppPass(!showAppPass)}
                        className="absolute right-2 top-[26px] text-muted-foreground hover:text-foreground"
                      >
                        {showAppPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={appPasswordSaving || !appPasswordForm.gmailAddress || !appPasswordForm.gmailAppPassword}
                    onClick={async () => {
                      setAppPasswordSaving(true);
                      try {
                        await apiRequest("POST", "/api/settings/gmail", appPasswordForm);
                        queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                        setAppPasswordForm({ gmailAddress: "", gmailAppPassword: "" });
                        setShowAppPassword(false);
                        toast({ title: "Gmail connected", description: "Your Gmail App Password has been saved." });
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message || "Failed to save Gmail settings", variant: "destructive" });
                      } finally {
                        setAppPasswordSaving(false);
                      }
                    }}
                    data-testid="button-save-app-password"
                  >
                    {appPasswordSaving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : <><Save className="w-3 h-3 mr-1" />Save App Password</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-social-accounts">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold text-foreground">Social Media Accounts</h2>
              {socialAccountsData && socialAccountsData.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-social-count">{socialAccountsData.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
              onClick={() => { setSocialForm({ platform: "", username: "", profileUrl: "", accountType: "personal", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" }); setShowAddSocial(true); }}
              data-testid="button-add-social"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />Connect Account
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your social media accounts so Maya (Social Media AI) can create content tailored to your profiles and audiences.
          </p>

          {showAddSocial && (
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-pink-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground">Connect New Account</p>
              <div>
                <Label className="text-xs text-muted-foreground">Platform *</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1.5">
                  {Object.entries(platformConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setSocialForm(p => ({ ...p, platform: key }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        socialForm.platform === key
                          ? `border-pink-500 ${cfg.bgColor} ring-1 ring-pink-500/30`
                          : "border-border/50 hover:border-pink-500/50"
                      }`}
                      data-testid={`button-platform-${key}`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{key === "twitter" ? "X" : key}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account Type</Label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setSocialForm(p => ({ ...p, accountType: "personal" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${
                      socialForm.accountType === "personal"
                        ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/30"
                        : "border-border/50 hover:border-pink-500/50"
                    }`}
                    data-testid="button-account-type-personal"
                  >
                    <span className="text-sm">👤</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Personal</p>
                  </button>
                  <button
                    onClick={() => setSocialForm(p => ({ ...p, accountType: "business" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${
                      socialForm.accountType === "business"
                        ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : "border-border/50 hover:border-blue-500/50"
                    }`}
                    data-testid="button-account-type-business"
                  >
                    <span className="text-sm">🔗</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Business / API</p>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {socialForm.accountType === "personal"
                    ? "Manual sharing — Maya will prepare content for you to copy & paste"
                    : "Auto-publish — Maya can post directly via API"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Username *</Label>
                  <Input
                    value={socialForm.username}
                    onChange={(e) => setSocialForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="@yourusername"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-social-username"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Profile URL (optional)</Label>
                  <Input
                    value={socialForm.profileUrl}
                    onChange={(e) => setSocialForm(p => ({ ...p, profileUrl: e.target.value }))}
                    placeholder="https://instagram.com/yourusername"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-social-url"
                  />
                </div>
              </div>

              {socialForm.accountType === "business" && (
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <p className="text-xs font-medium text-blue-400">API Credentials</p>
                  {(socialForm.platform === "twitter" || socialForm.platform === "tiktok" || socialForm.platform === "youtube" || !socialForm.platform) && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">API Key</Label>
                          <Input value={socialForm.apiKey} onChange={(e) => setSocialForm(p => ({ ...p, apiKey: e.target.value }))} placeholder="API Key" className="mt-0.5 h-7 text-xs" data-testid="input-api-key" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">API Secret</Label>
                          <Input value={socialForm.apiSecret} onChange={(e) => setSocialForm(p => ({ ...p, apiSecret: e.target.value }))} placeholder="API Secret" className="mt-0.5 h-7 text-xs" type="password" data-testid="input-api-secret" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Access Token</Label>
                          <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder="Access Token" className="mt-0.5 h-7 text-xs" data-testid="input-access-token" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Access Token Secret</Label>
                          <Input value={socialForm.accessTokenSecret} onChange={(e) => setSocialForm(p => ({ ...p, accessTokenSecret: e.target.value }))} placeholder="Token Secret" className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token-secret" />
                        </div>
                      </div>
                    </>
                  )}
                  {(socialForm.platform === "instagram" || socialForm.platform === "facebook") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{socialForm.platform === "instagram" ? "Meta Access Token" : "Page Access Token"}</Label>
                        <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder="Access Token" className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{socialForm.platform === "instagram" ? "Business Account ID" : "Page ID"}</Label>
                        <Input
                          value={socialForm.platform === "instagram" ? socialForm.businessAccountId : socialForm.pageId}
                          onChange={(e) => setSocialForm(p => ({ ...p, [socialForm.platform === "instagram" ? "businessAccountId" : "pageId"]: e.target.value }))}
                          placeholder={socialForm.platform === "instagram" ? "IG Business Account ID" : "Facebook Page ID"}
                          className="mt-0.5 h-7 text-xs" data-testid="input-business-id"
                        />
                      </div>
                    </div>
                  )}
                  {socialForm.platform === "linkedin" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Access Token</Label>
                        <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder="LinkedIn Access Token" className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Organization ID (optional)</Label>
                        <Input value={socialForm.businessAccountId} onChange={(e) => setSocialForm(p => ({ ...p, businessAccountId: e.target.value }))} placeholder="Company Page ID" className="mt-0.5 h-7 text-xs" data-testid="input-business-id" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAddSocialAccount}
                  disabled={!socialForm.platform || !socialForm.username.trim()}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0"
                  data-testid="button-save-social"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />Connect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddSocial(false)}
                  data-testid="button-cancel-social"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {socialLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : socialAccountsData && socialAccountsData.length > 0 ? (
            <div className="space-y-2">
              {socialAccountsData.map((account) => {
                const cfg = platformConfig[account.platform] || { icon: "🔗", color: "text-gray-400", bgColor: "bg-gray-500/10" };
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group" data-testid={`card-social-${account.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <span className="text-base">{cfg.icon}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${cfg.color}`} data-testid={`text-social-platform-${account.id}`}>
                          {account.platform === "twitter" ? "X (Twitter)" : account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                        </p>
                        <p className="text-xs text-foreground" data-testid={`text-social-username-${account.id}`}>@{account.username}</p>
                        {account.profileUrl && (
                          <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-blue-400 truncate block max-w-[200px]">
                            {account.profileUrl}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${(account as any).accountType === "business" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                        {(account as any).accountType === "business" ? "🔗 API" : "👤 Personal"}
                      </Badge>
                      <button
                        onClick={() => handleDeleteSocialAccount(account.id, account.platform, account.username)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`button-delete-social-${account.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📸</span><span>𝕏</span><span>💼</span><span>🎵</span><span>▶️</span>
              </div>
              <p className="text-sm">No social accounts connected</p>
              <p className="text-xs mt-1">Connect your accounts so Maya can create tailored content for your profiles</p>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-team-members">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              {teamMembers && teamMembers.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-team-count">{teamMembers.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              onClick={() => { resetMemberForm(); setShowAddMember(true); }}
              data-testid="button-add-member"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />Add Member
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Add your team members so AI agents know who everyone is. They can reference team members when sending emails or coordinating tasks.
          </p>

          {showAddMember && (
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-violet-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground">{editingMember ? "Edit Member" : "Add New Member"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name *</Label>
                  <Input
                    value={memberForm.name}
                    onChange={(e) => setMemberForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="John Doe"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-name"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email *</Label>
                  <Input
                    value={memberForm.email}
                    onChange={(e) => setMemberForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="john@company.com"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-email"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <Input
                    value={memberForm.position}
                    onChange={(e) => setMemberForm(p => ({ ...p, position: e.target.value }))}
                    placeholder="Software Engineer"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-position"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input
                    value={memberForm.department}
                    onChange={(e) => setMemberForm(p => ({ ...p, department: e.target.value }))}
                    placeholder="Engineering"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-department"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 555 0123"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-phone"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Skills</Label>
                  <Input
                    value={memberForm.skills}
                    onChange={(e) => setMemberForm(p => ({ ...p, skills: e.target.value }))}
                    placeholder="React, Node.js, Python"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-member-skills"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsibilities</Label>
                <Input
                  value={memberForm.responsibilities}
                  onChange={(e) => setMemberForm(p => ({ ...p, responsibilities: e.target.value }))}
                  placeholder="Frontend development, code reviews"
                  className="mt-1 h-8 text-sm"
                  data-testid="input-member-responsibilities"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveMember}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                  data-testid="button-save-member"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />{editingMember ? "Update" : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetMemberForm}
                  data-testid="button-cancel-member"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {teamLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group" data-testid={`card-member-${member.id}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground" data-testid={`text-member-name-${member.id}`}>{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {member.position && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 flex items-center gap-0.5">
                            <Briefcase className="w-2.5 h-2.5" />{member.position}
                          </span>
                        )}
                        {member.department && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
                            {member.department}
                          </span>
                        )}
                        {member.phone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />{member.phone}
                          </span>
                        )}
                      </div>
                      {member.skills && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">Skills: {member.skills}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEditMember(member)}
                      className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors"
                      data-testid={`button-edit-member-${member.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      data-testid={`button-delete-member-${member.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No team members yet</p>
              <p className="text-xs mt-1">Add your team so AI agents can collaborate effectively</p>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-whatsapp-business">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-foreground">WhatsApp Business</h2>
              {whatsappData?.connected && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-1">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Connected
                </Badge>
              )}
            </div>
            {!whatsappData?.connected && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => setShowWhatsappSetup(true)}
                data-testid="button-connect-whatsapp"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />Connect WhatsApp
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your Meta WhatsApp Business API so all AI agents can send WhatsApp messages to your customers — invoices, reminders, follow-ups, and more.
          </p>

          {whatsappLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : whatsappData?.connected ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/30 border border-green-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone Number ID</p>
                    <p className="text-sm font-medium text-foreground" data-testid="text-wa-phone-id">{whatsappData.phoneNumberId}</p>
                  </div>
                  {whatsappData.displayName && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Display Name</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-wa-display-name">{whatsappData.displayName}</p>
                    </div>
                  )}
                  {whatsappData.businessAccountId && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Business Account ID</p>
                      <p className="text-sm font-medium text-foreground">{whatsappData.businessAccountId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Token</p>
                    <p className="text-sm font-medium text-foreground">****configured</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Webhook URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted/50 px-2 py-1 rounded flex-1 truncate text-foreground" data-testid="text-wa-webhook-url">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}
                    </code>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyWebhookUrl} data-testid="button-copy-webhook">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Paste this URL in Meta Business Manager &gt; WhatsApp &gt; Configuration &gt; Webhook URL
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={handleTestWhatsapp}
                  disabled={whatsappTesting}
                  data-testid="button-test-whatsapp"
                >
                  {whatsappTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                  Test Connection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => { setShowWhatsappSetup(true); setWhatsappForm({ phoneNumberId: whatsappData.phoneNumberId || "", businessAccountId: whatsappData.businessAccountId || "", accessToken: "", verifyToken: "", displayName: whatsappData.displayName || "" }); }}
                  data-testid="button-edit-whatsapp"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={handleDisconnectWhatsapp}
                  data-testid="button-disconnect-whatsapp"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Disconnect
                </Button>
              </div>
            </div>
          ) : showWhatsappSetup ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-green-500/20 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-green-400" />
                <p className="text-sm font-medium text-foreground">Connect WhatsApp Business API</p>
              </div>

              <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] text-green-400 leading-relaxed">
                  You need a Meta Business Manager account with WhatsApp Business API enabled.
                  Go to <span className="font-medium">developers.facebook.com</span> &gt; My Apps &gt; Create App &gt; Business &gt; Add WhatsApp.
                  Get your Phone Number ID and generate a permanent Access Token.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number ID *</Label>
                  <Input
                    value={whatsappForm.phoneNumberId}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, phoneNumberId: e.target.value }))}
                    placeholder="e.g. 1234567890"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-phone-number-id"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Business Account ID</Label>
                  <Input
                    value={whatsappForm.businessAccountId}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, businessAccountId: e.target.value }))}
                    placeholder="Optional"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-business-id"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Access Token *</Label>
                  <div className="relative">
                    <Input
                      type={showWhatsappToken ? "text" : "password"}
                      value={whatsappForm.accessToken}
                      onChange={(e) => setWhatsappForm(p => ({ ...p, accessToken: e.target.value }))}
                      placeholder="Permanent or long-lived token"
                      className="mt-1 h-8 text-sm pr-8"
                      data-testid="input-wa-access-token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {showWhatsappToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Verify Token *</Label>
                  <Input
                    value={whatsappForm.verifyToken}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, verifyToken: e.target.value }))}
                    placeholder="Your chosen webhook verify token"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-verify-token"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input
                    value={whatsappForm.displayName}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="Your business name on WhatsApp"
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-display-name"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">Webhook URL (use this in Meta Business Manager):</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded flex-1 truncate text-foreground">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyWebhookUrl} data-testid="button-copy-webhook-setup">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveWhatsapp}
                  disabled={whatsappSaving || !whatsappForm.phoneNumberId.trim() || !whatsappForm.accessToken.trim() || !whatsappForm.verifyToken.trim()}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                  data-testid="button-save-whatsapp"
                >
                  {whatsappSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
                  Connect
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowWhatsappSetup(false)} data-testid="button-cancel-whatsapp">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📱</span><span>💬</span><span>🟢</span>
              </div>
              <p className="text-sm">WhatsApp Business not connected</p>
              <p className="text-xs mt-1">Connect your Meta WhatsApp API to let AI agents message your customers</p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-2 transition-colors"
                data-testid="link-whatsapp-docs"
              >
                <ExternalLink className="w-3 h-3" />
                WhatsApp Cloud API Setup Guide
              </a>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-shipping-providers">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-foreground">Shipping Providers</h2>
              {shippingProvidersData && shippingProvidersData.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-shipping-count">{shippingProvidersData.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              onClick={() => { setShippingForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" }); setShowAddShipping(true); setShowShippingApiKey(false); }}
              data-testid="button-add-shipping"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />Connect Provider
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your cargo/shipping provider API so ShopBot (E-Commerce AI) can help with tracking, logistics, and shipping management.
          </p>

          {showAddShipping && (
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-orange-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground">Connect Shipping Provider</p>
              <div>
                <Label className="text-xs text-muted-foreground">Provider *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {Object.entries(shippingProviderConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setShippingForm(p => ({ ...p, provider: key, customerCode: "", username: "", password: "", accountNumber: "", siteId: "" }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        shippingForm.provider === key
                          ? `border-orange-500 ${cfg.bgColor} ring-1 ring-orange-500/30`
                          : "border-border/50 hover:border-orange-500/50"
                      }`}
                      data-testid={`button-shipping-${key}`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {shippingForm.provider && (
                <>
                  <div className="p-2 rounded bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] text-orange-400">{shippingProviderConfig[shippingForm.provider]?.guide}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shippingProviderConfig[shippingForm.provider]?.fields.map((field) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground">{shippingFieldLabels[field]} *</Label>
                        <div className="relative">
                          <Input
                            type={(field === "apiKey" || field === "password") && !showShippingApiKey ? "password" : "text"}
                            value={(shippingForm as any)[field] || ""}
                            onChange={(e) => setShippingForm(p => ({ ...p, [field]: e.target.value }))}
                            placeholder={shippingFieldLabels[field]}
                            className="mt-1 h-8 text-sm pr-8"
                            data-testid={`input-shipping-${field}`}
                          />
                          {(field === "apiKey" || field === "password") && (
                            <button
                              type="button"
                              onClick={() => setShowShippingApiKey(!showShippingApiKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {showShippingApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAddShippingProvider}
                  disabled={!shippingForm.provider || !shippingForm.apiKey.trim()}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0"
                  data-testid="button-save-shipping"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />Connect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddShipping(false)}
                  data-testid="button-cancel-shipping"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {shippingLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : shippingProvidersData && shippingProvidersData.length > 0 ? (
            <div className="space-y-2">
              {shippingProvidersData.map((sp) => {
                const cfg = shippingProviderConfig[sp.provider] || { icon: "📦", name: sp.provider, color: "text-gray-400", bgColor: "bg-gray-500/10" };
                return (
                  <div key={sp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group gap-2" data-testid={`card-shipping-${sp.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <span className="text-base">{cfg.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${cfg.color} truncate`} data-testid={`text-shipping-name-${sp.id}`}>
                          {cfg.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">API Key: ****{sp.apiKey.slice(-4)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        {sp.status}
                      </Badge>
                      <button
                        onClick={() => handleDeleteShippingProvider(sp.id, sp.provider)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`button-delete-shipping-${sp.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📦</span><span>🚛</span><span>📮</span><span>✈️</span>
              </div>
              <p className="text-sm">No shipping providers connected</p>
              <p className="text-xs mt-1">Connect your cargo API so ShopBot can help with shipping and logistics</p>
            </div>
          )}
        </Card>

        <CrmDocumentsSection />

        {shippingProvidersData && shippingProvidersData.length > 0 && (
          <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-api-secrets">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-foreground">API Secrets</h2>
              <ShieldCheck className="w-4 h-4 text-emerald-500 ml-1" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Manage your shipping provider API credentials securely. Click on a provider to view or update its secrets.
            </p>

            <div className="space-y-2">
              {shippingProvidersData.map((sp) => {
                const cfg = shippingProviderConfig[sp.provider] || { icon: "📦", name: sp.provider, color: "text-gray-400", bgColor: "bg-gray-500/10", fields: ["apiKey"], guide: "" };
                const isEditing = editingSecretId === sp.id;
                const fieldList = cfg.fields || ["apiKey"];

                return (
                  <div key={sp.id} className="rounded-lg border border-border/50 overflow-hidden" data-testid={`secret-provider-${sp.id}`}>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingSecretId(null);
                          setSecretForm({});
                          setVisibleSecretFields({});
                        } else {
                          setEditingSecretId(sp.id);
                          setSecretForm({});
                          setVisibleSecretFields({});
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                      data-testid={`button-secret-toggle-${sp.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                          <span className="text-sm">{cfg.icon}</span>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-medium ${cfg.color}`}>{cfg.name}</p>
                          <p className="text-[10px] text-muted-foreground">{fieldList.length} credential{fieldList.length > 1 ? "s" : ""} stored</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isEditing ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isEditing && (
                      <div className="p-4 border-t border-border/50 space-y-3 bg-muted/10">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-[10px] text-emerald-400 font-medium">Stored credentials (values are encrypted)</p>
                        </div>

                        {fieldList.map((field) => {
                          const isSensitive = field === "apiKey" || field === "password";
                          const fieldKey = `${sp.id}-${field}`;
                          const isVisible = visibleSecretFields[fieldKey] || false;

                          const currentMasked = field === "apiKey" ? sp.apiKey : (
                            (sp as any)[`has${field.charAt(0).toUpperCase() + field.slice(1)}`]
                              ? "********"
                              : ""
                          );
                          const hasValue = field === "apiKey" ? !!sp.apiKey : !!(sp as any)[`has${field.charAt(0).toUpperCase() + field.slice(1)}`];

                          return (
                            <div key={field} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  {isSensitive && <Lock className="w-2.5 h-2.5" />}
                                  {shippingFieldLabels[field]}
                                </Label>
                                {hasValue && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] h-4">
                                    <CheckCircle2 className="w-2 h-2 mr-0.5" />set
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type={isSensitive && !isVisible ? "password" : "text"}
                                    placeholder={hasValue ? `Current: ${currentMasked}` : `Enter ${shippingFieldLabels[field]}`}
                                    value={secretForm[field] || ""}
                                    onChange={(e) => setSecretForm(p => ({ ...p, [field]: e.target.value }))}
                                    className="h-8 text-sm pr-8 font-mono bg-background/50"
                                    data-testid={`input-secret-${field}-${sp.id}`}
                                  />
                                  {isSensitive && (
                                    <button
                                      type="button"
                                      onClick={() => setVisibleSecretFields(p => ({ ...p, [fieldKey]: !isVisible }))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-2 border-t border-border/30">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSecret(sp.id, sp.provider)}
                            disabled={secretSaving || Object.values(secretForm).every(v => !v.trim())}
                            className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0"
                            data-testid={`button-save-secret-${sp.id}`}
                          >
                            {secretSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                            Update Secrets
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingSecretId(null); setSecretForm({}); setVisibleSecretFields({}); }}
                            data-testid={`button-cancel-secret-${sp.id}`}
                          >
                            Cancel
                          </Button>
                        </div>

                        <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Leave fields empty to keep current values. Only filled fields will be updated.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-subscription">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Plan</p>
                <p className="text-lg font-bold text-foreground" data-testid="text-plan-name">
                  {planName || (user.hasSubscription ? "Active" : "None")}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Active Workers</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-active-workers-count">
                  {activeRentals.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Messages Used</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-messages-used">
                  {totalMessages}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-messages-remaining">
                  {totalLimit ? totalLimit - totalMessages : 0}
                </p>
              </div>
            </div>
            {totalLimit > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Usage</span>
                  <span>{Math.round((totalMessages / totalLimit) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                    style={{ width: `${Math.min(Math.round((totalMessages / totalLimit) * 100), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-image-credits">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-foreground">Image Credits</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                  <p className="text-3xl font-bold text-yellow-400" data-testid="text-image-credits">{creditsData?.credits ?? 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                1 credit = 1 AI image generation or stock photo search (used by Maya - Social Media agent)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-3">Purchase Credits</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(creditPrices || []).map((price) => (
                  <button
                    key={price.id}
                    onClick={() => setSelectedCreditPkg(selectedCreditPkg === price.id ? null : price.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      selectedCreditPkg === price.id 
                        ? "border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/30" 
                        : "border-border/50 hover:border-yellow-500/50 hover:bg-yellow-500/5"
                    }`}
                    data-testid={`button-settings-credits-${price.credits}`}
                  >
                    <p className="text-lg font-bold text-foreground">{price.credits}</p>
                    <p className="text-[10px] text-muted-foreground">credits</p>
                    <p className="text-sm font-semibold text-yellow-400 mt-1">${(price.amount / 100).toFixed(2)}</p>
                    {price.credits > 1 && (
                      <p className="text-[9px] text-muted-foreground">${(price.amount / price.credits / 100).toFixed(2)}/ea</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedCreditPkg && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-foreground">Payment Details</p>
                <div>
                  <Label className="text-xs text-muted-foreground">Card Number</Label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={creditCard.number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                      setCreditCard(prev => ({ ...prev, number: digits.replace(/(\d{4})(?=\d)/g, "$1 ") }));
                    }}
                    className="mt-1"
                    maxLength={19}
                    data-testid="input-settings-credit-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Expiry</Label>
                    <Input
                      placeholder="MM/YY"
                      value={creditCard.expiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCreditCard(prev => ({ ...prev, expiry: digits.length >= 3 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits }));
                      }}
                      className="mt-1"
                      maxLength={5}
                      data-testid="input-settings-credit-expiry"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CVC</Label>
                    <Input
                      placeholder="123"
                      value={creditCard.cvc}
                      onChange={(e) => {
                        setCreditCard(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                      }}
                      className="mt-1"
                      maxLength={4}
                      data-testid="input-settings-credit-cvc"
                    />
                  </div>
                </div>
                <Button
                  onClick={buyCredits}
                  disabled={creditPurchasing || !creditCard.number || !creditCard.expiry || !creditCard.cvc}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                  data-testid="button-settings-purchase-credits"
                >
                  {creditPurchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                  Purchase {creditPrices?.find(p => p.id === selectedCreditPkg)?.credits} Credits — ${((creditPrices?.find(p => p.id === selectedCreditPkg)?.amount || 0) / 100).toFixed(2)}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Test cards: 4242 4242 4242 4242
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-security">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-sm text-muted-foreground">Current Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-current-password"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-sm text-muted-foreground">New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1.5"
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              data-testid="button-change-password"
            >
              {passwordMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Changing...</>
              ) : (
                <><Lock className="w-4 h-4 mr-1.5" />Change Password</>
              )}
            </Button>
          </div>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
