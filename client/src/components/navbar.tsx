import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Bot, User, LayoutDashboard, Download, Smartphone, Wifi, Bell, Settings, LogOut, BookOpen, Share, Plus, MoreHorizontal, Monitor, Globe, ExternalLink, Shield, Languages, Zap, Timer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { useTranslation } from "react-i18next";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import type { PwaPlatform } from "@/hooks/use-pwa-install";

function useNavLinks() {
  const { t } = useTranslation("common");
  return [
    { href: "/workers", label: t("nav.aiWorkers") },
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];
}

function ManualInstallGuide({ platform }: { platform: PwaPlatform }) {
  const { t } = useTranslation("common");

  if (platform === "ios-safari") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-ios-safari">
        <p className="text-sm text-muted-foreground">{t("install.iosSafari.description")}</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.iosSafari.step1") }} />
              <Share className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.iosSafari.step2") }} />
              <Plus className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">3</span>
            </div>
            <div>
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.iosSafari.step3") }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "macos-safari") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-macos-safari">
        <p className="text-sm text-muted-foreground">{t("install.macosSafari.description")}</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.macosSafari.step1") }} />
              <Monitor className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div>
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.macosSafari.step2") }} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">3</span>
            </div>
            <div>
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.macosSafari.step3") }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "firefox") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-firefox">
        <p className="text-sm text-muted-foreground">{t("install.firefox.description")}</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.firefox.step1") }} />
              <MoreHorizontal className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div>
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.firefox.step2") }} />
            </div>
          </div>
        </div>
        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t("install.firefox.tip") }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4" data-testid="guide-other">
      <p className="text-sm text-muted-foreground">{t("install.other.description")}</p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.other.lookForInstall") }} />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <ExternalLink className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t("install.other.openInBrowser") }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function useGuideDialogTitle() {
  const { t } = useTranslation("common");
  return (platform: PwaPlatform): string => {
    switch (platform) {
      case "ios-safari": return t("install.addToHomeScreen");
      case "macos-safari": return t("install.addToDock");
      case "firefox": return t("install.installRentAI");
      default: return t("install.installRentAI");
    }
  };
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [location, setLoc] = useLocation();
  const { user, isLoading, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation("common");
  const navLinks = useNavLinks();
  const getGuideDialogTitle = useGuideDialogTitle();
  const { canInstall, install, showManualGuide, platform } = usePwaInstall();

  const handleInstallClick = () => {
    if (canInstall) {
      setInstallDialogOpen(true);
    } else if (showManualGuide) {
      setGuideDialogOpen(true);
    }
  };

  const confirmInstall = async () => {
    setInstallDialogOpen(false);
    await install();
  };

  const handleLogout = async () => {
    await logout();
    setLoc("/");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showInstallButton = canInstall || showManualGuide;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" data-testid="link-home" className="shrink-0">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground whitespace-nowrap">
                Rent<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI</span>{" "}
                <span className="text-foreground">24</span>
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 min-w-0" data-testid="nav-desktop">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    location === link.href || (link.href !== "/" && location.startsWith(link.href))
                      ? "text-blue-400"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`link-${link.href.replace("/", "")}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => changeLanguage(language === "en" ? "tr" : "en")}
              className="text-muted-foreground hover:text-foreground whitespace-nowrap"
              data-testid="button-language-switch"
              title={t("language.switchTo", { lang: language === "en" ? t("language.turkish") : t("language.english") })}
            >
              <Languages className="w-4 h-4 mr-1" />
              {language === "en" ? "TR" : "EN"}
            </Button>
            {showInstallButton && !user && (
              <Button
                size="sm"
                variant="outline"
                className="hidden xl:flex border-blue-500/30 text-blue-400 hover:bg-blue-500/10 whitespace-nowrap"
                onClick={handleInstallClick}
                data-testid="button-install-pwa"
              >
                <Download className="w-4 h-4 mr-1" />
                {t("nav.installApp")}
              </Button>
            )}
            {!isLoading && user ? (
              <div className="hidden lg:flex items-center gap-1">
                <Link href="/dashboard">
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 whitespace-nowrap" data-testid="button-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-1" />
                    {t("nav.dashboard")}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="button-more-menu">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link href="/guide" className="flex items-center gap-2 cursor-pointer" data-testid="dropdown-item-guide">
                        <BookOpen className="w-4 h-4" />
                        {t("nav.guide")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/automations" className="flex items-center gap-2 cursor-pointer" data-testid="dropdown-item-automations">
                        <Zap className="w-4 h-4" />
                        {t("nav.automations")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/scheduled-tasks" className="flex items-center gap-2 cursor-pointer" data-testid="dropdown-item-scheduled-tasks">
                        <Timer className="w-4 h-4" />
                        Zamanlanmış Görevler
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer" data-testid="dropdown-item-settings">
                        <Settings className="w-4 h-4" />
                        {t("nav.settings")}
                      </Link>
                    </DropdownMenuItem>
                    {showInstallButton && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleInstallClick} className="flex items-center gap-2 cursor-pointer" data-testid="dropdown-item-install">
                          <Download className="w-4 h-4" />
                          {t("nav.installApp")}
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.email === "tanerkendir0@gmail.com" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/${import.meta.env.VITE_ADMIN_PATH}`} className="flex items-center gap-2 cursor-pointer text-amber-400" data-testid="dropdown-item-admin">
                            <Shield className="w-4 h-4" />
                            {t("nav.admin")}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-muted-foreground" data-testid="dropdown-item-logout">
                      <LogOut className="w-4 h-4" />
                      {t("nav.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : !isLoading ? (
              <div className="hidden sm:flex items-center gap-1">
                <Link href="/login">
                  <Button size="sm" variant="ghost" data-testid="button-login" className="whitespace-nowrap">
                    <User className="w-4 h-4 mr-1" />
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 whitespace-nowrap"
                    data-testid="button-demo-cta"
                  >
                    {t("nav.tryLiveDemo")}
                  </Button>
                </Link>
              </div>
            ) : null}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden"
                  aria-label="Open menu"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-background border-border">
                <div className="flex flex-col gap-1 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <span
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-3 min-h-[44px] flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer ${
                          location === link.href
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-muted-foreground"
                        }`}
                        data-testid={`mobile-link-${link.href.replace("/", "")}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                  {showInstallButton && (
                    <div className="px-4 mt-4">
                      <Button
                        variant="outline"
                        className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => { setOpen(false); handleInstallClick(); }}
                        data-testid="button-mobile-install-pwa"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {t("nav.installApp")}
                      </Button>
                    </div>
                  )}
                  <div className="mt-4 px-4 space-y-2">
                    {user ? (
                      <>
                        <Link href="/dashboard">
                          <Button
                            className="w-full min-h-[44px] bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-dashboard"
                          >
                            <LayoutDashboard className="w-4 h-4 mr-1" />
                            {t("nav.dashboard")}
                          </Button>
                        </Link>
                        <Link href="/guide">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-guide"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            {t("nav.guide")}
                          </Button>
                        </Link>
                        <Link href="/automations">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-automations"
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            {t("nav.automations")}
                          </Button>
                        </Link>
                        <Link href="/scheduled-tasks">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-scheduled-tasks"
                          >
                            <Timer className="w-4 h-4 mr-1" />
                            Zamanlanmış Görevler
                          </Button>
                        </Link>
                        <Link href="/settings">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-settings"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            {t("nav.settings")}
                          </Button>
                        </Link>
                        {user.email === "tanerkendir0@gmail.com" && (
                          <Link href={`/${import.meta.env.VITE_ADMIN_PATH}`}>
                            <Button
                              variant="outline"
                              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => setOpen(false)}
                              data-testid="button-mobile-admin"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              {t("nav.admin")}
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          className="w-full min-h-[44px] text-muted-foreground hover:text-foreground"
                          onClick={() => { setOpen(false); handleLogout(); }}
                          data-testid="button-mobile-logout"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          {t("nav.signOut")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-login"
                          >
                            {t("nav.signIn")}
                          </Button>
                        </Link>
                        <Link href="/demo">
                          <Button
                            className="w-full min-h-[44px] bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-demo"
                          >
                            {t("nav.tryLiveDemo")}
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-install-dialog-title">
              {t("install.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("install.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("install.nativeApp")}</p>
                <p className="text-xs text-muted-foreground">{t("install.nativeAppDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Wifi className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("install.fast")}</p>
                <p className="text-xs text-muted-foreground">{t("install.fastDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("install.upToDate")}</p>
                <p className="text-xs text-muted-foreground">{t("install.upToDateDesc")}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
              onClick={confirmInstall}
              data-testid="button-confirm-install-pwa"
            >
              <Download className="w-4 h-4 mr-1" />
              {t("install.installNow")}
            </Button>
            <Button variant="outline" onClick={() => setInstallDialogOpen(false)} data-testid="button-cancel-install">
              {t("install.notNow")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-guide-dialog-title">
              {getGuideDialogTitle(platform)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("install.guideDescription")}
            </DialogDescription>
          </DialogHeader>
          <ManualInstallGuide platform={platform} />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setGuideDialogOpen(false)} data-testid="button-close-guide">
              {t("install.gotIt")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
