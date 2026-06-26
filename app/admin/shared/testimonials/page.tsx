"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Star,
  Copy,
} from "lucide-react";
import Link from "next/link";

import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type Testimonial = {
  _id: Id<"testimonials">;
  authorName: string;
  text: string;
  order: number;
};

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_FORM = {
  authorName: "",
  text: "",
};

type FormErrors = Partial<Record<keyof typeof DEFAULT_FORM, string>>;

const FIELD_ERROR = "Please fill out this field";

export default function TestimonialsAdminPage() {
  const { language } = useAdminLanguage();

  const testimonials = useQuery(api.admin.getTestimonialsAdmin, {
    lang: language ?? undefined,
  });
  const createTestimonial = useMutation(api.admin.createTestimonial);
  const updateTestimonial = useMutation(api.admin.updateTestimonial);
  const deleteTestimonial = useMutation(api.admin.deleteTestimonial);
  const reorderTestimonials = useMutation(api.admin.reorderTestimonials);

  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedTestimonials, setOrderedTestimonials] = useState<
    Testimonial[] | null
  >(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] =
    useState<Id<"testimonials"> | null>(null);

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (testimonials !== undefined) {
      setOrderedTestimonials(testimonials as Testimonial[]);
    }
  }, [testimonials]);

  function validate(data: typeof DEFAULT_FORM): FormErrors {
    const e: FormErrors = {};
    if (!data.authorName.trim()) e.authorName = FIELD_ERROR;
    if (!stripHtmlToText(data.text)) e.text = FIELD_ERROR;
    return e;
  }

  function updateField<K extends keyof typeof DEFAULT_FORM>(
    key: K,
    value: string,
  ) {
    const next = { ...formData, [key]: value };
    setFormData(next);

    if (submitted) {
      setErrors(validate(next));
    }
  }

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setErrors({});
    setSubmitted(false);
    setEditingTestimonial(null);
    setIsCreating(false);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      authorName: testimonial.authorName,
      text: testimonial.text,
    });
    setErrors({});
    setSubmitted(false);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTestimonial(null);
    setFormData(DEFAULT_FORM);
    setErrors({});
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      authorName: formData.authorName,
      text: formData.text,
    };

    if (editingTestimonial) {
      await updateTestimonial({
        id: editingTestimonial._id,
        ...payload,
      });
    } else {
      await createTestimonial({
        lang: language ?? undefined,
        ...payload,
      });
    }

    resetForm();
  };

  const handleDeleteClick = (id: Id<"testimonials">) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    await deleteTestimonial({ id: pendingDeleteId });
    setPendingDeleteId(null);
  };

  const handleDuplicate = async (testimonial: Testimonial) => {
    await createTestimonial({
      lang: language ?? undefined,
      authorName: `${testimonial.authorName} (Copy)`,
      text: testimonial.text,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const list = orderedTestimonials ?? (testimonials as Testimonial[]);

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const next = [...list];
    const draggedItem = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, draggedItem);
    setOrderedTestimonials(next);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    const current = orderedTestimonials;
    if (!current || isSavingOrder) return;

    const originalIds = (testimonials as Testimonial[]).map((t) => t._id);
    const nextIds = current.map((t) => t._id);

    const changed =
      originalIds.length !== nextIds.length ||
      originalIds.some((id, i) => id !== nextIds[i]);

    if (!changed) return;

    try {
      setIsSavingOrder(true);
      await reorderTestimonials({ orderedIds: nextIds });
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (testimonials === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        onConfirm={confirmDelete}
      />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.12em] text-[#68582E]/70 mb-3">
            <Link href="/admin/shared" className="hover:text-primary">
              Shared Content
            </Link>
            <span>/</span>
            <span>Testimonials</span>
          </div>

          <h1 className="text-3xl lg:text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            Testimonials
          </h1>

          <p className="text-[#3B5249]/65 mt-2">
            Manage student reviews. These appear on the Home and Hungarian
            coaching pages.
          </p>
        </div>

        <button
          type="button"
          className="px-6 py-2 bg-[#3B5249] text-[#FAF6F0] rounded-full hover:bg-[#7B6E9E] transition-colors"
          onClick={handleCreate}
        >
          Add Testimonial
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
        {list.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">
              No testimonials yet. Add your first testimonial to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4B483]/15">
            {list.map((testimonial, index) => (
              <div
                key={testimonial._id}
                onDragOver={(e) => handleDragOver(e, index)}
                className="p-6 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
              >
                <div
                  className="text-gray-400 cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={() => void handleDragEnd()}
                >
                  <GripVertical size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-[#3B5249]">
                      {testimonial.authorName}
                    </span>
                  </div>

                  <div
                    className="text-[#3B5249]/65 text-sm mt-1 line-clamp-2 [&_a]:text-[#7B6E9E] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: testimonial.text }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(testimonial)}
                    className="p-2 text-[#3B5249]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>

                  <button
                    onClick={() => handleEdit(testimonial)}
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(testimonial._id)}
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

      {(editingTestimonial || isCreating) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
              </h2>

              <button
                onClick={resetForm}
                className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg transition-colors"
                type="button"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
              <div>
                <GeneralInput
                  label="Student Name"
                  placeholder="e.g., Alisa"
                  value={formData.authorName}
                  onChange={(e) => updateField("authorName", e.target.value)}
                />
                {errors.authorName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.authorName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3B5249]/85 mb-2">
                  Testimonial Text
                </label>

                <div className={errors.text ? "rounded-lg ring-1 ring-red-400" : ""}>
                  <RichTextEditor
                    editorKey={editingTestimonial?._id || "new-testimonial"}
                    value={formData.text}
                    onChange={(value) => updateField("text", value)}
                    placeholder="What did the student say about your lessons?"
                    tools={["bold", "italic", "link"]}
                  />
                </div>

                {errors.text && (
                  <p className="mt-1 text-xs text-red-500">{errors.text}</p>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-[#D4B483]/20">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-[#3B5249]/70 hover:text-[#3B5249] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3B5249] text-[#FAF6F0] rounded-full hover:bg-[#7B6E9E] transition-colors"
                >
                  {editingTestimonial ? "Save Changes" : "Add Testimonial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}