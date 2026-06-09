// HomePageEditor.tsx — refactored section model for new homepage design
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { Plus, Trash2, Star, Copy, Pencil, GripVertical, X } from "lucide-react";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import ButtonField from "@/components/admin/inputs/ButtonField";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import SharedContentNavigator from "@/components/admin/SharedContentNavigator";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
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
  coach_intro: {
    href: "/admin/shared/values",
    navLabel: "Shared Content → Values",
    textBeforNav: "Edit your supporting content in",
  },
};

type Testimonial = {
  _id: Id<"testimonials">;
  authorName: string;
  text: string;
  order: number;
};

const hasHtmlContent = (html: string) =>
  html.replace(/<br\s*\/?>|&nbsp;|<[^>]*>|\s/g, "").length > 0;

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

  const credentials = useQuery(api.admin.getCredentialsAdmin, {
    lang: language ?? undefined,
  });

  // Testimonials CRUD
  const testimonials = useQuery(api.admin.getTestimonialsAdmin, {
    lang: language ?? undefined,
  });
  const createTestimonial = useMutation(api.admin.createTestimonial);
  const updateTestimonial = useMutation(api.admin.updateTestimonial);
  const deleteTestimonial = useMutation(api.admin.deleteTestimonial);
  const reorderTestimonials = useMutation(api.admin.reorderTestimonials);

  const [activeSection, setActiveSection] = useState("hero");
  const [formData, setFormData] = useState<Record<string, SectionContent>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Testimonial state
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isCreatingTestimonial, setIsCreatingTestimonial] = useState(false);
  const [testimonialDragIndex, setTestimonialDragIndex] = useState<number | null>(null);
  const [orderedTestimonials, setOrderedTestimonials] = useState<Testimonial[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"testimonials"> | null>(null);
  const [testimonialFormData, setTestimonialFormData] = useState({ authorName: "", text: "" });

  const [errors, setErrors] = useState<Record<string, any>>({});
  console.log(errors);

  // Sync testimonials list
  useEffect(() => {
    if (testimonials !== undefined) {
      setOrderedTestimonials(testimonials as Testimonial[]);
    }
  }, [testimonials]);

  const resetTestimonialForm = () => {
    setTestimonialFormData({ authorName: "", text: ""});
    setEditingTestimonial(null);
    setIsCreatingTestimonial(false);
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialFormData({
      authorName: testimonial.authorName,
      text: testimonial.text,
    });
    setIsCreatingTestimonial(false);
  };

  const handleCreateTestimonial = () => {
    setIsCreatingTestimonial(true);
    setEditingTestimonial(null);
    setTestimonialFormData({ authorName: "", text: "" });
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialFormData.authorName.trim()) { alert("Student name is required"); return; }
    if (!hasHtmlContent(testimonialFormData.text)) { alert("Testimonial text is required"); return; }

    if (editingTestimonial) {
      await updateTestimonial({
        id: editingTestimonial._id,
        authorName: testimonialFormData.authorName,
        text: testimonialFormData.text,
      });
    } else {
      await createTestimonial({
        lang: language ?? undefined,
        authorName: testimonialFormData.authorName,
        text: testimonialFormData.text,
      });
    }
    resetTestimonialForm();
  };

  const handleDeleteTestimonialClick = (id: Id<"testimonials">) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTestimonial = async () => {
    if (!pendingDeleteId) return;
    await deleteTestimonial({ id: pendingDeleteId });
    setPendingDeleteId(null);
  };

  const handleDuplicateTestimonial = async (testimonial: Testimonial) => {
    await createTestimonial({
      lang: language ?? undefined,
      authorName: `${testimonial.authorName} (Copy)`,
      text: testimonial.text,
    });
  };

  const testimonialList = orderedTestimonials ?? (testimonials as Testimonial[] | undefined) ?? [];

  const handleTestimonialDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (testimonialDragIndex === null || testimonialDragIndex === index) return;
    const next = [...testimonialList];
    const draggedItem = next[testimonialDragIndex];
    next.splice(testimonialDragIndex, 1);
    next.splice(index, 0, draggedItem);
    setOrderedTestimonials(next);
    setTestimonialDragIndex(index);
  };

  const handleTestimonialDragEnd = async () => {
    setTestimonialDragIndex(null);
    const current = orderedTestimonials;
    if (!current || isSavingOrder) return;
    const originalIds = ((testimonials as Testimonial[] | undefined) ?? []).map((t) => t._id);
    const nextIds = current.map((t) => t._id);
    const changed = originalIds.length !== nextIds.length || originalIds.some((id, i) => id !== nextIds[i]);
    if (!changed) return;
    try {
      setIsSavingOrder(true);
      await reorderTestimonials({ orderedIds: nextIds });
    } finally {
      setIsSavingOrder(false);
    }
  };

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
          <RichTextEditor label="Heading" editorKey="hero-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("hero", "heading", e)} placeholder="Main heading..." tools={["bold", "italic", "heading", "color"]} error={errors.hero?.heading} />
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
                  <RichTextEditor editorKey={`hero-${i}`} value={p} onChange={(v) => updateParagraph(i, v)} placeholder={`Paragraph ${i + 1} text...`} tools={["bold", "italic", "heading", "color"]} error={errors.hero?.paragraphs?.[i]} />
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
          <RichTextEditor label="Heading" editorKey="testimonial_section-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("testimonial_section", "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "heading", "color"]} error={errors.testimonial_section?.heading} />

          <AdminConfirmModal
            open={deleteModalOpen}
            onOpenChange={(open) => {
              setDeleteModalOpen(open);
              if (!open) setPendingDeleteId(null);
            }}
            title="Delete testimonial?"
            description="This action cannot be undone."
            variant="destructive"
            confirmText="Delete"
            confirmTextPending="Deleting…"
            onConfirm={confirmDeleteTestimonial}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Testimonials</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={handleCreateTestimonial}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add testimonial
              </button>
            </div>

            {testimonialList.length === 0 ? (
              <div className="text-sm text-[#3B5249]/55 border border-dashed border-[#D4B483]/35 rounded-lg p-4 flex items-center gap-3">
                <Star className="text-[#3B5249]/30" size={20} />
                No testimonials yet. Add your first one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {testimonialList.map((testimonial, i) => (
                  <div
                    key={testimonial._id}
                    draggable
                    onDragStart={() => setTestimonialDragIndex(i)}
                    onDragEnd={() => void handleTestimonialDragEnd()}
                    onDragOver={(e) => handleTestimonialDragOver(e, i)}
                    className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${testimonialDragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-[#3B5249]/45 cursor-grab select-none">
                          <GripVertical size={18} />
                        </span>
                        <span className="font-semibold text-[#3B5249]">{testimonial.authorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateTestimonial(testimonial)}
                          className="p-1.5 text-[#3B5249]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditTestimonial(testimonial)}
                          className="p-1.5 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTestimonialClick(testimonial._id)}
                          className="p-1.5 text-[#3B5249]/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="text-[#3B5249]/65 text-sm italic line-clamp-2 [&_a]:text-[#7B6E9E] [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: testimonial.text }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit/Create Modal */}
          {(editingTestimonial || isCreatingTestimonial) && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
                <div className="border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                    {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
                  </h2>
                  <button onClick={resetTestimonialForm} className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmitTestimonial} className="p-6 space-y-6">
                  <GeneralInput
                    label="Student Name"
                    placeholder="e.g., Alisa"
                    value={testimonialFormData.authorName}
                    onChange={(e) => setTestimonialFormData({ ...testimonialFormData, authorName: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[#3B5249]/85 mb-2">Testimonial Text</label>
                    <RichTextEditor
                      editorKey={editingTestimonial?._id || "new-testimonial"}
                      value={testimonialFormData.text}
                      onChange={(value) => setTestimonialFormData({ ...testimonialFormData, text: value })}
                      placeholder="What did the student say about your lessons?"
                      tools={["bold", "italic", "link"]}
                    />
                  </div>
                  <div className="flex justify-end gap-4 pt-4 border-t border-[#D4B483]/20">
                    <button type="button" onClick={resetTestimonialForm} className="px-6 py-2 text-[#3B5249]/70 hover:text-[#3B5249] transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-[#3B5249] text-[#FAF6F0] rounded-full hover:bg-[#7B6E9E] transition-colors">
                      {editingTestimonial ? "Save Changes" : "Create Testimonial"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "programs") {
      return (
        <div className="space-y-4" data-admin-section-key="programs">
          <RichTextEditor label="Heading" editorKey="programs-heading" value={currentSection.heading || ""} onChange={(e) => updateSection("programs", "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "heading", "color"]} error={errors.programs?.heading} />
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
        <RichTextEditor label="Heading" editorKey={`${activeSection}-heading`} value={currentSection.heading || ""} onChange={(e) => updateSection(activeSection, "heading", e)} placeholder="Section heading..." tools={["bold", "italic", "heading", "color"]} error={errors[activeSection]?.heading} />
        <div className="space-y-4">
          {activeSection === "approach" && <div className="space-y-2" >
            <label className="text-sm font-medium text-[#3B5249]">Quote</label>
            <RichTextEditor editorKey="approach-quote" value={currentSection.quote || ""} onChange={(e) => updateSection("approach", "quote", e)} placeholder="Approach..." tools={["bold", "italic", "heading", "color"]} error={errors.approach?.quote} />          </div>}
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
                <RichTextEditor editorKey={`${activeSection}-${i}`} value={p} onChange={(v) => updateParagraph(i, v)} placeholder={`Paragraph ${i + 1}...`} tools={["bold", "italic", "heading", "color", "fontWeight", "fontFamily"]} error={errors[activeSection]?.paragraphs?.[i]} />
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
