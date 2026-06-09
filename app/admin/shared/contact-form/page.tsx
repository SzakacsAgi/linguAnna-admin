"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

const CONTACT_FORM_SECTIONS = [
  { key: "labels", label: "Field Labels" },
  { key: "placeholders", label: "Placeholders" },
  { key: "errors", label: "Error Messages" },
  { key: "options", label: "Subject Options" },
  { key: "consent", label: "Consent & Button" },
  { key: "success", label: "Success State" },
  { key: "error", label: "Error State" },
] as const;

type ContactFormSectionKey = (typeof CONTACT_FORM_SECTIONS)[number]["key"];

interface ContactFormSettings {
  labels: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  };
  placeholders: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  };
  errors: {
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    subjectRequired?: string;
    messageRequired: string;
  };
  subjectOptions: string[];
  consentText: string;
  recaptchaText?: string;
  buttonText: string;
  buttonTextSending: string;
  success: {
    title: string;
    message: string;
    buttonText: string;
  };
  error: {
    title: string;
    message: string;
    buttonText: string;
  };
}

export default function ContactFormAdminPage() {
  const { language } = useAdminLanguage();
  const existingSettings = useQuery(api.admin.getSiteSettingsAdmin, {
    key: "contact_form",
    lang: language ?? undefined,
  });
  const upsertSettings = useMutation(api.admin.upsertSiteSettings);
  const showSaveError = useAdminSaveErrorPopup();

  const [settings, setSettings] = useState<ContactFormSettings>(
    {} as ContactFormSettings,
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ContactFormSectionKey>("labels");

  const [errors, setErrors] = useState<{
    labels?: Partial<ContactFormSettings["labels"]>;
    placeholders?: Partial<ContactFormSettings["placeholders"]>;
    errors?: Partial<ContactFormSettings["errors"]>;
    subjectOptions?: Array<string | undefined>;
    consentText?: string;
    buttonText?: string;
    buttonTextSending?: string;
    reCAPTHCAText?: string;
    success?: Partial<ContactFormSettings["success"]>;
    error?: Partial<ContactFormSettings["error"]>;
  }>({});

  const hasAnyError = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(hasAnyError);
    if (typeof value === "object")
      return Object.values(value).some(hasAnyError);
    return false;
  };

  const computeValidationErrors = () => {
    const next: typeof errors = {
      labels: {
        name: requiredError(settings?.labels?.name),
        email: requiredError(settings?.labels?.email),
        subject: requiredError(settings?.labels?.subject),
        message: requiredError(settings?.labels?.message),
      },
      placeholders: {
        name: requiredError(settings?.placeholders?.name),
        email: requiredError(settings?.placeholders?.email),
        subject: requiredError(settings?.placeholders?.subject),
        message: requiredError(settings?.placeholders?.message),
      },
      errors: {
        nameRequired: requiredError(settings?.errors?.nameRequired),
        emailRequired: requiredError(settings?.errors?.emailRequired),
        emailInvalid: requiredError(settings?.errors?.emailInvalid),
        messageRequired: requiredError(settings?.errors?.messageRequired),
      },
      subjectOptions: (settings?.subjectOptions ?? []).map((opt) =>
        requiredError(opt),
      ),
      consentText: requiredError(settings?.consentText, true),
      buttonText: requiredError(settings?.buttonText),
      buttonTextSending: requiredError(settings?.buttonTextSending),
      reCAPTHCAText: requiredError(settings?.recaptchaText),
      success: {
        title: requiredError(settings?.success?.title),
        message: requiredError(settings?.success?.message),
        buttonText: requiredError(settings?.success?.buttonText),
      },
      error: {
        title: requiredError(settings?.error?.title),
        message: requiredError(settings?.error?.message),
        buttonText: requiredError(settings?.error?.buttonText),
      },
    };

    const cleanupObject = (obj: Record<string, unknown> | undefined) => {
      if (!obj) return undefined;
      const copy: Record<string, unknown> = { ...obj };
      for (const k of Object.keys(copy)) {
        if (!copy[k]) delete copy[k];
      }
      return Object.keys(copy).length > 0 ? (copy as any) : undefined;
    };

    const cleaned: typeof errors = {
      labels: cleanupObject(next.labels as any),
      placeholders: cleanupObject(next.placeholders as any),
      errors: cleanupObject(next.errors as any),
      subjectOptions:
        next.subjectOptions && next.subjectOptions.some(Boolean)
          ? next.subjectOptions
          : undefined,
      consentText: next.consentText || undefined,
      buttonText: next.buttonText || undefined,
      buttonTextSending: next.buttonTextSending || undefined,
      reCAPTHCAText: next.reCAPTHCAText || undefined,
      success: cleanupObject(next.success as any),
      error: cleanupObject(next.error as any),
    };

    setErrors(cleaned);
    return cleaned;
  };

  useEffect(() => {
    if (existingSettings?.data) {
      const data = existingSettings.data;
      setSettings({
        ...data,
        subjectOptions: Array.isArray(data.subjectOptions) ? data.subjectOptions : [],
      });
      setHasChanges(false);
      setErrors({});
    }
  }, [existingSettings]);

  const handleSave = async () => {
    const nextErrors = computeValidationErrors();
    if (Object.keys(nextErrors).length > 0 && hasAnyError(nextErrors)) {
      const nextSection: ContactFormSectionKey = hasAnyError(nextErrors.labels)
        ? "labels"
        : hasAnyError(nextErrors.placeholders)
          ? "placeholders"
          : hasAnyError(nextErrors.errors)
            ? "errors"
            : hasAnyError(nextErrors.subjectOptions)
              ? "options"
              : nextErrors.consentText ||
                nextErrors.buttonText ||
                nextErrors.buttonTextSending ||
                nextErrors.reCAPTHCAText
                ? "consent"
                : hasAnyError(nextErrors.success)
                  ? "success"
                  : "error";
      setActiveSection(nextSection);
      return;
    }
    setSaving(true);
    try {
      await upsertSettings({
        key: "contact_form",
        lang: language ?? undefined,
        data: settings,
      });
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't save Contact Form settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLabels = (
    key: keyof ContactFormSettings["labels"],
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      labels: { ...prev.labels, [key]: value },
    }));
    setErrors((prev) => ({
      ...prev,
      labels: { ...(prev.labels ?? {}), [key]: undefined },
    }));
    setHasChanges(true);
  };

  const updatePlaceholders = (
    key: keyof ContactFormSettings["placeholders"],
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      placeholders: { ...prev.placeholders, [key]: value },
    }));
    setErrors((prev) => ({
      ...prev,
      placeholders: { ...(prev.placeholders ?? {}), [key]: undefined },
    }));
    setHasChanges(true);
  };

  const updateErrors = (
    key: keyof ContactFormSettings["errors"],
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      errors: { ...prev.errors, [key]: value },
    }));
    setErrors((prev) => ({
      ...prev,
      errors: { ...(prev.errors ?? {}), [key]: undefined },
    }));
    setHasChanges(true);
  };

  const [draggedSubjectIndex, setDraggedSubjectIndex] = useState<number | null>(null);

  const addSubjectOption = () => {
    setSettings((prev) => ({
      ...prev,
      subjectOptions: [...(prev.subjectOptions ?? []), ""],
    }));
    setErrors((prev) => ({
      ...prev,
      subjectOptions: [...(prev.subjectOptions ?? []), undefined],
    }));
    setHasChanges(true);
  };

  const removeSubjectOption = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      subjectOptions: (prev.subjectOptions ?? []).filter((_, i) => i !== index),
    }));
    setErrors((prev) => ({
      ...prev,
      subjectOptions: (prev.subjectOptions ?? []).filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  const updateSubjectOption = (index: number, value: string) => {
    setSettings((prev) => {
      const next = [...(prev.subjectOptions ?? [])];
      next[index] = value;
      return { ...prev, subjectOptions: next };
    });
    setErrors((prev) => {
      const next = [...(prev.subjectOptions ?? [])];
      next[index] = undefined;
      return { ...prev, subjectOptions: next };
    });
    setHasChanges(true);
  };

  const handleSubjectDragStart = (index: number) => setDraggedSubjectIndex(index);

  const handleSubjectDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSubjectIndex === null || draggedSubjectIndex === index) return;
    setSettings((prev) => {
      const next = [...(prev.subjectOptions ?? [])];
      const dragged = next[draggedSubjectIndex];
      next.splice(draggedSubjectIndex, 1);
      next.splice(index, 0, dragged);
      return { ...prev, subjectOptions: next };
    });
    setDraggedSubjectIndex(index);
    setHasChanges(true);
  };

  const handleSubjectDragEnd = () => setDraggedSubjectIndex(null);

  if (existingSettings === undefined) {
    return <AdminPageLoader />;
  }

  return (
    <AdminPageLayout
      pageTitle="Contact Form Settings"
      breadcrumbLabel="Contact Form"
      backHref="/admin/shared"
      sections={
        CONTACT_FORM_SECTIONS as unknown as { key: string; label: string }[]
      }
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as ContactFormSectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      <div className="space-y-6">
        {activeSection === "labels" ? (
          <div className="space-y-6">
            <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
              Field Labels
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Name Label"
                placeholder="Name..."
                value={settings?.labels?.name || ""}
                onChange={(e) => updateLabels("name", e.target.value)}
                error={errors.labels?.name}
              />
              <GeneralInput
                label="Email Label"
                placeholder="Email..."
                value={settings?.labels?.email || ""}
                onChange={(e) => updateLabels("email", e.target.value)}
                error={errors.labels?.email}
              />
              <GeneralInput
                label="Subject Label"
                placeholder="Subject..."
                value={settings?.labels?.subject || ""}
                onChange={(e) => updateLabels("subject", e.target.value)}
                error={errors.labels?.subject}
              />
              <div className="md:col-span-2">
                <GeneralInput
                  label="Message Label"
                  placeholder="Message..."
                  value={settings?.labels?.message || ""}
                  onChange={(e) => updateLabels("message", e.target.value)}
                  error={errors.labels?.message}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "placeholders" ? (
          <div className="space-y-6">
            <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
              Placeholders
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Name Placeholder"
                placeholder="Name"
                value={settings?.placeholders?.name || ""}
                onChange={(e) => updatePlaceholders("name", e.target.value)}
                error={errors.placeholders?.name}
              />
              <GeneralInput
                label="Email Placeholder"
                placeholder="Email"
                value={settings?.placeholders?.email || ""}
                onChange={(e) => updatePlaceholders("email", e.target.value)}
                error={errors.placeholders?.email}
              />
              <GeneralInput
                label="Subject Placeholder"
                placeholder="What can I help you with?"
                value={settings?.placeholders?.subject || ""}
                onChange={(e) => updatePlaceholders("subject", e.target.value)}
                error={errors.placeholders?.subject}
              />
              <div className="md:col-span-2">
                <GeneralInput
                  label="Message Placeholder"
                  placeholder="Message..."
                  value={settings?.placeholders?.message || ""}
                  onChange={(e) =>
                    updatePlaceholders("message", e.target.value)
                  }
                  error={errors.placeholders?.message}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "errors" ? (
          <div className="space-y-6">
            <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
              Error Messages
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Name Required"
                placeholder="Please enter your name"
                value={settings?.errors?.nameRequired || ""}
                onChange={(e) => updateErrors("nameRequired", e.target.value)}
                error={errors.errors?.nameRequired}
              />
              <GeneralInput
                label="Email Required"
                placeholder="Please enter your email"
                value={settings?.errors?.emailRequired || ""}
                onChange={(e) => updateErrors("emailRequired", e.target.value)}
                error={errors.errors?.emailRequired}
              />
              <GeneralInput
                label="Email Invalid"
                placeholder="Please enter a valid email address"
                value={settings?.errors?.emailInvalid || ""}
                onChange={(e) => updateErrors("emailInvalid", e.target.value)}
                error={errors.errors?.emailInvalid}
              />
              <GeneralInput
                label="Subject Required"
                placeholder="Please enter a subject"
                value={settings?.errors?.subjectRequired || ""}
                onChange={(e) =>
                  updateErrors("subjectRequired", e.target.value)
                }
              />
              <div className="md:col-span-2">
                <GeneralInput
                  label="Message Required"
                  placeholder="Please enter your message"
                  value={settings?.errors?.messageRequired || ""}
                  onChange={(e) =>
                    updateErrors("messageRequired", e.target.value)
                  }
                  error={errors.errors?.messageRequired}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "options" ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                Subject Options
              </h2>
              <p className="text-sm text-[#3B5249]/55 mt-1">
                The subject field will appear as a dropdown with these options. Drag rows to reorder.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#3B5249]">Options</h3>
                <button
                  type="button"
                  onClick={addSubjectOption}
                  className="inline-flex items-center gap-1 text-[#7B6E9E] hover:text-[#3B5249] text-sm"
                >
                  <Plus size={16} />
                  Add Option
                </button>
              </div>

              <div className="space-y-3">
                {(settings?.subjectOptions ?? []).map((option, index) => (
                  <div
                    key={`subject-${index}`}
                    draggable
                    onDragStart={() => handleSubjectDragStart(index)}
                    onDragOver={(e) => handleSubjectDragOver(e, index)}
                    onDragEnd={handleSubjectDragEnd}
                    className={`flex items-center gap-3 rounded-xl border border-[#D4B483]/20 bg-white p-3 transition-all ${draggedSubjectIndex === index ? "opacity-60 shadow-lg" : ""
                      }`}
                  >
                    <span
                      title="Drag to reorder"
                      className="cursor-grab text-[#3B5249]/35 hover:text-[#3B5249]"
                    >
                      <GripVertical size={18} />
                    </span>
                    <div className="flex-1">
                      <GeneralInput
                        label={undefined}
                        placeholder="Option..."
                        value={option || ""}
                        onChange={(e) => updateSubjectOption(index, e.target.value)}
                        error={errors.subjectOptions?.[index]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSubjectOption(index)}
                      className="p-2 text-[#3B5249]/40 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      aria-label="Remove option"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "consent" ? (
          <div className="space-y-6">
            <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
              Consent & Button
            </h2>

            <div className="space-y-2">
              <label
                className={`block text-sm font-medium ${errors.consentText ? "text-red-600" : "text-[#3B5249]/85"
                  }`.trim()}
              >
                Consent Text
              </label>
              <RichTextEditor
                editorKey="contact-form-consent"
                value={settings?.consentText || ""}
                onChange={(value) => {
                  setSettings((prev) => ({ ...prev, consentText: value }));
                  setHasChanges(true);
                  setErrors((prev) => ({ ...prev, consentText: undefined }));
                }}
                placeholder="Privacy consent text..."
                tools={["bold", "link"]}
                error={errors.consentText}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Button Text"
                placeholder="Send..."
                value={settings?.buttonText || ""}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    buttonText: e.target.value,
                  }));
                  setHasChanges(true);
                  setErrors((prev) => ({ ...prev, buttonText: undefined }));
                }}
                error={errors.buttonText}
              />
              <GeneralInput
                label="Button Text (Sending)"
                placeholder="Sending..."
                value={settings?.buttonTextSending || ""}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    buttonTextSending: e.target.value,
                  }));
                  setHasChanges(true);
                  setErrors((prev) => ({
                    ...prev,
                    buttonTextSending: undefined,
                  }));
                }}
                error={errors.buttonTextSending}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#3B5249]/85">
                reCAPTCHA text
              </label>
              <span className="text-xs text-red-500">
                You must add the links provided by default! If you modify this
                field make sure the links will be part of the new text.
              </span>
              <RichTextEditor
                editorKey="contact-form-recaptcha"
                value={settings?.recaptchaText || ""}
                onChange={(value) => {
                  setSettings((prev) => ({ ...prev, recaptchaText: value }));
                  setHasChanges(true);
                }}
                placeholder="reCAPTCHA text..."
                tools={["bold", "link"]}
                error={errors.reCAPTHCAText}
              />
            </div>
          </div>
        ) : null}

        {activeSection === "success" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                Success State
              </h2>
              <p className="text-sm text-[#3B5249]/55 mt-1">
                Shown when the form is successfully submitted.
              </p>
            </div>

            <GeneralInput
              label="Title"
              placeholder="Message Sent!"
              value={settings?.success?.title || ""}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  success: { ...prev.success, title: e.target.value },
                }));
                setHasChanges(true);
                setErrors((prev) => ({
                  ...prev,
                  success: { ...(prev.success ?? {}), title: undefined },
                }));
              }}
              error={errors.success?.title}
            />

            <div className="space-y-2">
              <label
                className={`block text-sm font-medium ${errors.success?.message ? "text-red-600" : "text-[#3B5249]/85"
                  }`.trim()}
              >
                Message
              </label>
              <textarea
                value={settings?.success?.message || ""}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    success: { ...prev.success, message: e.target.value },
                  }));
                  setHasChanges(true);
                  setErrors((prev) => ({
                    ...prev,
                    success: { ...(prev.success ?? {}), message: undefined },
                  }));
                }}
                rows={3}
                aria-invalid={Boolean(errors.success?.message)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${errors.success?.message
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[#D4B483]/35 bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40 focus:ring-[#7B6E9E]/30"
                  }`.trim()}
                placeholder="Your message..."
              />
              {errors.success?.message ? (
                <p className="text-xs text-red-600">{errors.success.message}</p>
              ) : null}
            </div>

            <GeneralInput
              label="Button Text"
              placeholder="Send another message..."
              value={settings?.success?.buttonText || ""}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  success: { ...prev.success, buttonText: e.target.value },
                }));
                setHasChanges(true);
                setErrors((prev) => ({
                  ...prev,
                  success: { ...(prev.success ?? {}), buttonText: undefined },
                }));
              }}
              error={errors.success?.buttonText}
            />
          </div>
        ) : null}

        {activeSection === "error" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                Error State
              </h2>
              <p className="text-sm text-[#3B5249]/55 mt-1">
                Shown when the form submission fails.
              </p>
            </div>

            <GeneralInput
              label="Title"
              placeholder="Something went wrong"
              value={settings?.error?.title || ""}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  error: { ...prev.error, title: e.target.value },
                }));
                setHasChanges(true);
                setErrors((prev) => ({
                  ...prev,
                  error: { ...(prev.error ?? {}), title: undefined },
                }));
              }}
              error={errors.error?.title}
            />

            <div className="space-y-2">
              <label
                className={`block text-sm font-medium ${errors.error?.message ? "text-red-600" : "text-[#3B5249]/85"
                  }`.trim()}
              >
                Message
              </label>
              <textarea
                value={settings?.error?.message || ""}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    error: { ...prev.error, message: e.target.value },
                  }));
                  setHasChanges(true);
                  setErrors((prev) => ({
                    ...prev,
                    error: { ...(prev.error ?? {}), message: undefined },
                  }));
                }}
                rows={3}
                aria-invalid={Boolean(errors.error?.message)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${errors.error?.message
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[#D4B483]/35 bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40 focus:ring-[#7B6E9E]/30"
                  }`.trim()}
                placeholder="Your message..."
              />
              {errors.error?.message ? (
                <p className="text-xs text-red-600">{errors.error.message}</p>
              ) : null}
            </div>

            <GeneralInput
              label="Button Text"
              placeholder="Try again..."
              value={settings?.error?.buttonText || ""}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  error: { ...prev.error, buttonText: e.target.value },
                }));
                setHasChanges(true);
                setErrors((prev) => ({
                  ...prev,
                  error: { ...(prev.error ?? {}), buttonText: undefined },
                }));
              }}
              error={errors.error?.buttonText}
            />
          </div>
        ) : null}
      </div>
    </AdminPageLayout>
  );
}
