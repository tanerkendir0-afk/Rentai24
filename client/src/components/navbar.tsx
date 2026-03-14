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
import { Menu, Bot, User, LayoutDashboard, Download, Smartphone, Wifi, Bell, Settings, LogOut, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const navLinks = [
  { href: "/workers", label: "AI Workers" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [location, setLoc] = useLocation();
  const { user, isLoading, logout } = useAuth();
  const { canInstall, install } = usePwaInstall();

  const handleInstallClick = () => {
    setInstallDialogOpen(true);
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
            {canInstall && (
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
                  {canInstall && (
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
    </header>
  );
}
