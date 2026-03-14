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
import { Menu, Bot, User, LayoutDashboard, Download, Smartphone, Wifi, Bell, Settings, LogOut, BookOpen, Share, Plus, MoreHorizontal, Monitor, Globe, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import type { PwaPlatform } from "@/hooks/use-pwa-install";

const navLinks = [
  { href: "/workers", label: "AI Workers" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function ManualInstallGuide({ platform }: { platform: PwaPlatform }) {
  if (platform === "ios-safari") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-ios-safari">
        <p className="text-sm text-muted-foreground">Follow these steps to add RentAI 24 to your home screen:</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">Tap the <strong>Share</strong> button in the toolbar</p>
              <Share className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              <Plus className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">3</span>
            </div>
            <div>
              <p className="text-sm text-foreground">Tap <strong>"Add"</strong> in the top-right corner</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "macos-safari") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-macos-safari">
        <p className="text-sm text-muted-foreground">Follow these steps to add RentAI 24 to your Dock:</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">Click <strong>File</strong> in the Safari menu bar</p>
              <Monitor className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div>
              <p className="text-sm text-foreground">Select <strong>"Add to Dock"</strong></p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">3</span>
            </div>
            <div>
              <p className="text-sm text-foreground">Click <strong>"Add"</strong> to confirm</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "firefox") {
    return (
      <div className="space-y-4 py-4" data-testid="guide-firefox">
        <p className="text-sm text-muted-foreground">Firefox has limited PWA support. You can try:</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">Tap the <strong>menu button</strong> (three dots) in the address bar</p>
              <MoreHorizontal className="w-5 h-5 text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div>
              <p className="text-sm text-foreground">Look for <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong></p>
            </div>
          </div>
        </div>
        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> For the best experience, open this site in Chrome, Edge, or Safari to install the app natively.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4" data-testid="guide-other">
      <p className="text-sm text-muted-foreground">To install this app, try one of the following:</p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-foreground">Look for an <strong>install icon</strong> in your browser's address bar or menu</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <ExternalLink className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-foreground">Or open this site in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> for the best install experience</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGuideDialogTitle(platform: PwaPlatform): string {
  switch (platform) {
    case "ios-safari": return "Add to Home Screen";
    case "macos-safari": return "Add to Dock";
    case "firefox": return "Install RentAI 24";
    default: return "Install RentAI 24";
  }
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [location, setLoc] = useLocation();
  const { user, isLoading, logout } = useAuth();
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
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">
                Rent<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI</span>{" "}
                <span className="text-foreground">24</span>
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" data-testid="nav-desktop">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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

          <div className="flex items-center gap-3">
            {showInstallButton && (
              <Button
                size="sm"
                variant="outline"
                className="hidden sm:flex border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                onClick={handleInstallClick}
                data-testid="button-install-pwa"
              >
                <Download className="w-4 h-4 mr-1" />
                Install App
              </Button>
            )}
            {!isLoading && user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/guide">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid="button-guide"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Guide
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid="button-settings"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                    data-testid="button-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : !isLoading ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button size="sm" variant="ghost" data-testid="button-login">
                    <User className="w-4 h-4 mr-1" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                    data-testid="button-demo-cta"
                  >
                    Try Live Demo
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
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <span
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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
                        Install App
                      </Button>
                    </div>
                  )}
                  <div className="mt-4 px-4 space-y-2">
                    {user ? (
                      <>
                        <Link href="/dashboard">
                          <Button
                            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-dashboard"
                          >
                            <LayoutDashboard className="w-4 h-4 mr-1" />
                            Dashboard
                          </Button>
                        </Link>
                        <Link href="/guide">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-guide"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Guide
                          </Button>
                        </Link>
                        <Link href="/settings">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-settings"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={() => { setOpen(false); handleLogout(); }}
                          data-testid="button-mobile-logout"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-login"
                          >
                            Sign In
                          </Button>
                        </Link>
                        <Link href="/demo">
                          <Button
                            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                            onClick={() => setOpen(false)}
                            data-testid="button-mobile-demo"
                          >
                            Try Live Demo
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
              Install RentAI 24
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Get the full app experience on your device:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Works like a native app</p>
                <p className="text-xs text-muted-foreground">Opens in its own window — no browser tabs needed.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Wifi className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Fast & always accessible</p>
                <p className="text-xs text-muted-foreground">Launch instantly from your home screen or desktop.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Stay up to date</p>
                <p className="text-xs text-muted-foreground">Get quick access to your AI workforce anytime.</p>
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
              Install Now
            </Button>
            <Button variant="outline" onClick={() => setInstallDialogOpen(false)} data-testid="button-cancel-install">
              Not Now
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
              Your browser doesn't support automatic installation. Follow the steps below:
            </DialogDescription>
          </DialogHeader>
          <ManualInstallGuide platform={platform} />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setGuideDialogOpen(false)} data-testid="button-close-guide">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
