"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import CTA from "@/components/admin/CTA";
import ButtonField from "@/components/admin/inputs/ButtonField";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
  heading?: string;
  subheading?: string;
  body?: string;
  paragraphs?: string[];
  image?: string;
  imageAlt?: string;
  buttonText?: string;
  buttonLink?: string;
  contactButtonText?: string;
  contactButtonLink?: string;
  forYouIfLabel?: string;
  notForYouIfLabel?: string;
  serviceCardButtonLabel?: string;
};

export default function ServicesPageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "services",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const showSaveError = useAdminSaveErrorPopup();

  const pendingFocusSectionKeyRef = useRef<"page" | "cta" | "others" | null>(
    null,
  );

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("page");
  const [formData, setFormData] = useState<Record<string, SectionContent>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<
    Record<string, Partial<Record<keyof SectionContent, string>>>
  >({});

  const sections = [
    { key: "page" as const, label: "Hero" },
    { key: "cta" as const, label: "CTA" },
    { key: "others" as const, label: "Others" },
  ];

  useEffect(() => {
    if (!pageContent) return;

    const contentMap: Record<string, SectionContent> = {};
    for (const section of pageContent) {
      contentMap[section.sectionKey] = section.content;
    }

    // Ensure both sections exist in local state
    for (const section of sections) {
      contentMap[section.key] = contentMap[section.key] ?? {};
    }

    // Backwards-compat: contact button fields used to live in the "page" section.
    // Prefer explicit "others" values, but fall back to "page" so existing data shows.
    const page = contentMap.page ?? {};
    const others = contentMap.others ?? {};
    contentMap.others = {
      ...others,
      contactButtonText: others.contactButtonText ?? page.contactButtonText,
      contactButtonLink: others.contactButtonLink ?? page.contactButtonLink,
    };

    setFormData(contentMap);
  }, [pageContent]);

  const updateSection = (
    sectionKey: "page" | "cta" | "others",
    field: keyof SectionContent,
    value: string,
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
    const page = formData.page ?? {};
    const cta = formData.cta ?? {};
    const others = formData.others ?? {};

    const next: Record<
      string,
      Partial<Record<keyof SectionContent, string>>
    > = {
      page: {
        heading: requiredError(page.heading),
        subheading: requiredError(page.subheading, true),
      },
      cta: {
        heading: requiredError(cta.heading),
        body: requiredError(cta.body, true),
        buttonText: requiredError(cta.buttonText),
        buttonLink: requiredError(cta.buttonLink),
      },
      others: {
        contactButtonText: requiredError(others.contactButtonText),
        contactButtonLink: requiredError(others.contactButtonLink),
        forYouIfLabel: requiredError(others.forYouIfLabel),
        notForYouIfLabel: requiredError(others.notForYouIfLabel),
        serviceCardButtonLabel: requiredError(others.serviceCardButtonLabel),
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

  const focusFirstInvalidFieldInSection = (
    sectionKey: "page" | "cta" | "others",
  ) => {
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
    if (Object.keys(nextErrors).length > 0) {
      const firstSectionWithError = sections.find(
        (s) => (nextErrors as any)[s.key] !== undefined,
      );
      if (firstSectionWithError) {
        pendingFocusSectionKeyRef.current = firstSectionWithError.key;
        setActiveSection(firstSectionWithError.key);
      }
      return;
    }

    setSaving(true);
    try {
      for (const section of sections) {
        // Keep the DB clean: contact button fields now belong to "others".
        // If old data is still present in "page", omit it when saving.
        const rawContent = formData[section.key] ?? {};
        const content =
          section.key === "page"
            ? (({
                contactButtonText: _contactButtonText,
                contactButtonLink: _contactButtonLink,
                ...rest
              }) => rest)(rawContent)
            : rawContent;

        await upsertContent({
          pageSlug: "services",
          sectionKey: section.key,
          lang: language ?? undefined,
          content,
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't save Services page",
      });
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) {
    return <AdminPageLoader />;
  }

  const currentSection = formData[activeSection] || {};

  return (
    <AdminPageLayout
      pageTitle="Edit Services Page"
      breadcrumbLabel="Services"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {activeSection === "page" ? (
        <div className="space-y-6" data-admin-section-key="page">
          <GeneralInput
            label="Title"
            value={currentSection.heading || ""}
            onChange={(e) => updateSection("page", "heading", e.target.value)}
            placeholder="Title..."
            error={errors.page?.heading}
          />

          <RichTextEditor
            label="Description"
            editorKey="services-page-description"
            value={currentSection.subheading || ""}
            onChange={(value) => updateSection("page", "subheading", value)}
            placeholder="Short summary of the page under the title"
            tools={["bold", "italic"]}
            error={errors.page?.subheading}
          />
        </div>
      ) : activeSection === "cta" ? (
        <div data-admin-section-key="cta">
          <CTA
            title={currentSection.heading || ""}
            onTitleChange={(value) => updateSection("cta", "heading", value)}
            titleError={errors.cta?.heading}
            description={currentSection.body || currentSection.subheading || ""}
            onDescriptionChange={(value) => updateSection("cta", "body", value)}
            editorKey="services-cta-description"
            descriptionError={errors.cta?.body}
            buttons={[
              {
                text: currentSection.buttonText,
                link: currentSection.buttonLink,
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
      ) : (
        <div className="space-y-6" data-admin-section-key="others">
          <ButtonField
            text={currentSection.contactButtonText}
            link={currentSection.contactButtonLink}
            onTextChange={(value) =>
              updateSection("others", "contactButtonText", value)
            }
            onLinkChange={(value) =>
              updateSection("others", "contactButtonLink", value)
            }
            textLabel="Contact button text"
            linkLabel="Contact button link"
            textPlaceholder="Get in touch with me"
            linkPlaceholder="/contact"
            textError={errors.others?.contactButtonText}
            linkError={errors.others?.contactButtonLink}
          />

          <GeneralInput
            label="For you if... label"
            value={currentSection.forYouIfLabel || ""}
            onChange={(e) =>
              updateSection("others", "forYouIfLabel", e.target.value)
            }
            placeholder="For you if..."
            error={errors.others?.forYouIfLabel}
          />

          <GeneralInput
            label="Not for you if... label"
            value={currentSection.notForYouIfLabel || ""}
            onChange={(e) =>
              updateSection("others", "notForYouIfLabel", e.target.value)
            }
            placeholder="Not for you if..."
            error={errors.others?.notForYouIfLabel}
          />

          <GeneralInput
            label="Service card button label"
            value={currentSection.serviceCardButtonLabel || ""}
            onChange={(e) =>
              updateSection("others", "serviceCardButtonLabel", e.target.value)
            }
            placeholder="Book a call"
            error={errors.others?.serviceCardButtonLabel}
          />
        </div>
      )}
    </AdminPageLayout>
  );
}
