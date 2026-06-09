"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";

import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import CTA from "@/components/admin/CTA";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { requiredError } from "@/lib/admin/required";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ButtonField from '@/components/admin/inputs/ButtonField';

type LinkItem = {
  id: string;
  text: string;
  href: string;
};

type SectionContent = {
  // CTA
  heading?: string;
  body?: string;
  buttonText?: string;
  buttonLink?: string;
  // Links
  links?: LinkItem[];
};

const sections = [
  { key: "cta" as const, label: "CTA" },
  { key: "links" as const, label: "Links" },
];

type SectionKey = (typeof sections)[number]["key"];

type LinkItemErrors = Record<string, { text?: string; href?: string }>;

function newLinkItem(): LinkItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return { id, text: "", href: "" };
}

export default function NotFoundPageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "not-found",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const showSaveError = useAdminSaveErrorPopup();

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("cta");
  const [formData, setFormData] = useState<Record<SectionKey, SectionContent>>({
    cta: {},
    links: { links: [] },
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<
    Record<string, Partial<Record<keyof SectionContent, string>>>
  >({});
  const [linkItemErrors, setLinkItemErrors] = useState<LinkItemErrors>({});

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const pendingFocusSectionKeyRef = useRef<SectionKey | null>(null);

  useEffect(() => {
    if (!pageContent) return;

    const contentMap: Record<string, SectionContent> = {};
    for (const section of pageContent) {
      contentMap[section.sectionKey] = section.content as SectionContent;
    }

    setFormData({
      cta: (contentMap.cta ?? {}) as SectionContent,
      links: {
        ...(contentMap.links ?? {}),
        links: (contentMap.links?.links ?? []) as LinkItem[],
      } as SectionContent,
    });
  }, [pageContent]);

  const updateSection = (
    sectionKey: SectionKey,
    field: keyof SectionContent,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value,
      },
    }));
    setErrors((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [field]: undefined },
    }));
    setHasChanges(true);
  };

  const updateLinks = (next: LinkItem[]) => {
    updateSection("links", "links", next);
    setLinkItemErrors({});
  };

  const validate = () => {
    const cta = formData.cta ?? {};
    const linksSection = formData.links ?? {};
    const links = (linksSection.links ?? []) as LinkItem[];

    const next: Record<
      string,
      Partial<Record<keyof SectionContent, string>>
    > = {
      cta: {
        heading: requiredError(cta.heading),
        body: requiredError(cta.body, true),
        buttonText: requiredError(cta.buttonText),
        buttonLink: requiredError(cta.buttonLink),
      },
      links: {
        links:
          links.length > 0
            ? undefined
            : "Add at least one link to show on the Not Found page.",
      },
    };

    const nextLinkItemErrors: LinkItemErrors = {};
    for (const item of links) {
      const textError = requiredError(item.text);
      const hrefError = requiredError(item.href);
      if (textError || hrefError) {
        nextLinkItemErrors[item.id] = {
          text: textError ?? undefined,
          href: hrefError ?? undefined,
        };
      }
    }

    for (const sectionKey of Object.keys(next)) {
      for (const key of Object.keys(next[sectionKey]) as Array<
        keyof SectionContent
      >) {
        if (!next[sectionKey][key]) delete next[sectionKey][key];
      }
      if (Object.keys(next[sectionKey]).length === 0) delete next[sectionKey];
    }

    setErrors(next);
    setLinkItemErrors(nextLinkItemErrors);
    return { sectionErrors: next, linkItemErrors: nextLinkItemErrors };
  };

  const focusFirstInvalidFieldInSection = (sectionKey: SectionKey) => {
    if (typeof document === "undefined") return;

    const root = document.querySelector(
      `[data-admin-section-key="${sectionKey}"]`,
    ) as HTMLElement | null;
    if (!root) return;

    const target =
      (root.querySelector('[aria-invalid="true"]') as HTMLElement | null) ??
      (root.querySelector(
        "input, textarea, [contenteditable='true']",
      ) as HTMLElement | null);

    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  };

  useEffect(() => {
    const pendingKey = pendingFocusSectionKeyRef.current;
    if (!pendingKey) return;
    if (pendingKey !== activeSection) return;

    pendingFocusSectionKeyRef.current = null;
    requestAnimationFrame(() => {
      focusFirstInvalidFieldInSection(pendingKey);
    });
  }, [activeSection, errors, linkItemErrors]);

  const handleSave = async () => {
    const { sectionErrors, linkItemErrors: nextLinkErrors } = validate();

    const errorSectionKeys = new Set(
      Object.keys(sectionErrors) as SectionKey[],
    );
    if (Object.keys(nextLinkErrors).length > 0) {
      errorSectionKeys.add("links");
    }

    if (errorSectionKeys.size > 0) {
      const activeIndex = sections.findIndex((s) => s.key === activeSection);

      let nextInvalidKey: SectionKey = activeSection;
      if (errorSectionKeys.has(activeSection)) {
        nextInvalidKey = activeSection;
      } else {
        for (let offset = 1; offset <= sections.length; offset++) {
          const idx = (activeIndex + offset) % sections.length;
          const candidate = sections[idx]?.key;
          if (candidate && errorSectionKeys.has(candidate)) {
            nextInvalidKey = candidate;
            break;
          }
        }
      }

      pendingFocusSectionKeyRef.current = nextInvalidKey;
      if (nextInvalidKey !== activeSection) {
        setActiveSection(nextInvalidKey);
      }
      return;
    }

    setSaving(true);
    try {
      for (const section of sections) {
        await upsertContent({
          pageSlug: "not-found",
          sectionKey: section.key,
          lang: language ?? undefined,
          content: formData[section.key] ?? {},
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't save Not Found page",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLinkDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleLinkDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const currentLinks = (formData.links?.links ?? []) as LinkItem[];
    const next = [...currentLinks];
    const draggedItem = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, draggedItem);
    updateLinks(next);
    setDraggedIndex(index);
  };

  const handleLinkDragEnd = () => {
    setDraggedIndex(null);
  };

  if (pageContent === undefined) {
    return <AdminPageLoader />;
  }

  const current = formData[activeSection] ?? {};

  const links = ((formData.links?.links ?? []) as LinkItem[]) ?? [];

  return (
    <AdminPageLayout
      pageTitle="Edit Not Found Page"
      breadcrumbLabel="Not found"
      backHref="/admin/pages"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as SectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {activeSection === "cta" ? (
        <div data-admin-section-key="cta" className="space-y-4">
          <label
            className="block text-sm font-medium"
          >
            Heading
          </label>
          <RichTextEditor editorKey="heading" onChange={(value) => updateSection("cta", "heading", value)} error={errors.cta?.heading} value={current.heading || ""} />
          <label
            className="block text-sm font-medium mb-2 mt-4"
          >
            Description
          </label>
          <RichTextEditor editorKey="description" onChange={(value) => updateSection("cta", "body", value)} error={errors.cta?.body} value={current.body || ""} />
          <ButtonField text={current.buttonText} link={current.buttonLink} onTextChange={(value) => updateSection(activeSection, "buttonText", value)} onLinkChange={(value) => updateSection(activeSection, "buttonLink", value)} textError={errors[activeSection]?.buttonText} linkError={errors[activeSection]?.buttonLink} />
        </div>
      ) : (
        <div className="space-y-4" data-admin-section-key="links">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#3B5249]">Links</h3>
              <p className="text-sm text-[#3B5249]/65">
                Add links to help visitors navigate from the Not Found page.
                Drag rows to reorder.
              </p>
              {errors.links?.links ? (
                <p className="text-xs text-red-600 mt-2">
                  {errors.links?.links}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => updateLinks([...(links ?? []), newLinkItem()])}
              className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors"
            >
              <Plus size={18} />
              Add link
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
            {links.length === 0 ? (
              <div className="p-10 text-center text-[#3B5249]/60">
                No links yet. Click “Add link” to create one.
              </div>
            ) : (
              <div className="divide-y divide-[#D4B483]/15">
                {links.map((item, index) => {
                  const itemErrors = linkItemErrors[item.id] ?? {};
                  return (
                    <div
                      key={item.id}
                      onDragOver={(e) => handleLinkDragOver(e, index)}
                      className="p-6 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
                    >
                      <div
                        className="text-[#3B5249]/35 cursor-grab active:cursor-grabbing pt-2"
                        title="Drag to reorder"
                        draggable
                        onDragStart={() => handleLinkDragStart(index)}
                        onDragEnd={handleLinkDragEnd}
                      >
                        <GripVertical size={20} />
                      </div>

                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <GeneralInput
                          label="Link text"
                          value={item.text}
                          onChange={(e) => {
                            const next = links.map((l) =>
                              l.id === item.id
                                ? { ...l, text: e.target.value }
                                : l,
                            );
                            updateLinks(next);
                          }}
                          placeholder="e.g. Services"
                          error={itemErrors.text}
                        />

                        <GeneralInput
                          label="Link URL"
                          value={item.href}
                          onChange={(e) => {
                            const next = links.map((l) =>
                              l.id === item.id
                                ? { ...l, href: e.target.value }
                                : l,
                            );
                            updateLinks(next);
                          }}
                          placeholder="e.g. /services"
                          error={itemErrors.href}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateLinks(links.filter((l) => l.id !== item.id))
                        }
                        className="p-2 text-[#3B5249]/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
