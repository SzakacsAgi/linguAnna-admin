"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";

import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import MultiLineTextArea from "@/components/admin/inputs/MultiLineTextArea";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { requiredError } from "@/lib/admin/required";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
    // Header
    eyebrow?: string;
    heading?: string;
    description?: string;
    // Form
    formHeading?: string;
    englishTitle?: string;
    hungarianTitle?: string;
    saveButtonText?: string;
    savingButtonText?: string;
    errorText?: string;
    savedEnglishText?: string;
    savedHungarianText?: string;
    // Invalid link
    invalidTitle?: string;
    invalidBody?: string;
};

const sections = [
    { key: "header" as const, label: "Header" },
    { key: "form" as const, label: "Form" },
    { key: "invalidLink" as const, label: "Invalid link" },
];

type SectionKey = (typeof sections)[number]["key"];

const PAGE_SLUG = "newsletter-language";

export default function NewsletterLanguagePageEditor() {
    const { language } = useAdminLanguage();
    const pageContent = useQuery(api.admin.getPageContentAdmin, {
        pageSlug: PAGE_SLUG,
        lang: language ?? undefined,
    });
    const upsertContent = useMutation(api.admin.upsertPageContent);

    const showSaveError = useAdminSaveErrorPopup();

    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>("header");
    const [formData, setFormData] = useState<Record<SectionKey, SectionContent>>({
        header: {},
        form: {},
        invalidLink: {},
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
            contentMap[section.sectionKey] = section.content as SectionContent;
        }

        setFormData({
            header: (contentMap.header ?? {}) as SectionContent,
            form: (contentMap.form ?? {}) as SectionContent,
            invalidLink: (contentMap.invalidLink ?? {}) as SectionContent,
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
        const header = formData.header ?? {};
        const form = formData.form ?? {};
        const invalidLink = formData.invalidLink ?? {};

        const next: Record<
            SectionKey,
            Partial<Record<keyof SectionContent, string>>
        > = {
            header: {
                eyebrow: requiredError(header.eyebrow),
                heading: requiredError(header.heading),
                description: requiredError(header.description),
            },
            form: {
                formHeading: requiredError(form.formHeading),
                englishTitle: requiredError(form.englishTitle),
                hungarianTitle: requiredError(form.hungarianTitle),
                saveButtonText: requiredError(form.saveButtonText),
                savingButtonText: requiredError(form.savingButtonText),
                errorText: requiredError(form.errorText),
                savedEnglishText: requiredError(form.savedEnglishText),
                savedHungarianText: requiredError(form.savedHungarianText),
            },
            invalidLink: {
                invalidTitle: requiredError(invalidLink.invalidTitle),
                invalidBody: requiredError(invalidLink.invalidBody),
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

    const focusFirstInvalidFieldInSection = (sectionKey: SectionKey) => {
        if (typeof document === "undefined") return;

        const root = document.querySelector(
            `[data-admin-section-key="${sectionKey}"]`,
        ) as HTMLElement | null;
        if (!root) return;

        const target =
            (root.querySelector('[aria-invalid="true"]') as HTMLElement | null) ??
            (root.querySelector("input, textarea") as HTMLElement | null);

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
        const sectionErrors = validate();
        const errorSectionKeys = Object.keys(sectionErrors) as SectionKey[];

        if (errorSectionKeys.length > 0) {
            const activeIndex = sections.findIndex((s) => s.key === activeSection);

            let nextInvalidKey: SectionKey = activeSection;
            if (errorSectionKeys.includes(activeSection)) {
                nextInvalidKey = activeSection;
            } else {
                for (let offset = 1; offset <= sections.length; offset++) {
                    const idx = (activeIndex + offset) % sections.length;
                    const candidate = sections[idx]?.key;
                    if (candidate && errorSectionKeys.includes(candidate)) {
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
                    pageSlug: PAGE_SLUG,
                    sectionKey: section.key,
                    lang: language ?? undefined,
                    content: formData[section.key] ?? {},
                });
            }
            setHasChanges(false);
        } catch (error) {
            await showSaveError(error, {
                title: "Couldn't save Newsletter language page",
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
            pageTitle="Edit Newsletter Language Page"
            breadcrumbLabel="Newsletter language"
            backHref="/admin/pages"
            sections={sections}
            activeSection={activeSection}
            onSectionChange={(key) => setActiveSection(key as SectionKey)}
            onSave={handleSave}
            saving={saving}
            hasChanges={hasChanges}
        >
            {activeSection === "header" ? (
                <div data-admin-section-key="header" className="space-y-6">
                    <div>
                        <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">
                            Header
                        </h2>
                        <p className="text-sm text-[#3B5249]/55">
                            Texts shown above the language form.
                        </p>
                    </div>
                    <GeneralInput
                        label='Eyebrow Label (e.g. "Newsletter settings")'
                        value={current.eyebrow ?? ""}
                        onChange={(e) => updateSection("header", "eyebrow", e.target.value)}
                        placeholder="Newsletter settings"
                        error={currentErrors.eyebrow}
                    />
                    <GeneralInput
                        label="Heading"
                        value={current.heading ?? ""}
                        onChange={(e) => updateSection("header", "heading", e.target.value)}
                        placeholder="Manage your preferences"
                        error={currentErrors.heading}
                    />
                    <MultiLineTextArea
                        label="Description"
                        value={current.description ?? ""}
                        onChange={(e) =>
                            updateSection("header", "description", e.target.value)
                        }
                        placeholder="Choose how you'd like to hear from us. You can update this at any time."
                        helpText={null}
                        error={currentErrors.description}
                    />
                </div>
            ) : null}

            {activeSection === "form" ? (
                <div data-admin-section-key="form" className="space-y-6">
                    <div>
                        <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">
                            Form
                        </h2>
                        <p className="text-sm text-[#3B5249]/55">
                            Texts shown on the language-choice card.
                        </p>
                    </div>
                    <GeneralInput
                        label="Form Heading"
                        value={current.formHeading ?? ""}
                        onChange={(e) =>
                            updateSection("form", "formHeading", e.target.value)
                        }
                        placeholder="Which language do you prefer?"
                        error={currentErrors.formHeading}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                        <GeneralInput
                            label="English Option Title"
                            value={current.englishTitle ?? ""}
                            onChange={(e) =>
                                updateSection("form", "englishTitle", e.target.value)
                            }
                            placeholder="English"
                            error={currentErrors.englishTitle}
                        />
                        <GeneralInput
                            label="Hungarian Option Title"
                            value={current.hungarianTitle ?? ""}
                            onChange={(e) =>
                                updateSection("form", "hungarianTitle", e.target.value)
                            }
                            placeholder="Hungarian (Magyar)"
                            error={currentErrors.hungarianTitle}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <GeneralInput
                            label="Save Button Text"
                            value={current.saveButtonText ?? ""}
                            onChange={(e) =>
                                updateSection("form", "saveButtonText", e.target.value)
                            }
                            placeholder="Save preferences"
                            error={currentErrors.saveButtonText}
                        />
                        <GeneralInput
                            label="Saving Button Text"
                            value={current.savingButtonText ?? ""}
                            onChange={(e) =>
                                updateSection("form", "savingButtonText", e.target.value)
                            }
                            placeholder="Saving…"
                            error={currentErrors.savingButtonText}
                        />
                    </div>

                    <GeneralInput
                        label="Error Text"
                        value={current.errorText ?? ""}
                        onChange={(e) => updateSection("form", "errorText", e.target.value)}
                        placeholder="Something went wrong, please try again. / Hiba történt, kérjük, próbáld újra."
                        error={currentErrors.errorText}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                        <GeneralInput
                            label="Saved Message (English chosen)"
                            value={current.savedEnglishText ?? ""}
                            onChange={(e) =>
                                updateSection("form", "savedEnglishText", e.target.value)
                            }
                            placeholder="Saved! You'll now receive newsletters in English."
                            error={currentErrors.savedEnglishText}
                        />
                        <GeneralInput
                            label="Saved Message (Hungarian chosen)"
                            value={current.savedHungarianText ?? ""}
                            onChange={(e) =>
                                updateSection("form", "savedHungarianText", e.target.value)
                            }
                            placeholder="Mentve! Mostantól magyar nyelven kapod a hírleveleket."
                            error={currentErrors.savedHungarianText}
                        />
                    </div>
                </div>
            ) : null}

            {activeSection === "invalidLink" ? (
                <div data-admin-section-key="invalidLink" className="space-y-6">
                    <div>
                        <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-1">
                            Invalid link
                        </h2>
                        <p className="text-sm text-[#3B5249]/55">
                            Shown instead of the form when the link&apos;s token doesn&apos;t
                            match any subscriber (e.g. expired). Reuses the Not Found page
                            layout with this title and body.
                        </p>
                    </div>
                    <RichTextEditor
                        label="Title"
                        editorKey="newsletter-language-invalid-title"
                        value={current.invalidTitle ?? ""}
                        onChange={(value) =>
                            updateSection("invalidLink", "invalidTitle", value)
                        }
                        placeholder="This link is invalid or has expired"
                        error={currentErrors.invalidTitle}
                    />
                    <MultiLineTextArea
                        label="Body"
                        value={current.invalidBody ?? ""}
                        onChange={(e) =>
                            updateSection("invalidLink", "invalidBody", e.target.value)
                        }
                        placeholder="Ez a link érvénytelen vagy lejárt. Kérjük, iratkozz fel újra a hírlevélre."
                        helpText={null}
                        error={currentErrors.invalidBody}
                    />
                </div>
            ) : null}
        </AdminPageLayout>
    );
}
