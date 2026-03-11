import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Bot, User, LayoutDashboard, Download } from "lucide-react";
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
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const { canInstall, install } = usePwaInstall();

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
                onClick={install}
                data-testid="button-install-pwa"
              >
                <Download className="w-4 h-4 mr-1" />
                Install App
              </Button>
            )}
            {!isLoading && user ? (
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 hidden sm:flex"
                  data-testid="button-dashboard"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
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
                        onClick={() => { install(); setOpen(false); }}
                        data-testid="button-mobile-install-pwa"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Install App
                      </Button>
                    </div>
                  )}
                  <div className="mt-4 px-4 space-y-2">
                    {user ? (
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
    </header>
  );
}
