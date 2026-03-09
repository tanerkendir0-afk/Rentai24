import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  ArrowRight,
  Search,
  Globe,
  Plug,
  Filter,
} from "lucide-react";
import { agents } from "@/data/agents";
import SectionCTA from "@/components/section-cta";

const agentIcons: Record<string, any> = {
  "musteri-hizmetleri": Headphones,
  "satis-pazarlama": TrendingUp,
  "sosyal-medya": Share2,
  "muhasebe": Calculator,
  "randevu-rezervasyon": CalendarCheck,
  "insan-kaynaklari": Users,
};

const allSectors = Array.from(new Set(agents.flatMap((a) => a.sectors)));

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Calisanlar() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  const filtered = useMemo(() => {
    return agents.filter((agent) => {
      const matchSearch =
        search === "" ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchSector =
        sectorFilter === "all" || agent.sectors.includes(sectorFilter);
      const matchPrice =
        priceFilter === "all" ||
        (priceFilter === "low" && agent.priceValue <= 4999) ||
        (priceFilter === "mid" && agent.priceValue > 4999 && agent.priceValue <= 5999) ||
        (priceFilter === "high" && agent.priceValue > 5999);
      return matchSearch && matchSector && matchPrice;
    });
  }, [search, sectorFilter, priceFilter]);

  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-calisanlar-title">
              AI Çalışan{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Kadromuz
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              İşletmenizin ihtiyaçlarına uygun AI çalışanı seçin ve hemen kullanmaya başlayın.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="AI çalışan veya yetenek ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-sector">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sektör" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sektörler</SelectItem>
                {allSectors.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-price">
                <SelectValue placeholder="Fiyat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Fiyatlar</SelectItem>
                <SelectItem value="low">₺4.999 ve altı</SelectItem>
                <SelectItem value="mid">₺5.000 - ₺5.999</SelectItem>
                <SelectItem value="high">₺6.000 ve üstü</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div
                  key={agent.id}
                  {...stagger}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className="p-6 bg-card border-border/50 h-full flex flex-col hover-elevate" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-lg">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.position}</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {agent.description}
                    </p>

                    <div className="mb-4">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Yetenekler</div>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Entegrasyonlar</div>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.integrations.map((integ) => (
                          <span key={integ} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                            <Plug className="w-3 h-3" />
                            {integ}
                          </span>
                        ))}
                      </div>
                    </div>

                    {agent.languages && (
                      <div className="mb-5">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Diller</div>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.languages.map((lang) => (
                            <span key={lang} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                              <Globe className="w-3 h-3" />
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-5 border-t border-border/50">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div>
                          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            {agent.price}
                          </span>
                          <span className="text-sm text-muted-foreground">/ay'dan başlayan</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Link href="/demo">
                          <Button variant="outline" className="flex-1" data-testid={`button-detail-${agent.id}`}>
                            Detayları Gör
                          </Button>
                        </Link>
                        <Link href="/iletisim">
                          <Button className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid={`button-hire-${agent.id}`}>
                            Hemen Kirala
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20" data-testid="text-no-results">
              <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Sonuç bulunamadı</h3>
              <p className="text-muted-foreground">Farklı filtreler deneyerek arama yapabilirsiniz.</p>
            </div>
          )}
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
