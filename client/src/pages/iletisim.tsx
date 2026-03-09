import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { contactFormSchema, type ContactForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Iletisim() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactForm) => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/contact", data);
      setSubmitted(true);
      toast({
        title: "Mesajınız alındı",
        description: "En kısa sürede sizinle iletişime geçeceğiz.",
      });
    } catch {
      toast({
        title: "Hata",
        description: "Mesajınız gönderilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-contact-title">
              Bize{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Ulaşın
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI çalışanlarımız hakkında bilgi almak veya demo talep etmek için bizimle iletişime geçin.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <motion.div className="lg:col-span-3" {...fadeUp}>
              <Card className="p-8 bg-card border-border/50" data-testid="card-contact-form">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-success">
                      Mesajınız Başarıyla Gönderildi
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      Ekibimiz en kısa sürede sizinle iletişime geçecektir. Teşekkür ederiz.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => {
                        setSubmitted(false);
                        form.reset();
                      }}
                      data-testid="button-new-message"
                    >
                      Yeni Mesaj Gönder
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>İsim Soyisim</FormLabel>
                              <FormControl>
                                <Input placeholder="Adınız Soyadınız" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-posta</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="ornek@sirket.com" {...field} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon</FormLabel>
                              <FormControl>
                                <Input placeholder="+90 (5XX) XXX XX XX" {...field} data-testid="input-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Şirket Adı</FormLabel>
                              <FormControl>
                                <Input placeholder="Şirketinizin adı" {...field} data-testid="input-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mesajınız</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="AI çalışanlar hakkında detaylı bilgi almak istiyorum..."
                                className="min-h-[120px] resize-none"
                                {...field}
                                data-testid="input-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                        data-testid="button-submit"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gönderiliyor...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Mesaj Gönder
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </Card>
            </motion.div>

            <motion.div className="lg:col-span-2 space-y-6" {...fadeUp}>
              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4">İletişim Bilgileri</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E-posta</p>
                      <p className="text-sm text-foreground" data-testid="text-email">info@aiikajans.com</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefon</p>
                      <p className="text-sm text-foreground" data-testid="text-phone">+90 (212) 555 0123</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adres</p>
                      <p className="text-sm text-foreground" data-testid="text-address">Levent, Büyükdere Cad. No:128, İstanbul</p>
                    </div>
                  </li>
                </ul>
              </Card>

              <a
                href="https://wa.me/902125550123"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="p-6 bg-green-500/5 border-green-500/20 hover-elevate" data-testid="card-whatsapp">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <SiWhatsapp className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">WhatsApp ile Hızlı İletişim</h3>
                      <p className="text-sm text-muted-foreground">
                        Hemen mesaj gönderin, anında yanıt alın
                      </p>
                    </div>
                  </div>
                </Card>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
