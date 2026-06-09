"use client";

import * as React from "react";
import { useAdminConfirm } from "@/components/admin/AdminConfirmProvider";

export type AdminSaveErrorPopupOptions = {
  title?: string;
  description?: React.ReactNode;
  buttonText?: string;

  includeErrorMessage?: boolean;
};

function toErrorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function useAdminSaveErrorPopup() {
  const { message } = useAdminConfirm();

  return React.useCallback(
    async (error?: unknown, options?: AdminSaveErrorPopupOptions) => {
      const title = options?.title ?? "Save failed";

      let description: React.ReactNode =
        options?.description ??
        "Something went wrong while saving. Please try again.";

      if (options?.includeErrorMessage) {
        const errorMessage = toErrorMessage(error);
        if (errorMessage) {
          description = (
            <div className="space-y-3">
              <div>{description}</div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {errorMessage}
              </pre>
            </div>
          );
        }
      }

      try {
        await message({
          title,
          description,
          buttonText: options?.buttonText ?? "OK",
        });
      } catch {
        // If another modal is open, fall back to a simple alert.
        if (typeof window !== "undefined") {
          window.alert(title);
        }
      }
    },
    [message],
  );
}
