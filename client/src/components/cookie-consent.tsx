import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

export default function CookieConsent() {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const consent = localStorage.getItem("cookie_consent");
      if (consent === "accepted") {
        apiRequest("POST", "/api/consent", { consentType: "cookie", granted: true }).catch(() => {});
      }
    }
  }, [user]);

  const handleConsent = async (granted: boolean) => {
    localStorage.setItem("cookie_consent", granted ? "accepted" : "rejected");
    setVisible(false);
    try {
      await apiRequest("POST", "/api/consent", { consentType: "cookie", granted });
    } catch {}
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-10 duration-500"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-xl p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                {t("cookieConsent.title")}
              </h3>
              <button
                onClick={() => handleConsent(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                data-testid="button-cookie-dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {t("cookieConsent.description")}{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                {t("cookieConsent.privacyLink")}
              </Link>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleConsent(true)}
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 text-xs"
                data-testid="button-cookie-accept"
              >
                {t("cookieConsent.acceptAll")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConsent(false)}
                className="text-xs"
                data-testid="button-cookie-reject"
              >
                {t("cookieConsent.rejectAll")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
