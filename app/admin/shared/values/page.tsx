"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Heart,
  Copy,
} from "lucide-react";
import Link from "next/link";

import GeneralInput from "@/components/admin/inputs/GeneralInput";
import SvgIconUploader from "@/components/admin/inputs/SvgIconUploader";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type Value = {
  _id: Id<"values">;
  title: string;
  description: string;
  icon?: string;
  order: number;
};

export default function ValuesAdminPage() {
  const { language } = useAdminLanguage();

  const values = useQuery(api.admin.getValuesAdmin, {
    lang: language ?? undefined,
  });
  const createValue = useMutation(api.admin.createValue);
  const updateValue = useMutation(api.admin.updateValue);
  const deleteValue = useMutation(api.admin.deleteValue);
  const reorderValues = useMutation(api.admin.reorderValues);

  const showSaveError = useAdminSaveErrorPopup();

  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedValues, setOrderedValues] = useState<Value[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"values"> | null>(
    null,
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "",
  });

  const [formErrors, setFormErrors] = useState<{
    title?: string;
    description?: string;
    icon?: string;
  }>({});

  useEffect(() => {
    if (values !== undefined) {
      setOrderedValues(values as Value[]);
    }
  }, [values]);

  const resetForm = () => {
    setFormData({ title: "", description: "", icon: "" });
    setEditingValue(null);
    setIsCreating(false);
    setFormErrors({});
  };

  const handleEdit = (value: Value) => {
    setEditingValue(value);
    setFormData({
      title: value.title,
      description: value.description,
      icon: value.icon || "",
    });
    setIsCreating(false);
    setFormErrors({});
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingValue(null);
    setFormData({ title: "", description: "", icon: "" });
    setFormErrors({});
  };

  const requiredFieldError = (value: unknown, html = false) =>
    requiredError(value, html) ? "Fill out this field." : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof formErrors = {
      icon: requiredFieldError(formData.icon, false),
      title: requiredFieldError(formData.title, false),
      description: requiredFieldError(formData.description, true),
    };

    // If icon is present but not an SVG string, show a specific error.
    if (!nextErrors.icon && !formData.icon.includes("<svg")) {
      nextErrors.icon = "Please upload a valid SVG icon.";
    }

    if (nextErrors.icon || nextErrors.title || nextErrors.description) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      if (editingValue) {
        await updateValue({
          id: editingValue._id,
          title: formData.title,
          description: formData.description,
          icon: formData.icon || undefined,
        });
      } else {
        await createValue({
          lang: language ?? undefined,
          title: formData.title,
          description: formData.description,
          icon: formData.icon || undefined,
        });
      }
      resetForm();
    } catch (error) {
      await showSaveError(error, {
        title: editingValue ? "Couldn't save value" : "Couldn't create value",
      });
    }
  };

  const handleDeleteClick = (id: Id<"values">) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteValue({ id: pendingDeleteId });
      setPendingDeleteId(null);
      setDeleteModalOpen(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't delete value",
      });
    }
  };

  const handleDuplicate = async (value: Value) => {
    try {
      await createValue({
        lang: language ?? undefined,
        title: `${value.title} (Copy)`,
        description: value.description,
        icon: value.icon || undefined,
      });
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't duplicate value",
      });
    }
  };

  // Check if icon is an SVG string
  const isSvgIcon = (icon?: string) => {
    return icon && icon.trim().startsWith("<");
  };

  if (values === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B6E9E]"></div>
      </div>
    );
  }

  const list = orderedValues ?? (values as Value[]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

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
    setOrderedValues(next);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    const current = orderedValues;
    if (!current || isSavingOrder) return;

    const originalIds = (values as Value[]).map((v) => v._id);
    const nextIds = current.map((v) => v._id);
    const changed =
      originalIds.length !== nextIds.length ||
      originalIds.some((id, i) => id !== nextIds[i]);
    if (!changed) return;

    try {
      setIsSavingOrder(true);
      try {
        await reorderValues({ orderedIds: nextIds });
      } catch (error) {
        await showSaveError(error, {
          title: "Couldn't save value order",
        });
      }
    } finally {
      setIsSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminConfirmModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete value?"
        description="This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
        confirmTextPending="Deleting…"
        closeOnConfirm={false}
        onConfirm={confirmDelete}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.12em] text-[#68582E]/70 mb-3">
            <Link href="/admin/shared" className="hover:text-[#7B6E9E] transition-colors">
              Shared Content
            </Link>
            <span>/</span>
            <span>Values</span>
          </div>
          <h1 className="text-3xl lg:text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">Values</h1>
          <p className="text-[#3B5249]/65 mt-2">
            Manage your values as a tutor. These appear on the Home and About
            pages.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors"
        >
          <Plus size={20} />
          Add Value
        </button>
      </div>

      {/* Values List */}
      <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
        {list.length === 0 ? (
          <div className="p-12 text-center">
            <Heart className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
            <p className="text-[#3B5249]/60">
              No values yet. Add your first value to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4B483]/15">
            {list.map((value, index) => (
              <div
                key={value._id}
                onDragOver={(e) => handleDragOver(e, index)}
                className="p-6 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
              >
                <div
                  className="text-[#3B5249]/35 cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={() => void handleDragEnd()}
                >
                  <GripVertical size={20} />
                </div>
                <div className="bg-[#7B6E9E]/10 p-3 rounded-lg border border-[#7B6E9E]/15">
                  {isSvgIcon(value.icon) ? (
                    <div
                      className="w-6 h-6 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full [&_svg]:text-[#7B6E9E]"
                      dangerouslySetInnerHTML={{ __html: value.icon! }}
                    />
                  ) : (
                    <Heart className="text-[#7B6E9E]" size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#3B5249]">{value.title}</h3>
                  <div
                    className="text-[#3B5249]/65 text-sm mt-1 line-clamp-2 [&_a]:text-[#7B6E9E] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: value.description }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(value)}
                    className="p-2 text-[#3B5249]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(value)}
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(value._id)}
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

      {/* Edit/Create Modal */}
      {(editingValue || isCreating) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                {editingValue ? "Edit Value" : "Add New Value"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* SVG Icon Upload */}
              <SvgIconUploader
                label="Icon (SVG)"
                value={formData.icon}
                onChange={(svg) => {
                  setFormData({ ...formData, icon: svg });
                  setFormErrors((prev) => ({ ...prev, icon: undefined }));
                }}
                helpText="Upload an SVG file for the icon (required)."
                error={formErrors.icon}
              />

              {/* Title */}
              <GeneralInput
                label="Title"
                placeholder="e.g., QUALIFICATIONS AND EXPERTISE"
                value={formData.title}
                onChange={(e) => (
                  setFormData({ ...formData, title: e.target.value }),
                  setFormErrors((prev) => ({ ...prev, title: undefined }))
                )}
                error={formErrors.title}
              />

              {/* Description */}
              <RichTextEditor
                label="Description"
                editorKey={editingValue?._id || "new-value"}
                value={formData.description}
                onChange={(value) => {
                  setFormData({ ...formData, description: value });
                  setFormErrors((prev) => ({
                    ...prev,
                    description: undefined,
                  }));
                }}
                placeholder="Describe this value..."
                tools={["heading", "bold", "italic", "link"]}
                error={formErrors.description}
              />

              {/* Actions */}
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
                  {editingValue ? "Save Changes" : "Create Value"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
