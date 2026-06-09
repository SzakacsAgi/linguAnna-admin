"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

const ADMIN_LANGUAGE_SELECTOR_SHOWN_KEY = "adminLanguageSelectorShown";

export function AdminLanguageGate({ children }: { children?: ReactNode }) {
  const { language } = useAdminLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allowRender, setAllowRender] = useState(false);

  useEffect(() => {
    if (language === undefined) {
      setAllowRender(false);
      return; // still loading
    }

    const isLanguagePage = pathname === "/admin/language";
    if (isLanguagePage) {
      setAllowRender(true);
      return;
    }

    const qs = searchParams?.toString();
    const returnTo = qs ? `${pathname}?${qs}` : pathname;

    if (language === null) {
      setAllowRender(false);
      router.replace(
        `/admin/language?returnTo=${encodeURIComponent(returnTo)}`,
      );
      return;
    }

    // Show the selector after login (once per tab session) so the user can confirm/change language.
    if (pathname === "/admin") {
      try {
        const shown = window.sessionStorage.getItem(
          ADMIN_LANGUAGE_SELECTOR_SHOWN_KEY,
        );
        if (!shown) {
          setAllowRender(false);
          router.replace(
            `/admin/language?returnTo=${encodeURIComponent(returnTo)}`,
          );
          return;
        }
      } catch {
        // ignore
      }
    }
    setAllowRender(true);
  }, [language, pathname, router, searchParams]);

  if (!allowRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4B483]/40 border-t-[#7B6E9E]" />
      </div>
    );
  }

  return <>{children}</>;
}
