"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";

import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import MultiLineTextArea from "@/components/admin/inputs/MultiLineTextArea";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { requiredError } from "@/lib/admin/required";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
    eyebrow?: string;
    heading?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
};

const sections = [{ key: "content" as const, label: "Content" }];

type SectionKey = (typeof sections)[number]["key"];

const PAGE_SLUG = "newsletter-unsubscribed";

export default function NewsletterUnsubscribedPageEditor() {
    const { language } = useAdminLanguage();
    const pageContent = useQuery(api.admin.getPageContentAdmin, {
        pageSlug: PAGE_SLUG,
        lang: language ?? undefined,
    });
    const upsertContent = useMutation(api.admin.upsertPageContent);

    const showSaveError = useAdminSaveErrorPopup();

    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>("content");
    const [formData, setFormData] = useState<Record<SectionKey, SectionContent>>({
        content: {},
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [errors, setErrors] = useState<
        Record<string, Partial<Record<keyof SectionContent, string>>>
    >({});

    useEffect(() => {
        if (!pageContent) return;

        const contentMap: Record<string, SectionContent> = {};
        for (const section of pageContent) {
            contentMap[section.sectionKey] = section.content as SectionContent;
        }

        setFormData({
            content: (contentMap.content ?? {}) as SectionContent,
        });
        setHasChanges(false);
        setErrors({});
    }, [pageContent]);

    const updateSection = (
        sectionKey: SectionKey,
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
        const content = formData.content ?? {};

        const next: Record<
            SectionKey,
            Partial<Record<keyof SectionContent, string>>
        > = {
            content: {
                eyebrow: requiredError(content.eyebrow),
                heading: requiredError(content.heading),
                description: requiredError(content.description),
                buttonText: requiredError(content.buttonText),
                buttonLink: requiredError(content.buttonLink),
            },
        };

        for (const sectionKey of Object.keys(next) as SectionKey[]) {
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

    const handleSave = async () => {
        const sectionErrors = validate();
        if (Object.keys(sectionErrors).length > 0) return;

        setSaving(true);
        try {
            for (const section of sections) {
                await upsertContent({
                    pageSlug: PAGE_SLUG,
                    sectionKey: section.key,
                    lang: language ?? undefined,
                    content: formData[section.key] ?? {},
                });
            }
            setHasChanges(false);
        } catch (error) {
            await showSaveError(error, {
                title: "Couldn't save Newsletter unsubscribed page",
            });
        } finally {
            setSaving(false);
        }
    };

    if (pageContent === undefined) {
        return <AdminPageLoader />;
    }

    const current = formData[activeSection] ?? {};
    const currentErrors = errors[activeSection] ?? {};

    return (
        <AdminPageLayout
            pageTitle="Edit Newsletter Unsubscribed Page"
            breadcrumbLabel="Newsletter unsubscribed"
            backHref="/admin/pages"
            sections={sections}
            activeSection={activeSection}
            onSectionChange={(key) => setActiveSection(key as SectionKey)}
            onSave={handleSave}
            saving={saving}
            hasChanges={hasChanges}
        >
            <div data-admin-section-key="content" className="space-y-6">
                <div>
                    <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">
                        Content
                    </h2>
                    <p className="text-sm text-[#3B5249]/55">
                        Shown after a subscriber clicks the unsubscribe link in a
                        newsletter email (Brevo redirects here once the unsubscribe
                        itself is processed).
                    </p>
                </div>
                <GeneralInput
                    label='Eyebrow Label (e.g. "Newsletter")'
                    value={current.eyebrow ?? ""}
                    onChange={(e) => updateSection("content", "eyebrow", e.target.value)}
                    placeholder="Newsletter"
                    error={currentErrors.eyebrow}
                />
                <GeneralInput
                    label="Heading"
                    value={current.heading ?? ""}
                    onChange={(e) => updateSection("content", "heading", e.target.value)}
                    placeholder="You've been unsubscribed"
                    error={currentErrors.heading}
                />
                <MultiLineTextArea
                    label="Description"
                    value={current.description ?? ""}
                    onChange={(e) =>
                        updateSection("content", "description", e.target.value)
                    }
                    placeholder="You won't receive any more newsletter emails from us. If this was a mistake, you can subscribe again any time."
                    helpText={null}
                    error={currentErrors.description}
                />
                <div className="grid md:grid-cols-2 gap-4">
                    <GeneralInput
                        label="Button Text"
                        value={current.buttonText ?? ""}
                        onChange={(e) =>
                            updateSection("content", "buttonText", e.target.value)
                        }
                        placeholder="Back to homepage"
                        error={currentErrors.buttonText}
                    />
                    <GeneralInput
                        label="Button Link"
                        value={current.buttonLink ?? ""}
                        onChange={(e) =>
                            updateSection("content", "buttonLink", e.target.value)
                        }
                        placeholder="/"
                        error={currentErrors.buttonLink}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
