import type { SupportedLang } from "./i18n";

type MessageMap = Record<SupportedLang, string>;

const messages = {
  authRequired: {
    en: "Authentication required",
    tr: "Kimlik doğrulama gerekli",
  },
  userNotFound: {
    en: "User not found",
    tr: "Kullanıcı bulunamadı",
  },
  insufficientPermissions: {
    en: "Insufficient permissions",
    tr: "Yetersiz yetki",
  },
  invalidData: {
    en: "Invalid data",
    tr: "Geçersiz veri",
  },
  emailExists: {
    en: "An account with this email already exists",
    tr: "Bu e-posta adresiyle zaten bir hesap mevcut",
  },
  usernameTaken: {
    en: "This username is already taken",
    tr: "Bu kullanıcı adı zaten alınmış",
  },
  invalidCredentials: {
    en: "Invalid credentials",
    tr: "Geçersiz kimlik bilgileri",
  },
  invalidEmailOrPassword: {
    en: "Invalid email or password",
    tr: "Geçersiz e-posta veya şifre",
  },
  googleSignIn: {
    en: "This account uses Google sign-in. Please sign in with Google instead.",
    tr: "Bu hesap Google ile giriş kullanıyor. Lütfen Google ile giriş yapın.",
  },
  sessionError: {
    en: "Session error",
    tr: "Oturum hatası",
  },
  logoutFailed: {
    en: "Failed to log out",
    tr: "Çıkış yapılamadı",
  },
  notAuthenticated: {
    en: "Not authenticated",
    tr: "Oturum açılmamış",
  },
  invalidLanguage: {
    en: "Invalid language. Must be 'en' or 'tr'.",
    tr: "Geçersiz dil. 'en' veya 'tr' olmalıdır.",
  },
  invalidInput: {
    en: "Invalid input",
    tr: "Geçersiz giriş",
  },
  googleNoPassword: {
    en: "This account uses Google sign-in and has no password set. Please sign in with Google.",
    tr: "Bu hesap Google ile giriş kullanıyor ve şifre ayarlanmamış. Lütfen Google ile giriş yapın.",
  },
  currentPasswordIncorrect: {
    en: "Current password is incorrect",
    tr: "Mevcut şifre yanlış",
  },
  titleAgentRequired: {
    en: "Title and agentType are required",
    tr: "Başlık ve ajan tipi gereklidir",
  },
  taskNotFound: {
    en: "Task not found",
    tr: "Görev bulunamadı",
  },
  conversationNotFound: {
    en: "Conversation not found",
    tr: "Konuşma bulunamadı",
  },
  nameEmailRequired: {
    en: "Name and email are required",
    tr: "İsim ve e-posta gereklidir",
  },
  invalidMemberId: {
    en: "Invalid member ID",
    tr: "Geçersiz üye kimliği",
  },
  teamMemberNotFound: {
    en: "Team member not found",
    tr: "Ekip üyesi bulunamadı",
  },
  fullNameRequired: {
    en: "Full name is required",
    tr: "Ad soyad gereklidir",
  },
  rateLimitExceeded: {
    en: "Too many messages. Please wait a moment before sending again.",
    tr: "Çok fazla mesaj. Lütfen tekrar göndermeden önce biraz bekleyin.",
  },
  messageTooLong: {
    en: "Message too long.",
    tr: "Mesaj çok uzun.",
  },
  invalidRequest: {
    en: "Invalid request format.",
    tr: "Geçersiz istek formatı.",
  },
  blockedTopic: {
    en: "I cannot provide information on this topic.",
    tr: "Bu konu hakkında bilgi veremiyorum.",
  },
  dailyTokenLimit: {
    en: "You have reached your daily token limit. Please try again tomorrow.",
    tr: "Günlük token limitinize ulaştınız. Lütfen yarın tekrar deneyin.",
  },
  weeklyTokenLimit: {
    en: "You have reached your weekly token limit. Please try again next week.",
    tr: "Haftalık token limitinize ulaştınız. Lütfen gelecek hafta tekrar deneyin.",
  },
  monthlyTokenLimit: {
    en: "You have reached your monthly token limit. Please try again next month.",
    tr: "Aylık token limitinize ulaştınız. Lütfen gelecek ay tekrar deneyin.",
  },
  dailyMessageLimit: {
    en: "You have reached your daily message limit. Please try again tomorrow.",
    tr: "Günlük mesaj limitinize ulaştınız. Lütfen yarın tekrar deneyin.",
  },
  weeklyMessageLimit: {
    en: "You have reached your weekly message limit. Please try again next week.",
    tr: "Haftalık mesaj limitinize ulaştınız. Lütfen gelecek hafta tekrar deneyin.",
  },
  monthlyMessageLimit: {
    en: "You have reached your monthly message limit. Please try again next month.",
    tr: "Aylık mesaj limitinize ulaştınız. Lütfen gelecek ay tekrar deneyin.",
  },
  noResponseGenerated: {
    en: "Sorry, I could not generate a response right now. Please try again.",
    tr: "Üzgünüm, şu anda yanıt oluşturamadım. Lütfen tekrar deneyin.",
  },
  responseTruncated: {
    en: "[Response truncated.]",
    tr: "[Yanıt kısaltıldı.]",
  },
} satisfies Record<string, MessageMap>;

export type MessageKey = keyof typeof messages;

export function msg(key: MessageKey, lang: SupportedLang): string {
  return messages[key][lang];
}

export default messages;
