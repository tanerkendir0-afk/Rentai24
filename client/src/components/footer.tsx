import { Link } from "wouter";
import { Bot, Mail, ArrowRight } from "lucide-react";
import { SiLinkedin, SiX, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
                Rent<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI</span> 24
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Rent AI, 24/7. Pre-trained AI agents ready to join your team today.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-twitter">
                <SiX className="w-4 h-4" />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-linkedin">
                <SiLinkedin className="w-4 h-4" />
              </a>
              <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-md bg-card flex items-center justify-center text-muted-foreground transition-colors" data-testid="link-youtube">
                <SiYoutube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { href: "/workers", label: "AI Workers" },
                { href: "/pricing", label: "Pricing" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/demo", label: "Live Demo" },
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
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Get the latest on AI workforce trends and product updates.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2"
            >
              <Input
                type="email"
                placeholder="your@email.com"
                className="flex-1"
                data-testid="input-newsletter"
              />
              <Button size="icon" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 shrink-0" aria-label="Subscribe" data-testid="button-newsletter">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} RentAI 24. All rights reserved.
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
