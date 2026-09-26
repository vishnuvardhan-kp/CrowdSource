"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import sat from "../locales/sat.json";
import nag from "../locales/nag.json";
import mun from "../locales/mun.json";
import kru from "../locales/kru.json";
import kho from "../locales/kho.json";
import sad from "../locales/sad.json";
import pan from "../locales/pan.json";
import ta from "../locales/ta.json";

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
  en: { code: "en", name: "English", nativeName: "English", script: "Latin" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari" },
  ta: { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  sat: { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Ol Chiki" },
  nag: { code: "nag", name: "Nagpuri", nativeName: "नागपुरी", script: "Devanagari" },
  mun: { code: "mun", name: "Mundari", nativeName: "मुंडारी", script: "Devanagari" },
  kru: { code: "kru", name: "Kurukh", nativeName: "कुड़ुख़", script: "Devanagari" },
  kho: { code: "kho", name: "Khortha", nativeName: "खोरठा", script: "Devanagari" },
  sad: { code: "sad", name: "Sadri", nativeName: "सादरी", script: "Devanagari" },
  pan: { code: "pan", name: "Panchpargania", nativeName: "पंचपरगनिया", script: "Devanagari" },
};

const translations: Record<string, any> = {
  en,
  hi,
  ta,
  sat,
  nag,
  mun,
  kru,
  kho,
  sad,
  pan,
};

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  supportedLanguages: Record<string, LanguageInfo>;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>) =>
    typeof fallbackOrParams === "string" ? fallbackOrParams : key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>("en");

  // Read saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("samadhan_language");
      if (saved && SUPPORTED_LANGUAGES[saved]) {
        setLanguageState(saved);
        if (typeof document !== "undefined") {
          document.documentElement.lang = saved;
        }
      } else if (typeof document !== "undefined") {
        document.documentElement.lang = "en";
      }
    } catch {
      // safe fallback
    }
  }, []);

  const setLanguage = useCallback((lang: string) => {
    if (SUPPORTED_LANGUAGES[lang]) {
      setLanguageState(lang);
      try {
        localStorage.setItem("samadhan_language", lang);
        if (typeof document !== "undefined") {
          document.documentElement.lang = lang;
        }
      } catch {}
    }
  }, []);

  const t = useCallback(
    (
      key: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      const defaultText = typeof fallbackOrParams === "string" ? fallbackOrParams : key;
      const actualParams = typeof fallbackOrParams === "object" ? fallbackOrParams : params;

      // 1. Try selected language
      let text = getNestedValue(translations[language], key);

      // 2. Fallback to English
      if (!text && language !== "en") {
        text = getNestedValue(translations["en"], key);
      }

      // 3. Fallback to defaultText or key itself (never blank or undefined)
      if (!text) {
        text = defaultText;
      }

      // Interpolate params if provided
      if (actualParams) {
        Object.entries(actualParams).forEach(([k, v]) => {
          text = text!.replace(new RegExp(`{${k}}`, "g"), String(v));
        });
      }

      return text;
    },
    [language],
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
