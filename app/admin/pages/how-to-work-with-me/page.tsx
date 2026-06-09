"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import { Copy, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import SvgIconUploader from "@/components/admin/inputs/SvgIconUploader";
import CTA from "@/components/admin/CTA";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { requiredError } from "@/lib/admin/required";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
  heading?: string;
  subheading?: string;
  body?: string;
  buttonText?: string;
  buttonLink?: string;
};

type HowToWorkStep = {
  _id: Id<"howToWorkSteps">;
  title: string;
  description: string;
  icon?: string;
};

export default function HowToWorkWithMePageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "how-to-work",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const steps = useQuery(api.admin.getHowToWorkStepsAdmin, {
    lang: language ?? undefined,
  });
  const createStep = useMutation(api.admin.createHowToWorkStep);
  const updateStep = useMutation(api.admin.updateHowToWorkStep);
  const deleteStep = useMutation(api.admin.deleteHowToWorkStep);
  const reorderSteps = useMutation(api.admin.reorderHowToWorkSteps);

  const pendingFocusSectionKeyRef = useRef<"hero" | "cta" | null>(null);

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [formData, setFormData] = useState<Record<string, SectionContent>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<
    Record<string, Partial<Record<keyof SectionContent, any>>>
  >({});

  const [stepsLocal, setStepsLocal] = useState<HowToWorkStep[]>([]);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [deleteStepModalOpen, setDeleteStepModalOpen] = useState(false);
  const [pendingDeleteStepId, setPendingDeleteStepId] =
    useState<Id<"howToWorkSteps"> | null>(null);

  const [editingStep, setEditingStep] = useState<HowToWorkStep | null>(null);
  const [isCreatingStep, setIsCreatingStep] = useState(false);
  const [stepForm, setStepForm] = useState({
    title: "",
    description: "",
    icon: "",
  });
  const [stepErrors, setStepErrors] = useState<{
    title?: string;
    description?: string;
    icon?: string;
  }>({});

  const sections: Array<{ key: string; label: string }> = [
    { key: "hero", label: "Hero" },
    { key: "steps", label: "Steps" },
    { key: "cta", label: "CTA" },
  ];

  useEffect(() => {
    if (!pageContent) return;

    const contentMap: Record<string, SectionContent> = {};
    for (const section of pageContent as Array<{
      sectionKey: string;
      content: any;
    }>) {
      contentMap[section.sectionKey] = section.content;
    }

    contentMap.hero = { ...(contentMap.hero ?? {}) };
    contentMap.cta = { ...(contentMap.cta ?? {}) };

    setFormData(contentMap);
  }, [pageContent]);

  useEffect(() => {
    if (steps === undefined) return;
    setStepsLocal(steps as HowToWorkStep[]);
  }, [steps]);

  const updateSection = (
    sectionKey: string,
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
    const hero = formData.hero ?? {};
    const cta = formData.cta ?? {};

    const next: Record<string, Partial<Record<keyof SectionContent, any>>> = {
      hero: {
        heading: requiredError(hero.heading),
        subheading: requiredError(hero.subheading, true),
      },
      cta: {
        heading: requiredError(cta.heading),
        body: requiredError(cta.body || cta.subheading, true),
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

  const focusFirstInvalidFieldInSection = (sectionKey: "hero" | "cta") => {
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

  const resetStepModal = () => {
    setEditingStep(null);
    setIsCreatingStep(false);
    setStepForm({ title: "", description: "", icon: "" });
    setStepErrors({});
  };

  const handleCreateStep = () => {
    setIsCreatingStep(true);
    setEditingStep(null);
    setStepForm({ title: "", description: "", icon: "" });
    setStepErrors({});
  };

  const handleEditStep = (step: HowToWorkStep) => {
    setEditingStep(step);
    setIsCreatingStep(false);
    setStepForm({
      title: step.title,
      description: step.description,
      icon: step.icon || "",
    });
    setStepErrors({});
  };

  const validateStepForm = () => {
    const next = {
      title: requiredError(stepForm.title),
      description: requiredError(stepForm.description, true),
      icon: requiredError(stepForm.icon),
    };
    for (const k of Object.keys(next) as Array<keyof typeof next>) {
      if (!next[k]) delete next[k];
    }
    setStepErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStepForm()) return;

    if (editingStep) {
      await updateStep({
        id: editingStep._id,
        title: stepForm.title,
        description: stepForm.description,
        icon: stepForm.icon,
      });
    } else {
      await createStep({
        lang: language ?? undefined,
        title: stepForm.title,
        description: stepForm.description,
        icon: stepForm.icon,
      });
    }
    resetStepModal();
  };

  const handleDeleteStepClick = (id: Id<"howToWorkSteps">) => {
    setPendingDeleteStepId(id);
    setDeleteStepModalOpen(true);
  };

  const confirmDeleteStep = async () => {
    if (!pendingDeleteStepId) return;
    await deleteStep({ id: pendingDeleteStepId });
    setPendingDeleteStepId(null);
  };

  const handleDuplicateStep = async (step: HowToWorkStep) => {
    await createStep({
      lang: language ?? undefined,
      title: `${step.title} (Copy)`,
      description: step.description,
      icon: step.icon as string,
    });
  };

  const handleStepDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleStepDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;

    setStepsLocal((prev) => {
      const next = [...prev];
      const draggedItem = next[draggedStepIndex];
      next.splice(draggedStepIndex, 1);
      next.splice(index, 0, draggedItem);
      return next;
    });
    setDraggedStepIndex(index);
  };

  const handleStepDragEnd = async () => {
    setDraggedStepIndex(null);
    if (stepsLocal.length === 0) return;
    await reorderSteps({ orderedIds: stepsLocal.map((s) => s._id) });
  };

  const handleSave = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      const firstSectionWithError = sections.find(
        (s) => (nextErrors as any)[s.key] !== undefined,
      );
      if (firstSectionWithError && firstSectionWithError.key !== "steps") {
        pendingFocusSectionKeyRef.current = firstSectionWithError.key as
          | "hero"
          | "cta";
        setActiveSection(firstSectionWithError.key);
      }
      return;
    }

    setSaving(true);
    try {
      await upsertContent({
        pageSlug: "how-to-work",
        sectionKey: "hero",
        lang: language ?? undefined,
        content: formData.hero ?? {},
      });
      await upsertContent({
        pageSlug: "how-to-work",
        sectionKey: "cta",
        lang: language ?? undefined,
        content: formData.cta ?? {},
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined || steps === undefined) {
    return <AdminPageLoader />;
  }

  const heroSection = (formData.hero ?? {}) as SectionContent;
  const ctaSection = (formData.cta ?? {}) as SectionContent;

  const currentSection = activeSection === "hero" ? heroSection : ctaSection;

  return (
    <AdminPageLayout
      pageTitle="Edit How to Work With Me Page"
      breadcrumbLabel="How to Work With Me"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      <AdminConfirmModal
        open={deleteStepModalOpen}
        onOpenChange={(open) => {
          setDeleteStepModalOpen(open);
          if (!open) setPendingDeleteStepId(null);
        }}
        title="Delete step?"
        description="This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
        confirmTextPending="Deleting…"
        onConfirm={confirmDeleteStep}
      />
      <div className="space-y-6">
        {activeSection === "steps" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-[#3B5249]">Steps</h3>
                <p className="text-xs text-[#3B5249]/55 mt-1">
                  Manage the list of steps (drag to reorder).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateStep}
                  className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors"
                >
                  <Plus size={18} />
                  Add Step
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
              {stepsLocal.length === 0 ? (
                <div className="p-8 text-center text-[#3B5249]/60">
                  No steps yet. Add your first step.
                </div>
              ) : (
                <div className="divide-y divide-[#D4B483]/15">
                  {stepsLocal.map((step, index) => (
                    <div
                      key={step._id}
                      draggable
                      onDragStart={() => handleStepDragStart(index)}
                      onDragOver={(e) => handleStepDragOver(e, index)}
                      onDragEnd={handleStepDragEnd}
                      className="p-4 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
                    >
                      <div className="text-[#3B5249]/35 cursor-move pt-1">
                        <GripVertical size={20} />
                      </div>

                      <div className="bg-[#7B6E9E]/10 border border-[#7B6E9E]/15 p-2 rounded-lg flex-shrink-0">
                        {step.icon ? (
                          <div
                            className="w-5 h-5 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full"
                            aria-hidden
                            dangerouslySetInnerHTML={{ __html: step.icon }}
                          />
                        ) : (
                          <span className="w-5 h-5 text-xs font-bold text-[#7B6E9E] inline-flex items-center justify-center">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#3B5249]/55">
                            #{index + 1}
                          </span>
                          <div className="font-semibold text-[#3B5249] truncate">
                            {step.title}
                          </div>
                        </div>
                        <div
                          className="text-sm text-[#3B5249]/65 mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: step.description }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicateStep(step)}
                          className="p-2 text-[#3B5249]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => handleEditStep(step)}
                          className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteStepClick(step._id)}
                          className="p-2 text-[#3B5249]/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeSection === "cta" ? (
          <div data-admin-section-key="cta">
            <CTA
              title={currentSection.heading || ""}
              onTitleChange={(value) => updateSection("cta", "heading", value)}
              titleError={(errors.cta as any)?.heading}
              description={
                currentSection.body || currentSection.subheading || ""
              }
              onDescriptionChange={(value) =>
                updateSection("cta", "body", value)
              }
              editorKey="how-to-work-cta-description"
              tools={["bold", "italic"]}
              descriptionError={(errors.cta as any)?.body}
              buttons={[
                {
                  text: currentSection.buttonText || "",
                  link: currentSection.buttonLink || "",
                  onTextChange: (value) =>
                    updateSection("cta", "buttonText", value),
                  onLinkChange: (value) =>
                    updateSection("cta", "buttonLink", value),
                  textError: (errors.cta as any)?.buttonText,
                  linkError: (errors.cta as any)?.buttonLink,
                },
              ]}
            />
          </div>
        ) : (
          <div data-admin-section-key="hero">
            <GeneralInput
              label="Title"
              value={currentSection.heading || ""}
              onChange={(e) =>
                updateSection(activeSection, "heading", e.target.value)
              }
              placeholder="Title..."
              error={(errors.hero as any)?.heading}
            />

            <RichTextEditor
              label="Description"
              editorKey={`how-to-work-${activeSection}-description`}
              value={currentSection.subheading || ""}
              onChange={(value) =>
                updateSection(activeSection, "subheading", value)
              }
              placeholder="Short summary of the page under the title"
              tools={["bold", "italic"]}
              error={(errors.hero as any)?.subheading}
            />
          </div>
        )}
      </div>
      {(editingStep || isCreatingStep) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                {editingStep ? "Edit Step" : "Add New Step"}
              </h2>
              <button
                onClick={resetStepModal}
                className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveStep} className="p-6 space-y-6">
              {/* SVG Icon Upload */}
              <SvgIconUploader
                value={stepForm.icon}
                onChange={(svg) => {
                  setStepForm((p) => ({ ...p, icon: svg }));
                  setStepErrors((prev) => ({ ...prev, icon: undefined }));
                }}
                error={stepErrors.icon}
              />

              <div className="space-y-2">
                <GeneralInput
                  label="Title"
                  value={stepForm.title}
                  onChange={(e) => {
                    setStepForm((p) => ({ ...p, title: e.target.value }));
                    setStepErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Step title..."
                  error={stepErrors.title}
                />
              </div>

              <div className="space-y-2">
                <RichTextEditor
                  label="Description"
                  editorKey={editingStep?._id ?? "new-step"}
                  value={stepForm.description}
                  onChange={(value) => {
                    setStepForm((p) => ({ ...p, description: value }));
                    setStepErrors((prev) => ({
                      ...prev,
                      description: undefined,
                    }));
                  }}
                  placeholder="One or two sentences."
                  tools={["bold", "italic", "emoji"]}
                  error={stepErrors.description}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-[#D4B483]/20">
                <button
                  type="button"
                  onClick={resetStepModal}
                  className="px-6 py-2 text-[#3B5249]/70 hover:text-[#3B5249] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3B5249] text-[#FAF6F0] rounded-full hover:bg-[#7B6E9E] transition-colors"
                >
                  {editingStep ? "Save Changes" : "Create Step"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
