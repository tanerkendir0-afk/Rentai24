import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Building2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { Link } from "wouter";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [inviteData, setInviteData] = useState<{ invitation: any; organization: any } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setFetchError(data.error || "Davet bulunamadı");
        } else {
          setInviteData(data);
        }
      })
      .catch(() => setFetchError("Davet bilgileri alınamadı"));
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      setLocation(`/login?redirect=/invite/${token}`);
      return;
    }
    setAccepting(true);
    try {
      const res = await apiRequest("POST", `/api/invite/${token}/accept`);
      const data = await res.json();
      if (res.ok) {
        setAccepted(true);
        queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      } else {
        setAcceptError(data.error || "Davet kabul edilemedi");
      }
    } catch {
      setAcceptError("Bir hata oluştu, lütfen tekrar deneyin");
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <Card className="p-6 sm:p-8 max-w-md w-full bg-card border-border/50">
        {fetchError ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Geçersiz Davet</h1>
            <p className="text-sm text-muted-foreground mb-6">{fetchError}</p>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard'a Dön</Button>
            </Link>
          </div>
        ) : accepted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Hoş Geldiniz!</h1>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>{inviteData?.organization?.name}</strong> organizasyonuna başarıyla katıldınız.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Artık organizasyon üyeleriyle iş birliği yapabilirsiniz.
            </p>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0">
                Dashboard'a Git
              </Button>
            </Link>
          </div>
        ) : !inviteData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Organizasyon Daveti</h1>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>{inviteData.organization?.name}</strong> organizasyonuna katılmak için davet aldınız.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Rol: <span className="font-medium capitalize">{inviteData.invitation?.role === "admin" ? "Yönetici" : "Üye"}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Davet e-postası: <span className="font-medium">{inviteData.invitation?.email}</span>
            </p>

            {acceptError && (
              <p className="text-sm text-red-400 mb-4">{acceptError}</p>
            )}

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Daveti kabul etmek için önce giriş yapmanız gerekiyor.</p>
                <Link href={`/login?redirect=/invite/${token}`}>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-login-to-accept">
                    <LogIn className="w-4 h-4 mr-2" />
                    Giriş Yap ve Kabul Et
                  </Button>
                </Link>
                <Link href={`/register?redirect=/invite/${token}`}>
                  <Button variant="outline" className="w-full" data-testid="button-register-to-accept">
                    Hesap Oluştur ve Kabul Et
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  <strong>{user.fullName}</strong> olarak giriş yapıldı
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                  onClick={handleAccept}
                  disabled={accepting}
                  data-testid="button-accept-invite"
                >
                  {accepting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Katılınıyor...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />Daveti Kabul Et</>
                  )}
                </Button>
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full" data-testid="button-decline-invite">
                    Reddet
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
