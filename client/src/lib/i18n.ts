import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "@/locales/en/common.json";
import trCommon from "@/locales/tr/common.json";
import enPages from "@/locales/en/pages.json";
import trPages from "@/locales/tr/pages.json";
import enAgents from "@/locales/en/agents.json";
import trAgents from "@/locales/tr/agents.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        pages: enPages,
        agents: enAgents,
      },
      tr: {
        common: trCommon,
        pages: trPages,
        agents: trAgents,
      },
    },
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
