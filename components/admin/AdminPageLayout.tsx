"use client";

import React, { useEffect } from "react";
import {
  AdminSection,
  AdminSectionNav,
} from "@/components/admin/AdminSectionNav";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import { UnsavedChangesCornerHint } from "@/components/admin/UnsavedChangesCornerHint";

type AdminPageLayoutProps = {
  pageTitle: string;
  breadcrumbLabel: string;
  backHref?: string;

  sections: AdminSection[];
  activeSection: string;
  onSectionChange: (key: string) => void;

  onSave: () => void;
  saving?: boolean;
  hasChanges?: boolean;

  showUnsavedChangesWarning?: boolean;

  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminPageLayout({
  pageTitle,
  breadcrumbLabel,
  backHref,

  sections,
  activeSection,
  onSectionChange,

  onSave,
  saving,
  hasChanges,

  showUnsavedChangesWarning = true,

  children,
}: AdminPageLayoutProps) {
  const { setDirty, registerSaveHandler } = useUnsavedChanges();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSaveCombo =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      if (e.altKey) return;

      e.preventDefault();
      if (saving) return;
      onSave();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave, saving]);

  useEffect(() => {
    const dirty = Boolean(showUnsavedChangesWarning && hasChanges);
    setDirty(dirty);
    return () => setDirty(false);
  }, [hasChanges, setDirty, showUnsavedChangesWarning]);

  useEffect(() => {
    registerSaveHandler(onSave, saving);
    return () => registerSaveHandler(null, false);
  }, [onSave, registerSaveHandler, saving]);

  return (
    <div className="space-y-6">
      <AdminHeader
        pageTitle={pageTitle}
        breadcrumbLabel={breadcrumbLabel}
        backHref={backHref}
        onSave={onSave}
        saving={saving}
        hasChanges={hasChanges}
      />

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 min-w-0">
          <AdminSectionNav
            sections={sections}
            activeSection={activeSection}
            onChange={onSectionChange}
          />
        </div>

        <div className="lg:col-span-3 min-w-0">
          <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 max-w-full min-w-0 overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>

      <UnsavedChangesCornerHint
        visible={Boolean(showUnsavedChangesWarning && hasChanges)}
        onSave={onSave}
        saving={saving}
        shortcutHint="Ctrl+S / Cmd+S"
      />
    </div>
  );
}
