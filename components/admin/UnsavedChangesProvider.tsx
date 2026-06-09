"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type PendingNavigation =
  | {
      kind: "link";
      href: string;
    }
  | {
      kind: "back";
    }
  | null;

type SaveHandler = (() => unknown) | null;

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  registerSaveHandler: (handler: SaveHandler, saving?: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending] = useState<PendingNavigation>(null);
  const [pageSaving, setPageSaving] = useState(false);
  const [saveThenNavigate, setSaveThenNavigate] = useState(false);

  const saveHandlerRef = useRef<SaveHandler>(null);

  const allowNextNavigationRef = useRef(false);
  const barrierActiveRef = useRef(false);
  const lastUrlRef = useRef<string>(
    typeof window !== "undefined" ? window.location.href : "",
  );

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  // Track the last stable URL while we are on a page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    lastUrlRef.current = window.location.href;
  }, [pathname]);

  // Native browser prompt for refresh/close.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // Chrome requires returnValue to be set.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const openConfirmLink = useCallback((href: string) => {
    setPending({ kind: "link", href });
  }, []);

  const openConfirmBack = useCallback(() => {
    setPending({ kind: "back" });
  }, []);

  const confirmLeave = useCallback(() => {
    const next = pending;
    setPending(null);
    setSaveThenNavigate(false);
    if (!next) return;

    allowNextNavigationRef.current = true;

    if (next.kind === "link") {
      router.push(next.href);
      return;
    }

    // back
    window.history.back();
  }, [pending, router]);

  const cancelLeave = useCallback(() => {
    const next = pending;
    setPending(null);
    setSaveThenNavigate(false);

    // If user attempted back while dirty, restore the barrier entry so the next back press
    // does not immediately navigate away.
    if (next?.kind === "back" && typeof window !== "undefined") {
      window.history.pushState(
        { __unsavedBarrier: true },
        "",
        window.location.href,
      );
      barrierActiveRef.current = true;
    }
  }, [pending]);

  const registerSaveHandler = useCallback(
    (handler: SaveHandler, saving?: boolean) => {
      saveHandlerRef.current = handler;
      setPageSaving(Boolean(saving));
    },
    [],
  );

  const handleSaveClick = useCallback(async () => {
    if (!saveHandlerRef.current) return;
    try {
      await Promise.resolve(saveHandlerRef.current());
    } catch {
      // page-level save error handling/toasts live elsewhere
    }
  }, []);

  const handleSaveAndContinue = useCallback(async () => {
    setSaveThenNavigate(true);
    await handleSaveClick();
  }, [handleSaveClick]);

  useEffect(() => {
    if (!saveThenNavigate) return;
    if (!pending) return;
    if (pageSaving) return;
    if (isDirty) return;

    // Saved successfully (page cleared dirty); continue with the pending navigation.
    setPending(null);
    setSaveThenNavigate(false);
    allowNextNavigationRef.current = true;

    if (pending.kind === "link") {
      router.push(pending.href);
      return;
    }

    window.history.back();
  }, [isDirty, pageSaving, pending, router, saveThenNavigate]);

  // Intercept in-app link clicks (nice popup).
  useEffect(() => {
    if (typeof document === "undefined") return;

    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        return;
      }

      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr) return;
      if (hrefAttr.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      // Only guard internal navigations.
      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      openConfirmLink(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isDirty, openConfirmLink]);

  // Insert a same-URL history barrier when the page becomes dirty.
  // This prevents the browser back button from navigating away before we can show a modal.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isDirty) {
      if (!barrierActiveRef.current) {
        window.history.pushState(
          { __unsavedBarrier: true },
          "",
          window.location.href,
        );
        barrierActiveRef.current = true;
      }
      return;
    }

    // No longer dirty: remove marker on current entry if present.
    if (barrierActiveRef.current) {
      const state = window.history.state as unknown;
      if (
        state &&
        typeof state === "object" &&
        "__unsavedBarrier" in (state as Record<string, unknown>)
      ) {
        window.history.replaceState(null, "", window.location.href);
      }
      barrierActiveRef.current = false;
    }
  }, [isDirty]);

  // Intercept browser back/forward (nice popup).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = () => {
      if (!isDirty) return;
      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        return;
      }

      // Because of the barrier, the URL should not change (we pop to the previous same-URL entry).
      // Show the modal and let the user decide. If they cancel we restore the barrier.
      openConfirmBack();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty, openConfirmBack]);

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({ isDirty, setDirty, registerSaveHandler }),
    [isDirty, registerSaveHandler, setDirty],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave this page, your edits may
              be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave} disabled={pageSaving}>
              Stay
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={pending ? handleSaveAndContinue : handleSaveClick}
              disabled={!saveHandlerRef.current || pageSaving}
            >
              {pageSaving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmLeave}
              disabled={pageSaving}
            >
              Leave without saving
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error(
      "useUnsavedChanges must be used within <UnsavedChangesProvider />",
    );
  }
  return ctx;
}
