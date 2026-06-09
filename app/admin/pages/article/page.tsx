"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";

import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import ButtonField from "@/components/admin/inputs/ButtonField";
import CTA from "@/components/admin/CTA";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { requiredError } from "@/lib/admin/required";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
  heading?: string;
  body?: string;
  imageStorageId?: Id<"_storage">;
  imageAlt?: string;
  imageBlurDataUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  shareText?: string;
  moreArticlesTitle?: string;
};

const sections = [
  { key: "header" as const, label: "Header" },
  { key: "banner" as const, label: "Banner" },
  { key: "cta" as const, label: "CTA" },
  { key: "others" as const, label: "Others" },
];

type SectionKey = (typeof sections)[number]["key"];

export default function ArticlePageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "article",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const showSaveError = useAdminSaveErrorPopup();

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("header");
  const [formData, setFormData] = useState<Record<SectionKey, SectionContent>>({
    banner: {},
    header: {},
    others: {},
    cta: {},
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<
    Record<string, Partial<Record<keyof SectionContent, string>>>
  >({});

  const pendingFocusSectionKeyRef = useRef<SectionKey | null>(null);

  useEffect(() => {
    if (!pageContent) return;

    const contentMap: Record<string, SectionContent> = {};
    for (const section of pageContent) {
      contentMap[section.sectionKey] = section.content;
    }

    setFormData({
      banner: (contentMap.banner ?? {}) as SectionContent,
      header: (contentMap.header ?? {}) as SectionContent,
      others: (contentMap.others ?? {}) as SectionContent,
      cta: (contentMap.cta ?? {}) as SectionContent,
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

  const validate = () => {
    const header = formData.header ?? {};
    const banner = formData.banner ?? {};
    const others = formData.others ?? {};
    const cta = formData.cta ?? {};

    const next: Record<
      string,
      Partial<Record<keyof SectionContent, string>>
    > = {
      header: {
        buttonText: requiredError(header.buttonText),
        buttonLink: requiredError(header.buttonLink),
        shareText: requiredError(header.shareText),
      },
      banner: {
        heading: requiredError(banner.heading),
        body: requiredError(banner.body, true),
        imageStorageId: banner.imageStorageId ? undefined : "It is required",
        imageAlt: requiredError(banner.imageAlt),
        buttonText: requiredError(banner.buttonText),
        buttonLink: requiredError(banner.buttonLink),
      },
      others: {
        moreArticlesTitle: requiredError(others.moreArticlesTitle),
      },
      cta: {
        heading: requiredError(cta.heading),
        body: requiredError(cta.body, true),
        buttonText: requiredError(cta.buttonText),
        buttonLink: requiredError(cta.buttonLink),
      },
    };

    for (const sectionKey of Object.keys(next)) {
      for (const key of Object.keys(next[sectionKey]) as Array<
        keyof SectionContent
      >) {
        if (!next[sectionKey][key]) delete next[sectionKey][key];
      }
      if (Object.keys(next[sectionKey]).length === 0) delete next[sectionKey];
    }

    setErrors(next);
    return next;
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
  }, [activeSection, errors]);

  const handleSave = async () => {
    const nextErrors = validate();
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      const activeIndex = sections.findIndex((s) => s.key === activeSection);

      let nextInvalidKey: SectionKey = activeSection;
      if (errorKeys.includes(activeSection)) {
        nextInvalidKey = activeSection;
      } else {
        for (let offset = 1; offset <= sections.length; offset++) {
          const idx = (activeIndex + offset) % sections.length;
          const candidate = sections[idx]?.key;
          if (candidate && errorKeys.includes(candidate)) {
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
          pageSlug: "article",
          sectionKey: section.key,
          lang: language ?? undefined,
          content: formData[section.key] ?? {},
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't save Article page",
      });
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) {
    return <AdminPageLoader />;
  }

  const current = formData[activeSection] ?? {};

  return (
    <AdminPageLayout
      pageTitle="Edit Article Page"
      breadcrumbLabel="Article"
      backHref="/admin/pages"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as SectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {activeSection === "banner" ? (
        <div className="space-y-6" data-admin-section-key="banner">
          <GeneralInput
            label="Title"
            value={current.heading || ""}
            onChange={(e) => updateSection("banner", "heading", e.target.value)}
            placeholder="Title..."
            error={errors.banner?.heading}
          />

          <RichTextEditor
            label="Description"
            editorKey="article-banner-description"
            value={current.body || ""}
            onChange={(value) => updateSection("banner", "body", value)}
            tools={["bold", "italic", "link"]}
            error={errors.banner?.body}
          />

          <ImageUploader
            label="Image"
            storageId={current.imageStorageId}
            alt={current.imageAlt}
            onImageChange={(id) =>
              updateSection("banner", "imageStorageId", id)
            }
            onBlurDataUrlChange={(blur) =>
              updateSection("banner", "imageBlurDataUrl", blur)
            }
            onAltChange={(value) => updateSection("banner", "imageAlt", value)}
            previewSize={280}
            error={errors.banner?.imageStorageId}
            altError={errors.banner?.imageAlt}
          />

          <ButtonField
            text={current.buttonText || ""}
            link={current.buttonLink || ""}
            onTextChange={(value) =>
              updateSection("banner", "buttonText", value)
            }
            onLinkChange={(value) =>
              updateSection("banner", "buttonLink", value)
            }
            textLabel="Button text"
            linkLabel="Button link"
            textError={errors.banner?.buttonText}
            linkError={errors.banner?.buttonLink}
          />
        </div>
      ) : activeSection === "header" ? (
        <div className="space-y-6" data-admin-section-key="header">
          <ButtonField
            text={current.buttonText || ""}
            link={current.buttonLink || ""}
            onTextChange={(value) =>
              updateSection("header", "buttonText", value)
            }
            onLinkChange={(value) =>
              updateSection("header", "buttonLink", value)
            }
            textLabel="Back button text"
            linkLabel="Back button link"
            textError={errors.header?.buttonText}
            linkError={errors.header?.buttonLink}
          />

          <GeneralInput
            label="Share text"
            value={current.shareText || ""}
            onChange={(e) =>
              updateSection("header", "shareText", e.target.value)
            }
            placeholder="Share"
            error={errors.header?.shareText}
          />
        </div>
      ) : activeSection === "others" ? (
        <div className="space-y-6" data-admin-section-key="others">
          <GeneralInput
            label="More articles title"
            value={current.moreArticlesTitle || ""}
            onChange={(e) =>
              updateSection("others", "moreArticlesTitle", e.target.value)
            }
            placeholder="More {category} articles"
            error={errors.others?.moreArticlesTitle}
          />
          <p className="text-xs text-[#3B5249]/45 ml-2">
            Write {"{category}"} anywhere in the title to insert the category
            name.
          </p>
        </div>
      ) : (
        <div data-admin-section-key="cta">
          <CTA
            title={current.heading || ""}
            onTitleChange={(value) => updateSection("cta", "heading", value)}
            titleError={errors.cta?.heading}
            description={current.body || ""}
            onDescriptionChange={(value) => updateSection("cta", "body", value)}
            editorKey="article-cta-description"
            descriptionError={errors.cta?.body}
            buttons={[
              {
                text: current.buttonText || "",
                link: current.buttonLink || "",
                onTextChange: (value) =>
                  updateSection("cta", "buttonText", value),
                onLinkChange: (value) =>
                  updateSection("cta", "buttonLink", value),
                textError: errors.cta?.buttonText,
                linkError: errors.cta?.buttonLink,
              },
            ]}
          />
        </div>
      )}
    </AdminPageLayout>
  );
}
