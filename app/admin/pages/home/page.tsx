// HomePageEditor.tsx — refactored section model for new homepage design
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { Plus, Trash2 } from "lucide-react";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import ButtonField from "@/components/admin/inputs/ButtonField";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import SharedContentNavigator from "@/components/admin/SharedContentNavigator";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { Id } from "@/convex/_generated/dataModel";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";
import CTA from '@/components/admin/CTA';


type SectionContent = {
  heading?: string;
  subheading?: string;
  paragraphs?: string[];
  body?: string;
  imageStorageId?: Id<"_storage">;
  imageAlt?: string;
  imageBlurDataUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  quote?: string;
  getInTouchButtonText?: string;
  getInTouchButtonLink?: string;
};

type SectionDef = { key: string; label: string };

const sections: SectionDef[] = [
  { key: "hero", label: "Hero Section" },
  { key: "struggle", label: "Struggle Section" },
  { key: "quote_band", label: "Quote Band" },
  { key: "approach", label: "Approach Section" },
  { key: "coach_intro", label: "Coach Intro Section" },
  { key: "testimonial_section", label: "Testimonial Section" },
  { key: "programs", label: "Programs Section" },
  { key: "cta", label: "CTA Section" },
];

const sharedContentNavigatorMap: Record<string, { href: string; navLabel: string; textBeforNav: string }> = {
  programs: {
    href: "/admin/shared/services",
    navLabel: "Shared Content → Services",
    textBeforNav: "Edit your services in",
  },
  testimonial_section: {
    href: "/admin/shared/testimonials",
    navLabel: "Shared Content → Testimonials",
    textBeforNav: "Edit your testimonials in",
  },
};

const emptySection = (): SectionContent => ({
  heading: "",
  subheading: "",
  paragraphs: [""],
  body: "",
  imageStorageId: undefined,
  imageAlt: "",
  imageBlurDataUrl: "",
  buttonText: "",
  buttonLink: "",
});

