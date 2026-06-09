"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

type AdminHeaderProps = {
  pageTitle: string;
  breadcrumbLabel: string;
  backHref?: string;
  onSave: () => void;
  saving?: boolean;
  hasChanges?: boolean;
};

export function AdminHeader({
  pageTitle,
  breadcrumbLabel,
  backHref = "/admin/pages",
  onSave,
  saving = false,
  hasChanges = false,
}: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.12em] text-[#68582E]/70 mb-3">
          <Link href={backHref} className="hover:text-[#7B6E9E] flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} />
            Pages
          </Link>
          <span>/</span>
          <span>{breadcrumbLabel}</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-medium text-[#3B5249] tracking-tight [font-family:Georgia,serif]">
          {pageTitle}
        </h1>
      </div>

      <button
        onClick={onSave}
        disabled={saving || !hasChanges}
        className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-6 py-2.5 rounded-full
                   hover:bg-[#7B6E9E] transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={18} />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
