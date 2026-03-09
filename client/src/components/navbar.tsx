import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Bot, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/calisanlar", label: "AI Çalışanlar" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır" },
  { href: "/fiyatlandirma", label: "Fiyatlandırma" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

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
                AI <span className="text-blue-500">İK</span> Ajansı
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" data-testid="nav-desktop">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    location === link.href
                      ? "text-blue-400"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`link-${link.href.replace("/", "") || "home"}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/demo">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 hidden sm:flex"
                data-testid="button-demo-cta"
              >
                Demo Dene
              </Button>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden"
                  aria-label="Menüyü aç"
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
                        data-testid={`mobile-link-${link.href.replace("/", "") || "home"}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                  <div className="mt-4 px-4">
                    <Link href="/demo">
                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                        onClick={() => setOpen(false)}
                        data-testid="button-mobile-demo"
                      >
                        Demo Dene
                      </Button>
                    </Link>
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
