import { createContext, useContext, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

function normalizeLanguage(lng: string): "en" | "tr" {
  if (lng.startsWith("tr")) return "tr";
  return "en";
}

interface LanguageContextType {
  language: "en" | "tr";
  changeLanguage: (lng: string) => Promise<void>;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.language) {
      const normalized = normalizeLanguage(user.language);
      if (normalizeLanguage(i18n.language) !== normalized) {
        i18n.changeLanguage(normalized);
      }
    }
  }, [user, i18n]);

  const changeLanguage = useCallback(async (lng: string) => {
    const normalized = normalizeLanguage(lng);
    await i18n.changeLanguage(normalized);
    localStorage.setItem("i18nextLng", normalized);

    if (user) {
      await apiRequest("PATCH", "/api/auth/language", { language: normalized });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, [i18n, user]);

  const currentLang = normalizeLanguage(i18n.language);

  const value: LanguageContextType = {
    language: currentLang,
    changeLanguage,
    isRtl: false,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
