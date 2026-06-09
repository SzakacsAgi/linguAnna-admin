"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

const ADMIN_LANGUAGE_SELECTOR_SHOWN_KEY = "adminLanguageSelectorShown";

export default function AdminLanguagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useAdminLanguage();

  const returnTo = searchParams.get("returnTo") || "/admin";

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ADMIN_LANGUAGE_SELECTOR_SHOWN_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const languageCards = useMemo(
    () => [
      {
        code: "en" as const,
        label: "English",
        flag: "🇬🇧",
        hint: "Edit in English",
      },
      {
        code: "hu" as const,
        label: "Magyar",
        flag: "🇭🇺",
        hint: "Szerkesztés magyarul",
      },
    ],
    [],
  );

  return (
    <div>
      <div className="relative">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full bg-[#7B6E9E]/10 text-[#7B6E9E] border border-[#7B6E9E]/20 px-3 py-1 text-xs font-semibold tracking-wide">
            Nyelv / Language
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            Choose a language
          </h1>
          <p className="mt-2 text-[#3B5249]/65">
            The selected language controls which content you load and save.
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          {languageCards.map((c) => {
            const active = language === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setLanguage(c.code);
                  router.push(returnTo);
                  router.refresh();
                }}
                className={`group relative overflow-hidden text-left rounded-3xl p-6 shadow-sm ring-1 ring-border/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/35 hover:-translate-y-0.5 ${active
                  ? "bg-white shadow-md ring-[#7B6E9E]/25"
                  : "bg-white/90 hover:bg-white hover:shadow-md ring-[#D4B483]/25"
                  }`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_20%_20%,rgba(123,110,158,0.14),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(212,180,131,0.14),transparent_55%)]"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl leading-none select-none">
                      {c.flag}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#3B5249]">
                        {c.label}
                      </div>
                      <div className="mt-1 text-xs text-[#3B5249]/60">
                        {c.hint}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ring-1 ${active
                      ? "bg-[#3B5249] ring-[#3B5249]"
                      : "bg-[#FAF6F0] ring-[#D4B483]/40 group-hover:ring-[#7B6E9E]/30"
                      }`}
                    aria-hidden="true"
                  >
                    {active ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    ) : null}
                  </div>
                </div>

                <div className="relative mt-5 flex items-center justify-between">
                  <div className="text-xs text-[#3B5249]/55">
                    {c.code.toUpperCase()}
                  </div>

                  {active ? (
                    <div className="inline-flex rounded-full bg-[#3B5249] text-[#FAF6F0] text-xs px-3 py-1">
                      Selected
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#3B5249]/70 group-hover:text-[#7B6E9E] transition-colors">
                      Select →
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
