import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enPages from "../locales/en/pages.json";
import enAgents from "../locales/en/agents.json";
import trCommon from "../locales/tr/common.json";
import trPages from "../locales/tr/pages.json";
import trAgents from "../locales/tr/agents.json";

i18n.use(initReactI18next).init({
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
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "pages", "agents"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
