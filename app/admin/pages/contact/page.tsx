"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import SharedContentNavigator from "@/components/admin/SharedContentNavigator";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { requiredError } from "@/lib/admin/required";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

const SECTIONS = [
  { key: "hero", label: "Hero" },
  { key: "contact_info", label: "Contact Info" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function ContactPageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "contact",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Hero section state
  const [heroHeading, setHeroHeading] = useState("");
  const [heroSubheading, setHeroSubheading] = useState("");
  const [heroErrors, setHeroErrors] = useState<{ heading?: string; subheading?: string }>({});

  // Contact info section state
  const [labelText, setLabelText] = useState("");
  const [directEmailTitle, setDirectEmailTitle] = useState("");
  const [directEmailText, setDirectEmailText] = useState("");
  const [infoErrors, setInfoErrors] = useState<{ labelText?: string; directEmailTitle?: string; directEmailText?: string }>({});

  useEffect(() => {
    if (!pageContent) return;
    const hero = pageContent.find((s) => s.sectionKey === "hero")?.content;
    const info = pageContent.find((s) => s.sectionKey === "contact_info")?.content;
    setHeroHeading(hero?.heading ?? "");
    setHeroSubheading(hero?.subheading ?? "");
    setLabelText(info?.labelText ?? "");
    setDirectEmailTitle(info?.directEmailTitle ?? "");
    setDirectEmailText(info?.directEmailText ?? "");
    setHasChanges(false);
    setHeroErrors({});
    setInfoErrors({});
  }, [pageContent]);

  const validate = () => {
    const nextHero = {
      heading: requiredError(heroHeading),
      subheading: requiredError(heroSubheading, true),
    };
    const nextInfo = {
      labelText: requiredError(labelText),
      directEmailTitle: requiredError(directEmailTitle),
      directEmailText: requiredError(directEmailText),
    };

    // Remove undefineds
    (Object.keys(nextHero) as Array<keyof typeof nextHero>).forEach((k) => { if (!nextHero[k]) delete nextHero[k]; });
    (Object.keys(nextInfo) as Array<keyof typeof nextInfo>).forEach((k) => { if (!nextInfo[k]) delete nextInfo[k]; });

    setHeroErrors(nextHero);
    setInfoErrors(nextInfo);

    if (Object.keys(nextHero).length > 0) { setActiveSection("hero"); return false; }
    if (Object.keys(nextInfo).length > 0) { setActiveSection("contact_info"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await Promise.all([
        upsertContent({
          pageSlug: "contact",
          sectionKey: "hero",
          lang: language ?? undefined,
          content: { heading: heroHeading, subheading: heroSubheading },
        }),
        upsertContent({
          pageSlug: "contact",
          sectionKey: "contact_info",
          lang: language ?? undefined,
          content: { labelText, directEmailTitle, directEmailText },
        }),
      ]);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) {
    return <AdminPageLoader />;
  }

  return (
    <AdminPageLayout
      pageTitle="Edit Contact Page"
      breadcrumbLabel="Contact"
      sections={SECTIONS as unknown as { key: string; label: string }[]}
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as SectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {activeSection === "hero" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D4B483]/20 p-6">
            <div className="space-y-6">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">Hero</h2>
              <GeneralInput
                value={heroHeading}
                onChange={(e) => { setHeroHeading(e.target.value); setHeroErrors((p) => ({ ...p, heading: undefined })); setHasChanges(true); }}
                placeholder="Let's talk."
                label="Title"
                error={heroErrors.heading}
              />
              <RichTextEditor
                label="Description"
                editorKey="contact-hero-description"
                value={heroSubheading}
                onChange={(value) => { setHeroSubheading(value); setHeroErrors((p) => ({ ...p, subheading: undefined })); setHasChanges(true); }}
                placeholder="Short summary of the page under the title"
                tools={["bold", "italic"]}
                error={heroErrors.subheading}
              />
              <SharedContentNavigator
                href="/admin/shared/contact-form"
                navLabel="Shared Content → Contact Form"
                textBeforNav="Edit your form fields in"
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "contact_info" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D4B483]/20 p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">Contact Info</h2>
                <p className="text-sm text-[#3B5249]/55">Texts shown on the left side of the contact page.</p>
              </div>
              <GeneralInput
                value={labelText}
                onChange={(e) => { setLabelText(e.target.value); setInfoErrors((p) => ({ ...p, labelText: undefined })); setHasChanges(true); }}
                placeholder="Get in touch"
                label='Eyebrow Label (e.g. "Get in touch")'
                error={infoErrors.labelText}
              />
              <GeneralInput
                value={directEmailTitle}
                onChange={(e) => { setDirectEmailTitle(e.target.value); setInfoErrors((p) => ({ ...p, directEmailTitle: undefined })); setHasChanges(true); }}
                placeholder="Prefer to reach out directly?"
                label="Direct Email Section Title"
                error={infoErrors.directEmailTitle}
              />
              <GeneralInput
                value={directEmailText}
                onChange={(e) => { setDirectEmailText(e.target.value); setInfoErrors((p) => ({ ...p, directEmailText: undefined })); setHasChanges(true); }}
                placeholder="You can also email me at"
                label="Direct Email Section Text"
                error={infoErrors.directEmailText}
              />
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}

