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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

  const [userGmailAddress, setUserGmailAddress] = useState("");
  const [userGmailAppPassword, setUserGmailAppPassword] = useState("");
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [gmailSaving, setGmailSaving] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", position: "", department: "", skills: "", responsibilities: "", phone: "" });

  const [showAddSocial, setShowAddSocial] = useState(false);
  const [socialForm, setSocialForm] = useState({ platform: "", username: "", profileUrl: "" });

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

  const { data: gmailSettings } = useQuery<{ gmailAddress: string | null; hasAppPassword: boolean }>({
    queryKey: ["/api/settings/gmail"],
    enabled: !!user,
  });

  const { data: socialAccountsData, isLoading: socialLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social-accounts"],
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

  const handleSaveGmailSettings = async () => {
    if (!userGmailAddress.trim() || !userGmailAppPassword.trim()) {
      toast({ title: "Error", description: "Both Gmail address and App Password are required", variant: "destructive" });
      return;
    }
    setGmailSaving(true);
    try {
      await apiRequest("POST", "/api/settings/gmail", {
        gmailAddress: userGmailAddress.trim(),
        gmailAppPassword: userGmailAppPassword.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
      setUserGmailAppPassword("");
      toast({ title: "Gmail saved", description: `Gmail configured as ${userGmailAddress.trim()}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save Gmail settings", variant: "destructive" });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleClearGmail = async () => {
    try {
      await apiRequest("DELETE", "/api/settings/gmail");
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
      setUserGmailAddress("");
      setUserGmailAppPassword("");
      toast({ title: "Gmail removed", description: "Your personal Gmail settings have been cleared." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to clear Gmail", variant: "destructive" });
    }
  };

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
      await apiRequest("POST", "/api/social-accounts", {
        platform: socialForm.platform,
        username: socialForm.username.trim().replace(/^@/, ""),
        profileUrl: socialForm.profileUrl.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setSocialForm({ platform: "", username: "", profileUrl: "" });
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

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card className="p-6 bg-card border-border/50" data-testid="card-profile">
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-integrations">
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
                      ? (emailStatus.address && emailStatus.address !== "Connected" ? emailStatus.address : "Connected")
                      : "Send and receive emails via Gmail"}
                  </p>
                  {emailStatus?.provider === "gmail" && (
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${emailStatus.canSend ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {emailStatus.canSend ? "✓ Send" : "✗ Send"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${emailStatus.canRead ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {emailStatus.canRead ? "✓ Read Inbox" : "⚠ Read Inbox (limited)"}
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
                          await apiRequest("POST", "/api/integrations/gmail/disconnect");
                          queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                          toast({ title: "Gmail disconnected", description: "Gmail integration has been deactivated." });
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
                      className="h-7 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                      disabled={gmailReconnecting}
                      onClick={async () => {
                        setGmailReconnecting(true);
                        try {
                          const res = await apiRequest("POST", "/api/integrations/gmail/reconnect");
                          const data = await res.json();
                          queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                          toast({ title: "Gmail reconnected", description: data.address ? `Connected as ${data.address}` : "Gmail integration has been reactivated." });
                        } catch {
                          toast({ title: "Connection Failed", description: "Gmail connection could not be verified. Please check your Gmail integration.", variant: "destructive" });
                        } finally {
                          setGmailReconnecting(false);
                        }
                      }}
                      data-testid="button-reconnect-gmail"
                    >
                      {gmailReconnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Connecting...</> : "Reconnect"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Platform Email</p>
                  <p className="text-xs text-muted-foreground">Fallback email service for agent communications</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-personal-gmail">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">Personal Gmail</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your own Gmail for AI agents to send/receive emails on your behalf. Requires a Gmail App Password.
          </p>
          {gmailSettings?.gmailAddress ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid="text-user-gmail">{gmailSettings.gmailAddress}</p>
                    <p className="text-xs text-emerald-400">Connected</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={handleClearGmail}
                  data-testid="button-remove-gmail"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Gmail Address</Label>
                <Input
                  value={userGmailAddress}
                  onChange={(e) => setUserGmailAddress(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="mt-1.5"
                  data-testid="input-user-gmail-address"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">App Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showGmailPassword ? "text" : "password"}
                    value={userGmailAppPassword}
                    onChange={(e) => setUserGmailAppPassword(e.target.value)}
                    placeholder="16-character app password"
                    data-testid="input-user-gmail-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGmailPassword(!showGmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-gmail-password"
                  >
                    {showGmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Go to Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords
                </p>
              </div>
              <Button
                onClick={handleSaveGmailSettings}
                disabled={gmailSaving || !userGmailAddress || !userGmailAppPassword}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0"
                data-testid="button-save-gmail"
              >
                {gmailSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" />Connect Gmail</>
                )}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-card border-border/50" data-testid="card-team-members">
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-social-accounts">
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
              onClick={() => { setSocialForm({ platform: "", username: "", profileUrl: "" }); setShowAddSocial(true); }}
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
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        {account.status}
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-subscription">
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-image-credits">
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
              <div className="grid grid-cols-3 gap-3">
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

        <Card className="p-6 bg-card border-border/50" data-testid="card-security">
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
  );
}