export default function HomePageEditor() {
  const searchParams = useSearchParams();
  const showSaveError = useAdminSaveErrorPopup();
  const { language } = useAdminLanguage();
  const pendingFocusSectionKeyRef = useRef<string | null>(null);

  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "home",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const [activeSection, setActiveSection] = useState("hero");
  const [formData, setFormData] = useState<Record<string, SectionContent>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [errors, setErrors] = useState<Record<string, any>>({});

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (!requestedSection) return;
    if (sections.some((s) => s.key === requestedSection)) setActiveSection(requestedSection);
  }, [searchParams]);

  useEffect(() => {
    if (!pageContent) return;
    const map: Record<string, SectionContent> = {};
    for (const section of pageContent) map[section.sectionKey] = section.content;
    for (const s of sections) map[s.key] = map[s.key] ?? emptySection();
    setFormData(map);
  }, [pageContent]);


  const updateSection = (sectionKey: string, field: keyof SectionContent, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? emptySection()), [field]: value },
    }));
    setErrors((prev) => ({ ...prev, [sectionKey]: { ...(prev[sectionKey] ?? {}), [field]: undefined } }));
    setHasChanges(true);
  };

  const updateParagraph = (index: number, value: string) => {
    const paragraphs = [...((formData[activeSection]?.paragraphs ?? [""]) as string[])];
    paragraphs[index] = value;
    updateSection(activeSection, "paragraphs", paragraphs);
  };

  const addParagraph = () => {
    const paragraphs = [...((formData[activeSection]?.paragraphs ?? [""]) as string[])];
    paragraphs.push("");
    updateSection(activeSection, "paragraphs", paragraphs);
  };

  const removeParagraph = (index: number) => {
    const paragraphs = [...((formData[activeSection]?.paragraphs ?? [""]) as string[])];
    if (paragraphs.length > 1) {
      paragraphs.splice(index, 1);
      updateSection(activeSection, "paragraphs", paragraphs);
    }
  };

  const computeValidationErrors = () => {
    const next: Record<string, any> = {};
    for (const section of sections) {
      const data = formData[section.key] ?? {};
      const sectionErrors: Record<string, any> = {};
      if (section.key === "hero" || section.key === "struggle" || section.key === "approach" || section.key === "coach_intro") {
        sectionErrors.subheading = requiredError(data.subheading);
        sectionErrors.heading = requiredError(data.heading, true);
        sectionErrors.imageStorageId = requiredError(data.imageStorageId);
        sectionErrors.imageAlt = requiredError(data.imageAlt);
        if (section.key === "hero" || section.key === "approach") {
          sectionErrors.buttonText = requiredError(data.buttonText);
          sectionErrors.buttonLink = requiredError(data.buttonLink);
        }
        if (section.key === "coach_intro") {
          sectionErrors.quote = requiredError(data.quote, true);
        }
        if (section.key === "hero" || section.key === "struggle" || section.key === "approach" || section.key === "coach_intro") {
          const paragraphs = (data.paragraphs ?? [""]) as string[];
          sectionErrors.paragraphs = paragraphs.map((p) => requiredError(p, true));
          if (!sectionErrors.paragraphs.some(Boolean)) delete sectionErrors.paragraphs;
        }
      }
      if (section.key === "quote_band") {
        sectionErrors.body = requiredError(data.body, true);
      }
      if (section.key === "testimonial_section") {
        sectionErrors.heading = requiredError(data.heading, true);
      }
      if (section.key === "programs") {
        sectionErrors.heading = requiredError(data.heading, true);
      }
      if (section.key === "cta") {
        sectionErrors.heading = requiredError(data.heading, true);
        sectionErrors.getInTouchButtonText = requiredError(data.getInTouchButtonText);
        sectionErrors.getInTouchButtonLink = requiredError(data.getInTouchButtonLink);
      }
      for (const k of Object.keys(sectionErrors)) if (!sectionErrors[k] || (Array.isArray(sectionErrors[k]) && !sectionErrors[k].some(Boolean))) delete sectionErrors[k];
      if (Object.keys(sectionErrors).length) next[section.key] = sectionErrors;
    }
    setErrors(next);
    return next;
  };

  const focusFirstInvalidFieldInSection = (sectionKey: string) => {
    if (typeof document === "undefined") return;
    const root = document.querySelector(`[data-admin-section-key="${sectionKey}"]`) as HTMLElement | null;
    if (!root) return;
    const target = (root.querySelector('[aria-invalid="true"]') as HTMLElement | null) ?? (root.querySelector('input, textarea, [contenteditable="true"], button') as HTMLElement | null);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  };

  const goToFirstError = (nextErrors: Record<string, any>) => {
    const firstSectionWithError = sections.find((s) => nextErrors[s.key] !== undefined);
    if (!firstSectionWithError) return;
    pendingFocusSectionKeyRef.current = firstSectionWithError.key;
    setActiveSection(firstSectionWithError.key);
  };

  useEffect(() => {
    const pendingKey = pendingFocusSectionKeyRef.current;
    if (!pendingKey || pendingKey !== activeSection) return;
    pendingFocusSectionKeyRef.current = null;
    requestAnimationFrame(() => focusFirstInvalidFieldInSection(pendingKey));
  }, [activeSection, errors]);

  const handleSave = async () => {
    const nextErrors = computeValidationErrors();
    if (Object.keys(nextErrors).length > 0) {
      goToFirstError(nextErrors);
      return;
    }
    setSaving(true);
    try {
      for (const [sectionKey, content] of Object.entries(formData)) {
        await upsertContent({ pageSlug: "home", sectionKey, lang: language ?? undefined, content });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, { title: "Couldn't save Home page" });
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) return <AdminPageLoader />;

  const currentSection = formData[activeSection] || emptySection();

  const s = (key: string) => formData[key] ?? {};

  const renderSectionFields = () => {
    if (activeSection === "hero") {
      return (
        <div className="space-y-6" data-admin-section-key="hero">
          <GeneralInput label="Eyebrow label" value={currentSection.subheading || ""} onChange={(e) => updateSection("hero", "subheading", e.target.value)} placeholder="e.g. Language Coaching" error={errors.hero?.subheading} />
          <RichTextEditor label="Heading" editorKey="hero-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("hero", "heading", e)} placeholder="Main heading..." tools={["bold", "italic", "color"]} error={errors.hero?.heading} />
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-[#3B5249]">Paragraphs</label>
              <button onClick={addParagraph} className="text-[#7B6E9E] text-sm flex gap-1 hover:underline"><Plus size={16} /> Add paragraph</button>
            </div>
            <div className="space-y-4">
              {(currentSection.paragraphs || [""]).map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-[#3B5249]/55">Paragraph {i + 1}</span>
                    {(currentSection.paragraphs?.length || 1) > 1 && <button onClick={() => removeParagraph(i)} className="text-xs text-red-500 flex gap-1"><Trash2 size={14} /> Remove</button>}
                  </div>
                  <RichTextEditor editorKey={`hero-${i}`} value={p} onChange={(v) => updateParagraph(i, v)} placeholder={`Paragraph ${i + 1} text...`} tools={["bold", "italic", "color"]} error={errors.hero?.paragraphs?.[i]} />
                </div>
              ))}
            </div>
          </div>
          <ImageUploader label="Hero image" storageId={currentSection.imageStorageId} alt={currentSection.imageAlt} onImageChange={(id) => updateSection("hero", "imageStorageId", id)} onBlurDataUrlChange={(blur) => updateSection("hero", "imageBlurDataUrl", blur)} onAltChange={(value) => updateSection("hero", "imageAlt", value)} previewSize={280} error={errors.hero?.imageStorageId} altError={errors.hero?.imageAlt} />
          <ButtonField text={currentSection.buttonText} link={currentSection.buttonLink} onTextChange={(value) => updateSection("hero", "buttonText", value)} onLinkChange={(value) => updateSection("hero", "buttonLink", value)} textError={errors.hero?.buttonText} linkError={errors.hero?.buttonLink} />
        </div>
      );
    }

    if (activeSection === "quote_band") {
      return (
        <div className="space-y-4" data-admin-section-key="quote_band">
          <RichTextEditor label="Quote text" editorKey="quote_band-body" value={currentSection.body || ""} onChange={(e) => updateSection("quote_band", "body", e)} placeholder="Short quote / pull quote..." tools={["bold", "italic", "color"]} error={errors.quote_band?.body} />
        </div>
      );
    }

    if (activeSection === "testimonial_section") {
      return (
        <div className="space-y-6" data-admin-section-key="testimonial_section">
          <RichTextEditor label="Heading" editorKey="testimonial_section-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("testimonial_section", "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "color"]} error={errors.testimonial_section?.heading} />
        </div>
      );
    }

    if (activeSection === "programs") {
      return (
        <div className="space-y-4" data-admin-section-key="programs">
          <RichTextEditor label="Heading" editorKey="programs-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("programs", "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "color"]} error={errors.programs?.heading} />
        </div>
      );
    }
    if (activeSection === "cta") {

      return <CTA
        title={s("cta").heading ?? ""}
        onTitleChange={(v) => updateSection("cta", "heading", v)}
        titleError={errors.cta?.heading}
        description={s("cta").body ?? ""}
        onDescriptionChange={(v) => updateSection("cta", "body", v)}
        editorKey="about-cta-body"
        descriptionError={errors.cta?.body}
        buttons={[
          {
            text: s("cta").getInTouchButtonText ?? "",
            link: s("cta").getInTouchButtonLink ?? "",
            onTextChange: (v) => updateSection("cta", "getInTouchButtonText", v),
            onLinkChange: (v) => updateSection("cta", "getInTouchButtonLink", v),
            textLabel: "Button text",
            linkLabel: "Button link",
            textPlaceholder: "Book your free discovery call",
            linkPlaceholder: "/contact",
            textError: errors.cta?.getInTouchButtonText,
            linkError: errors.cta?.getInTouchButtonLink,
          },
        ]}
      />
    }

    return (
      <div className="space-y-4" data-admin-section-key={activeSection}>
        <GeneralInput label="Eyebrow label" value={currentSection.subheading || ""} onChange={(e) => updateSection(activeSection, "subheading", e.target.value)} placeholder="Optional eyebrow" error={errors[activeSection]?.subheading} />
        <RichTextEditor label="Heading" editorKey={`${activeSection}-heading`} value={currentSection.heading || ""} onChange={(e) => updateSection(activeSection, "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "color"]} error={errors[activeSection]?.heading} />
        <div className="space-y-4">
          {(activeSection === "approach" || activeSection === "coach_intro") && <div className="space-y-2" >
            <label className="text-sm font-medium text-[#3B5249]">Quote</label>
            <RichTextEditor editorKey={`${activeSection}-quote`} value={currentSection.quote || ""} onChange={(e) => updateSection(activeSection, "quote", e)} placeholder="Quote..." tools={["bold", "italic", "color"]} error={errors[activeSection]?.quote} />          </div>}
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-[#3B5249]">Paragraphs</label>
            <button onClick={addParagraph} className="text-[#7B6E9E] text-sm flex gap-1 hover:underline"><Plus size={16} /> Add paragraph</button>
          </div>
          <div className="space-y-4">
            {(currentSection.paragraphs || [""]).map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#3B5249]/55">Paragraph {i + 1}</span>
                  {(currentSection.paragraphs?.length || 1) > 1 && <button onClick={() => removeParagraph(i)} className="text-xs text-red-500 flex gap-1"><Trash2 size={14} /> Remove</button>}
                </div>
                <RichTextEditor editorKey={`${activeSection}-${i}`} value={p} onChange={(v) => updateParagraph(i, v)} placeholder={`Paragraph ${i + 1}...`} tools={["bold", "italic", "color", "fontWeight", "fontFamily"]} error={errors[activeSection]?.paragraphs?.[i]} />
              </div>
            ))}
          </div>
        </div>
        <ImageUploader label="Image" storageId={currentSection.imageStorageId} alt={currentSection.imageAlt} onImageChange={(id) => updateSection(activeSection, "imageStorageId", id)} onBlurDataUrlChange={(blur) => updateSection(activeSection, "imageBlurDataUrl", blur)} onAltChange={(value) => updateSection(activeSection, "imageAlt", value)} previewSize={280} error={errors[activeSection]?.imageStorageId} altError={errors[activeSection]?.imageAlt} />
        {(activeSection === "approach" || activeSection === "coach_intro") && (
          <ButtonField text={currentSection.buttonText} link={currentSection.buttonLink} onTextChange={(value) => updateSection(activeSection, "buttonText", value)} onLinkChange={(value) => updateSection(activeSection, "buttonLink", value)} textError={errors[activeSection]?.buttonText} linkError={errors[activeSection]?.buttonLink} />
        )}
      </div>
    );
  };

  return (
    <AdminPageLayout pageTitle="Edit Home Page" breadcrumbLabel="Home" sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} onSave={handleSave} saving={saving} hasChanges={hasChanges}>
      {renderSectionFields()}
      {sharedContentNavigatorMap[activeSection] && (
        <div className="pt-4">
          <SharedContentNavigator href={sharedContentNavigatorMap[activeSection].href} navLabel={sharedContentNavigatorMap[activeSection].navLabel} textBeforNav={sharedContentNavigatorMap[activeSection].textBeforNav} />
        </div>
      )}
    </AdminPageLayout>
  );
}
