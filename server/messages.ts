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
  agentTypeRequired: {
    en: "agentType is required",
    tr: "Ajan tipi gereklidir",
  },
  agentTypeAndVisibleIdRequired: {
    en: "agentType and visibleId are required",
    tr: "Ajan tipi ve görünen kimlik gereklidir",
  },
  titleRequired: {
    en: "title is required",
    tr: "Başlık gereklidir",
  },
  failedGoogleAuth: {
    en: "Failed to generate Google auth URL",
    tr: "Google kimlik doğrulama URL'si oluşturulamadı",
  },
  gmailCredentialsRequired: {
    en: "Gmail address and app password are required",
    tr: "Gmail adresi ve uygulama şifresi gereklidir",
  },
  invalidEmailFormat: {
    en: "Invalid email address format",
    tr: "Geçersiz e-posta adresi formatı",
  },
  meetingFieldsRequired: {
    en: "type, teamMemberName, and summary are required",
    tr: "Tür, ekip üyesi adı ve özet gereklidir",
  },
  platformUsernameRequired: {
    en: "Platform and username are required",
    tr: "Platform ve kullanıcı adı gereklidir",
  },
  invalidPlatform: {
    en: "Invalid platform",
    tr: "Geçersiz platform",
  },
  invalidId: {
    en: "Invalid ID",
    tr: "Geçersiz kimlik",
  },
  accountNotFound: {
    en: "Account not found",
    tr: "Hesap bulunamadı",
  },
  postNotFound: {
    en: "Post not found or already published/cancelled",
    tr: "Gönderi bulunamadı veya zaten yayınlandı/iptal edildi",
  },
  providerApiKeyRequired: {
    en: "Provider and API key are required",
    tr: "Sağlayıcı ve API anahtarı gereklidir",
  },
  invalidProvider: {
    en: "Invalid shipping provider",
    tr: "Geçersiz kargo sağlayıcısı",
  },
  providerNotFound: {
    en: "Provider not found",
    tr: "Sağlayıcı bulunamadı",
  },
  whatsappConfigRequired: {
    en: "Phone Number ID, Access Token, and Verify Token are required",
    tr: "Telefon Numarası Kimliği, Erişim Belirteci ve Doğrulama Belirteci gereklidir",
  },
  whatsappConfigNotFound: {
    en: "No WhatsApp config found",
    tr: "WhatsApp yapılandırması bulunamadı",
  },
  whatsappNotConfigured: {
    en: "WhatsApp not configured",
    tr: "WhatsApp yapılandırılmamış",
  },
  subjectDescriptionRequired: {
    en: "Subject and description are required",
    tr: "Konu ve açıklama gereklidir",
  },
  ticketNotFound: {
    en: "Ticket not found",
    tr: "Destek talebi bulunamadı",
  },
  invalidAgentType: {
    en: "Invalid agent type",
    tr: "Geçersiz ajan tipi",
  },
  subscriptionRequired: {
    en: "An active subscription is required. Please subscribe from the Pricing page first.",
    tr: "Aktif bir abonelik gereklidir. Lütfen önce Fiyatlandırma sayfasından abone olun.",
  },
  alreadyRented: {
    en: "You already have an active rental for this agent",
    tr: "Bu ajan için zaten aktif bir kiralama mevcut",
  },
  subscriptionNotActive: {
    en: "Your subscription is not active. Please update your billing.",
    tr: "Aboneliğiniz aktif değil. Lütfen fatura bilgilerinizi güncelleyin.",
  },
  imageNotFound: {
    en: "Image not found",
    tr: "Görsel bulunamadı",
  },
  internalServerError: {
    en: "Internal server error",
    tr: "Sunucu hatası",
  },
  topicRequired: {
    en: "Topic is required",
    tr: "Konu gereklidir",
  },
  messagesMustBeArray: {
    en: "Messages must be an array",
    tr: "Mesajlar bir dizi olmalıdır",
  },
  accessDenied: {
    en: "Access denied",
    tr: "Erişim reddedildi",
  },
  ruleNotFound: {
    en: "Rule not found",
    tr: "Kural bulunamadı",
  },
  escalationNotFound: {
    en: "Escalation not found",
    tr: "Eskalasyon bulunamadı",
  },
  messageContentRequired: {
    en: "Message content required",
    tr: "Mesaj içeriği gereklidir",
  },
  instructionsRequired: {
    en: "instructions is required",
    tr: "Talimat gereklidir",
  },
  missingRequiredFields: {
    en: "Missing required fields",
    tr: "Zorunlu alanlar eksik",
  },
  unsupportedFileType: {
    en: "Unsupported file type",
    tr: "Desteklenmeyen dosya türü",
  },
  fileSizeLimit: {
    en: "File size must be between 1 byte and 5MB",
    tr: "Dosya boyutu 1 bayt ile 5MB arasında olmalıdır",
  },
  contentTooLarge: {
    en: "Content too large",
    tr: "İçerik çok büyük",
  },
  documentNotFound: {
    en: "Document not found",
    tr: "Belge bulunamadı",
  },
  failedDisconnectGmail: {
    en: "Failed to disconnect Gmail",
    tr: "Gmail bağlantısı kesilemedi",
  },
  failedSaveGmail: {
    en: "Failed to save Gmail settings",
    tr: "Gmail ayarları kaydedilemedi",
  },
  failedCheckGmail: {
    en: "Failed to check Gmail status",
    tr: "Gmail durumu kontrol edilemedi",
  },
  failedCreateNotification: {
    en: "Failed to create notification",
    tr: "Bildirim oluşturulamadı",
  },
  fileTooLarge: {
    en: "File is too large. Maximum file size is 10MB.",
    tr: "Dosya çok büyük. Maksimum dosya boyutu 10MB.",
  },
  fileUploadError: {
    en: "An error occurred while uploading the file.",
    tr: "Dosya yüklenirken bir hata oluştu.",
  },
  noFileProvided: {
    en: "No file provided",
    tr: "Dosya sağlanmadı",
  },
  fileNotFound: {
    en: "File not found",
    tr: "Dosya bulunamadı",
  },
  invalidFormData: {
    en: "Please check your form data",
    tr: "Lütfen form verilerinizi kontrol edin",
  },
  failedSaveMessage: {
    en: "Failed to save your message. Please try again.",
    tr: "Mesajınız kaydedilemedi. Lütfen tekrar deneyin.",
  },
  invalidEmailAddress: {
    en: "Please enter a valid email address",
    tr: "Lütfen geçerli bir e-posta adresi girin",
  },
  failedSubscribe: {
    en: "Failed to subscribe. Please try again.",
    tr: "Abone olunamadı. Lütfen tekrar deneyin.",
  },
  stripeNotConfigured: {
    en: "Stripe not configured",
    tr: "Stripe yapılandırılmamış",
  },
  invalidPlan: {
    en: "Invalid plan",
    tr: "Geçersiz plan",
  },
  cardDeclined: {
    en: "Card declined. Please try a different card.",
    tr: "Kart reddedildi. Lütfen farklı bir kart deneyin.",
  },
  invalidTestCard: {
    en: "Invalid test card number. Use 4242 4242 4242 4242 for testing.",
    tr: "Geçersiz test kart numarası. Test için 4242 4242 4242 4242 kullanın.",
  },
  cardIncomplete: {
    en: "Card details are incomplete",
    tr: "Kart bilgileri eksik",
  },
  checkoutFailed: {
    en: "Checkout failed. Please try again.",
    tr: "Ödeme başarısız oldu. Lütfen tekrar deneyin.",
  },
  priceIdRequired: {
    en: "Price ID is required",
    tr: "Fiyat kimliği gereklidir",
  },
  invalidPrice: {
    en: "Invalid or inactive price",
    tr: "Geçersiz veya etkin olmayan fiyat",
  },
  invalidProduct: {
    en: "Invalid product",
    tr: "Geçersiz ürün",
  },
  enterpriseContactSales: {
    en: "Invalid plan. Enterprise plans require contacting sales.",
    tr: "Geçersiz plan. Kurumsal planlar için satış ekibiyle iletişime geçin.",
  },
  failedCreateCheckout: {
    en: "Failed to create checkout session",
    tr: "Ödeme oturumu oluşturulamadı",
  },
  invalidImageProduct: {
    en: "Invalid image credit product",
    tr: "Geçersiz görsel kredi ürünü",
  },
  invalidCreditAmount: {
    en: "Invalid credit amount",
    tr: "Geçersiz kredi miktarı",
  },
  paymentFieldsRequired: {
    en: "All payment fields are required",
    tr: "Tüm ödeme alanları gereklidir",
  },
  invalidTestCardShort: {
    en: "Invalid test card number. Use: 4242 4242 4242 4242",
    tr: "Geçersiz test kart numarası. Kullanın: 4242 4242 4242 4242",
  },
  invalidCreditPackage: {
    en: "Invalid credit package",
    tr: "Geçersiz kredi paketi",
  },
  failedPurchaseCredits: {
    en: "Failed to purchase credits",
    tr: "Kredi satın alınamadı",
  },
  noBillingAccount: {
    en: "No billing account found",
    tr: "Fatura hesabı bulunamadı",
  },
  failedBillingPortal: {
    en: "Failed to open billing portal",
    tr: "Fatura portalı açılamadı",
  },
  adminNotConfigured: {
    en: "Admin access not configured",
    tr: "Yönetici erişimi yapılandırılmamış",
  },
  adminAuthRequired: {
    en: "Admin authentication required",
    tr: "Yönetici kimlik doğrulaması gerekli",
  },
  invalidAdminCredentials: {
    en: "Invalid admin credentials",
    tr: "Geçersiz yönetici kimlik bilgileri",
  },
  invalidAdminPassword: {
    en: "Invalid admin password",
    tr: "Geçersiz yönetici şifresi",
  },
  noFileUploaded: {
    en: "No file uploaded",
    tr: "Dosya yüklenmedi",
  },
  urlRequired: {
    en: "URL is required",
    tr: "URL gereklidir",
  },
  noTrainingData: {
    en: "No training data available for this agent.",
    tr: "Bu ajan için eğitim verisi mevcut değil.",
  },
  invalidRating: {
    en: "Rating must be 'good', 'bad', or null",
    tr: "Değerlendirme 'good', 'bad' veya null olmalıdır",
  },
  invalidAgentTypeParam: {
    en: "Invalid agentType",
    tr: "Geçersiz ajan tipi",
  },
  invalidPeriod: {
    en: "Invalid period. Must be daily, weekly, or monthly",
    tr: "Geçersiz dönem. Günlük, haftalık veya aylık olmalıdır",
  },
  invalidUserId: {
    en: "Invalid userId",
    tr: "Geçersiz kullanıcı kimliği",
  },
  invalidLimitId: {
    en: "Invalid limit ID",
    tr: "Geçersiz limit kimliği",
  },
  noFieldsToUpdate: {
    en: "No fields to update",
    tr: "Güncellenecek alan yok",
  },
  topicTooLong: {
    en: "Topic must be under 500 characters",
    tr: "Konu 500 karakterden kısa olmalıdır",
  },
  atLeastOneAgent: {
    en: "At least one agent must be selected",
    tr: "En az bir ajan seçilmelidir",
  },
  sessionNotFound: {
    en: "Session not found",
    tr: "Oturum bulunamadı",
  },
  promptRequired: {
    en: "Prompt is required",
    tr: "İstem gereklidir",
  },
  promptTooLong: {
    en: "Prompt must be under 1000 characters",
    tr: "İstem 1000 karakterden kısa olmalıdır",
  },
  messageRequired: {
    en: "Message is required",
    tr: "Mesaj gereklidir",
  },
  jsonlContentRequired: {
    en: "jsonlContent is required",
    tr: "JSONL içeriği gereklidir",
  },
  agentTypePeriodRequired: {
    en: "agentType and period are required",
    tr: "Ajan tipi ve dönem gereklidir",
  },
  anthropicNotConfigured: {
    en: "Anthropic API key not configured",
    tr: "Anthropic API anahtarı yapılandırılmamış",
  },
} satisfies Record<string, MessageMap>;

export type MessageKey = keyof typeof messages;

export function msg(key: MessageKey, lang: SupportedLang): string {
  return messages[key][lang];
}

export default messages;
