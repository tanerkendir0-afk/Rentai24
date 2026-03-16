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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock, Send, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { contactFormSchema, type ContactForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { agents } from "@/data/agents";
import SectionCTA from "@/components/section-cta";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const ta = useTranslation("agents").t;

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      companySize: "",
      aiWorkerInterest: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactForm) => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/contact", data);
      setSubmitted(true);
      toast({ title: t("contact.toast.sent"), description: t("contact.toast.sentDesc") });
    } catch {
      toast({ title: t("contact.toast.error"), description: t("contact.toast.errorDesc"), variant: "destructive" });
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
              {t("contact.title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("contact.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <motion.div className="lg:col-span-3" {...fadeUp}>
              <Card className="p-8 bg-card border-border/50" data-testid="card-contact-form">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-success">
                      {t("contact.success.title")}
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      {t("contact.success.description")}
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => { setSubmitted(false); form.reset(); }} data-testid="button-new-message">
                      {t("contact.success.newMessage")}
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.fullName")}</FormLabel>
                            <FormControl><Input placeholder={t("contact.form.namePlaceholder")} {...field} data-testid="input-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.businessEmail")}</FormLabel>
                            <FormControl><Input type="email" placeholder={t("contact.form.emailPlaceholder")} {...field} data-testid="input-email" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField control={form.control} name="company" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.companyName")}</FormLabel>
                            <FormControl><Input placeholder={t("contact.form.companyPlaceholder")} {...field} data-testid="input-company" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="companySize" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.companySize")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-company-size">
                                  <SelectValue placeholder={t("contact.form.selectSize")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1-10">{t("contact.form.size1_10")}</SelectItem>
                                <SelectItem value="11-50">{t("contact.form.size11_50")}</SelectItem>
                                <SelectItem value="51-200">{t("contact.form.size51_200")}</SelectItem>
                                <SelectItem value="200+">{t("contact.form.size200plus")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="aiWorkerInterest" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contact.form.aiWorkerInterest")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ai-worker">
                                <SelectValue placeholder={t("contact.form.selectWorker")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not-sure">{t("contact.form.notSure")}</SelectItem>
                              {agents.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{ta(`${a.id}.name`)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contact.form.message")}</FormLabel>
                          <FormControl>
                            <Textarea placeholder={t("contact.form.messagePlaceholder")} className="min-h-[120px] resize-none" {...field} data-testid="input-message" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-submit">
                        {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("contact.form.sending")}</>) : (<><Send className="w-4 h-4 mr-2" />{t("contact.form.sendMessage")}</>)}
                      </Button>
                    </form>
                  </Form>
                )}
              </Card>
            </motion.div>

            <motion.div className="lg:col-span-2 space-y-6" {...fadeUp}>
              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4">{t("contact.info.title")}</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("contact.info.email")}</p>
                      <p className="text-sm text-foreground" data-testid="text-email">{t("contact.info.emailAddress")}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("contact.info.scheduleCall")}</p>
                      <p className="text-sm text-foreground">{t("contact.info.scheduleCallDesc")}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("contact.info.responseTime")}</p>
                      <p className="text-sm text-foreground" data-testid="text-response-time">{t("contact.info.responseTimeVal")}</p>
                    </div>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4">{t("contact.quickLinks.title")}</h3>
                <div className="space-y-3">
                  <a href="/demo" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="contact-link-demo">
                    {t("contact.quickLinks.liveDemo")}
                  </a>
                  <a href="/pricing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="contact-link-pricing">
                    {t("contact.quickLinks.viewPricing")}
                  </a>
                  <a href="/how-it-works" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="contact-link-how">
                    {t("contact.quickLinks.howItWorks")}
                  </a>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
