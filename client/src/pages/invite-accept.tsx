import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Building2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [inviteData, setInviteData] = useState<{ invitation: any; organization: any } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const { t } = useTranslation("pages");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setFetchError(data.error || t("invite.notFound"));
        } else {
          setInviteData(data);
        }
      })
      .catch(() => setFetchError(t("invite.fetchError")));
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
        setAcceptError(data.error || t("invite.acceptError"));
      }
    } catch {
      setAcceptError(t("invite.genericError"));
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
            <h1 className="text-xl font-bold text-foreground mb-2">{t("invite.invalidInvite")}</h1>
            <p className="text-sm text-muted-foreground mb-6">{fetchError}</p>
            <Link href="/dashboard">
              <Button variant="outline">{t("invite.backToDashboard")}</Button>
            </Link>
          </div>
        ) : accepted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">{t("invite.welcome")}</h1>
            <p className="text-sm text-muted-foreground mb-2">
              {t("invite.joinedSuccess", { orgName: inviteData?.organization?.name })}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {t("invite.canCollaborate")}
            </p>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0">
                {t("invite.goToDashboard")}
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
            <h1 className="text-xl font-bold text-foreground mb-2">{t("invite.orgInvite")}</h1>
            <p className="text-sm text-muted-foreground mb-1">
              {t("invite.invitedToOrg", { orgName: inviteData.organization?.name })}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {t("invite.roleLabel")}: <span className="font-medium capitalize">{inviteData.invitation?.role === "admin" ? t("invite.roleAdmin") : t("invite.roleMember")}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {t("invite.inviteEmail")}: <span className="font-medium">{inviteData.invitation?.email}</span>
            </p>

            {acceptError && (
              <p className="text-sm text-red-400 mb-4">{acceptError}</p>
            )}

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("invite.loginRequired")}</p>
                <Link href={`/login?redirect=/invite/${token}`}>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-login-to-accept">
                    <LogIn className="w-4 h-4 mr-2" />
                    {t("invite.loginAndAccept")}
                  </Button>
                </Link>
                <Link href={`/register?redirect=/invite/${token}`}>
                  <Button variant="outline" className="w-full" data-testid="button-register-to-accept">
                    {t("invite.registerAndAccept")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t("invite.loggedInAs", { name: user.fullName })}
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                  onClick={handleAccept}
                  disabled={accepting}
                  data-testid="button-accept-invite"
                >
                  {accepting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("invite.joining")}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />{t("invite.acceptInvite")}</>
                  )}
                </Button>
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full" data-testid="button-decline-invite">
                    {t("invite.decline")}
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
