import { Link } from "wouter";
import { Bot, Mail, Phone, MapPin } from "lucide-react";
import { SiLinkedin, SiInstagram, SiX } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border/50" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">
                AI <span className="text-blue-500">İK</span> Ajansı
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              İşletmeniz için eğitimi tamamlanmış hazır AI çalışanlar. 7/24 kesintisiz hizmet.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-linkedin">
                <SiLinkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-instagram">
                <SiInstagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-twitter">
                <SiX className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Hızlı Bağlantılar</h4>
            <ul className="space-y-3">
              {[
                { href: "/calisanlar", label: "AI Çalışanlar" },
                { href: "/nasil-calisir", label: "Nasıl Çalışır" },
                { href: "/fiyatlandirma", label: "Fiyatlandırma" },
                { href: "/hakkimizda", label: "Hakkımızda" },
                { href: "/demo", label: "Demo Dene" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-muted-foreground cursor-pointer" data-testid={`footer-link-${link.href.replace("/", "")}`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">AI Çalışanlar</h4>
            <ul className="space-y-3">
              {[
                "Müşteri Hizmetleri",
                "Satış & Pazarlama",
                "Sosyal Medya",
                "Muhasebe",
                "Randevu Yönetimi",
                "İnsan Kaynakları",
              ].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                info@aiikajans.com
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                +90 (212) 555 0123
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                Levent, Büyükdere Cad. No:128, İstanbul
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} AI İK Ajansı. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
