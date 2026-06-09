"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ADMIN_LANGUAGES,
  ADMIN_LANGUAGE_STORAGE_KEY,
  DEFAULT_ADMIN_LANGUAGE,
  isAdminLanguage,
  type AdminLanguage,
} from "@/components/admin/language/adminLanguage";

type AdminLanguageContextValue = {
  language: AdminLanguage | null | undefined;
  setLanguage: (language: AdminLanguage) => void;
  clearLanguage: () => void;
  languages: typeof ADMIN_LANGUAGES;
  defaultLanguage: AdminLanguage;
};

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(
  null,
);

export function AdminLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<
    AdminLanguage | null | undefined
  >(undefined);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
      if (!raw) {
        setLanguageState(null);
        return;
      }
      if (isAdminLanguage(raw)) {
        setLanguageState(raw);
        return;
      }
      setLanguageState(null);
    } catch {
      setLanguageState(DEFAULT_ADMIN_LANGUAGE);
    }
  }, []);

  const setLanguage = useCallback((next: AdminLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore
    }

    // Also persist to cookie so Next.js server-rendered <head> can reflect the chosen language.
    try {
      // 1 year
      document.cookie = `${ADMIN_LANGUAGE_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore
    }
  }, []);

  const clearLanguage = useCallback(() => {
    setLanguageState(null);
    try {
      window.localStorage.removeItem(ADMIN_LANGUAGE_STORAGE_KEY);
    } catch {
      // ignore
    }

    try {
      document.cookie = `${ADMIN_LANGUAGE_STORAGE_KEY}=; path=/; max-age=0; samesite=lax`;
    } catch {
      // ignore
    }
  }, []);

  const value: AdminLanguageContextValue = useMemo(
    () => ({
      language,
      setLanguage,
      clearLanguage,
      languages: ADMIN_LANGUAGES,
      defaultLanguage: DEFAULT_ADMIN_LANGUAGE,
    }),
    [language, setLanguage, clearLanguage],
  );

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage(): AdminLanguageContextValue {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) {
    throw new Error(
      "useAdminLanguage must be used within <AdminLanguageProvider />",
    );
  }
  return ctx;
}
