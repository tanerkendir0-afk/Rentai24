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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">Settings</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gmail</p>
                  <p className="text-xs text-muted-foreground">
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
              <div className="flex items-center gap-2">
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
                    onChange={(e) => setCreditCard(prev => ({ ...prev, number: e.target.value }))}
                    className="mt-1"
                    data-testid="input-settings-credit-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Expiry</Label>
                    <Input
                      placeholder="12/28"
                      value={creditCard.expiry}
                      onChange={(e) => setCreditCard(prev => ({ ...prev, expiry: e.target.value }))}
                      className="mt-1"
                      data-testid="input-settings-credit-expiry"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CVC</Label>
                    <Input
                      placeholder="123"
                      value={creditCard.cvc}
                      onChange={(e) => setCreditCard(prev => ({ ...prev, cvc: e.target.value }))}
                      className="mt-1"
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
