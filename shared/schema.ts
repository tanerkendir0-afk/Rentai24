import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1),
  agentType: z.string().min(1),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  company: z.string().min(2, "Şirket adı en az 2 karakter olmalıdır"),
  message: z.string().min(10, "Mesajınız en az 10 karakter olmalıdır"),
});

export type ContactForm = z.infer<typeof contactFormSchema>;
