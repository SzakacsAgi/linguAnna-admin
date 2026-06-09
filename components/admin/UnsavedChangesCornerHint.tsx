"use client";

import { AlertTriangle } from "lucide-react";

type UnsavedChangesCornerHintProps = {
  visible: boolean;
  onSave: () => void;
  saving?: boolean;
  shortcutHint?: string;
};

export function UnsavedChangesCornerHint({
  visible,
  onSave,
  saving,
  shortcutHint = "Ctrl+S / Cmd+S",
}: UnsavedChangesCornerHintProps) {
  if (!visible) return null;

  const handleSave = () => {
    if (saving) return;
    onSave();
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-[min(360px,calc(100vw-2rem))]"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-[#D4B483]/30 bg-[#FAF6F0] shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B6E9E]/10 text-[#7B6E9E]">
            <AlertTriangle size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[#3B5249]">
              You have unsaved changes
            </div>
            <div className="mt-0.5 text-xs text-[#3B5249]/75">
              Don&apos;t forget to{" "}
              <span
                className={
                  saving
                    ? "font-semibold mx-1 opacity-60"
                    : "font-semibold cursor-pointer underline underline-offset-2 text-[#7B6E9E] mx-1"
                }
                role={saving ? undefined : "button"}
                tabIndex={saving ? -1 : 0}
                onClick={handleSave}
                onKeyDown={(e) => {
                  if (saving) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              >
                save
              </span>
              to keep your edits.
            </div>
            {shortcutHint ? (
              <div className="text-xs text-[#3B5249]/75">
                You can also save using {shortcutHint}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
