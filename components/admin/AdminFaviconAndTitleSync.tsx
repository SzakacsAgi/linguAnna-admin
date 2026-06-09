"use client";

import { useEffect } from "react";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

const FAVICON_ATTR = "data-admin-dynamic-favicon";

function upsertHeadLink(rel: string, href: string, type?: string) {
  if (typeof document === "undefined") return;

  let link = document.querySelector(
    `link[rel="${rel}"][${FAVICON_ATTR}="1"]`,
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    link.setAttribute(FAVICON_ATTR, "1");
    // Put it first so browsers prefer it.
    document.head.insertBefore(link, document.head.firstChild);
  }

  link.href = href;
  if (type) link.type = type;
}

function computeFaviconHref(language: string | null | undefined) {
  const base = language === "hu" ? "/favicon-hu.svg" : "/favicon-en.svg";
  const v = language === "hu" ? "hu" : "en";
  return `${base}?v=${v}`;
}

function applyFavicon(language: string | null | undefined) {
  if (typeof document === "undefined") return;

  // Don't override the server-rendered icon while the language is still loading.
  if (language === undefined) return;

  const href = computeFaviconHref(language);

  // Update any existing favicon links (including those inserted by Next metadata)
  // so the browser can't keep using an older/English one.
  const all = document.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );
  all.forEach((node) => {
    if (!(node instanceof HTMLLinkElement)) return;
    if (node.href !== new URL(href, window.location.href).href) {
      node.href = href;
    }
    node.type = "image/svg+xml";
  });

  upsertHeadLink("icon", href, "image/svg+xml");
  upsertHeadLink("shortcut icon", href, "image/svg+xml");
  upsertHeadLink("apple-touch-icon", href, "image/svg+xml");
}

export function AdminFaviconAndTitleSync() {
  const { language } = useAdminLanguage();

  useEffect(() => {
    applyFavicon(language);

    // Next.js can update <head> during hydration/client navigations; re-apply the icon
    // if a new icon link appears or hrefs get overwritten.
    const head = document.head;
    if (!head) return;

    let rafId: number | null = null;
    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyFavicon(language);
      });
    };

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "rel", "type"],
    });

    return () => {
      observer.disconnect();
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [language]);

  return null;
}
