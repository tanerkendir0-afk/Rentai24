import { useState } from "react";
import { Link } from "wouter";
import { Bot, Mail, ArrowRight, Loader2, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { user } = useAuth();
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/newsletter", { email });
      const data = await res.json();
      setSubscribed(true);
      toast({ title: t("footer.subscribedToast"), description: data.message });
    } catch {
      toast({ title: t("footer.errorToast"), description: t("footer.errorDesc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-background border-t border-border/50" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">
                Rent<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI</span> 24
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { href: "/workers", label: t("nav.aiWorkers") },
                { href: "/pricing", label: t("nav.pricing") },
                { href: "/about", label: t("nav.about") },
                { href: "/contact", label: t("nav.contact") },
                { href: "/demo", label: t("footer.liveDemo") },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-xs sm:text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-block py-0.5 min-h-[44px] sm:min-h-0 flex items-center" data-testid={`footer-link-${link.href.replace("/", "")}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
              {user?.email === "tanerkendir0@gmail.com" && (
                <li>
                  <Link href={`/${import.meta.env.VITE_ADMIN_PATH}`}>
                    <span className="text-sm text-amber-400 cursor-pointer hover:text-amber-300 transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0" data-testid="footer-link-admin">
                      <Shield className="w-3 h-3" />
                      {t("footer.adminPanel")}
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t("footer.legal")}</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/privacy">
                  <span className="text-xs sm:text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-block py-0.5 min-h-[44px] sm:min-h-0 flex items-center" data-testid="footer-link-privacy">
                    {t("footer.privacyPolicy")}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <span className="text-xs sm:text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-block py-0.5 min-h-[44px] sm:min-h-0 flex items-center" data-testid="footer-link-terms">
                    {t("footer.termsOfService")}
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t("footer.newsletter")}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {t("footer.newsletterDesc")}
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t("footer.subscribed")}</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-newsletter"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 shrink-0"
                  aria-label="Subscribe"
                  data-testid="button-newsletter"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="w-3.5 h-3.5 mr-1" />
            hello@rentai24.com
          </div>
        </div>
      </div>
    </footer>
  );
}
