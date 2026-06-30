"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, Pencil, Trash2, X, GripVertical, Award, Copy } from "lucide-react";
import Link from "next/link";

import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type Service = {
  _id: Id<"services">;
  title: string;
  shortDescription: string;
  longDescription: string;
  forWho: string;
  buttonText: string;
  buttonLink: string;
  shadowLetters: string;
  backgroundColor: string;
  order: number;
};

const COLOR_PRESETS = [
  // Project palette
  { color: "#7B6E9E", label: "Purple" },
  { color: "#3B5249", label: "Dark Green" },
  { color: "#D4B483", label: "Gold" },
  { color: "#B45309", label: "Amber" },
  // Neutrals
  { color: "#000000", label: "Black" },
  { color: "#374151", label: "Dark Gray" },
  { color: "#6B7280", label: "Gray" },
  { color: "#9CA3AF", label: "Light Gray" },
  // Accents
  { color: "#EF4444", label: "Red" },
  { color: "#F97316", label: "Orange" },
  { color: "#3B82F6", label: "Blue" },
  { color: "#22C55E", label: "Green" },
];

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

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
  title: "",
  shortDescription: "",
  longDescription: "",
  forWho: "",
  buttonText: "",
  buttonLink: "",
  shadowLetters: "",
  backgroundColor: "#3B5249",
};

type FormErrors = Partial<Record<keyof typeof DEFAULT_FORM, string>>;

const FIELD_ERROR = "Please fill out this field";

export default function ServicesAdminPage() {
  const { language } = useAdminLanguage();

  const services = useQuery(api.admin.getServicesAdmin, {
    lang: language ?? undefined,
  });
  const createService = useMutation(api.admin.createService);
  const updateService = useMutation(api.admin.updateService);
  const deleteService = useMutation(api.admin.deleteService);

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"services"> | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Validates all fields and returns the errors object
  function validate(data: typeof DEFAULT_FORM): FormErrors {
    const e: FormErrors = {};
    if (!data.title.trim()) e.title = FIELD_ERROR;
    if (!stripHtmlToText(data.shortDescription)) e.shortDescription = FIELD_ERROR;
    if (!stripHtmlToText(data.longDescription)) e.longDescription = FIELD_ERROR;
    if (!data.forWho.trim()) e.forWho = FIELD_ERROR;
    if (!data.buttonText.trim()) e.buttonText = FIELD_ERROR;
    if (!data.buttonLink.trim()) e.buttonLink = FIELD_ERROR;
    if (!data.shadowLetters.trim()) e.shadowLetters = FIELD_ERROR;
    // backgroundColor always has a value (preset or picker), so no validation needed
    return e;
  }

  // Re-validate only after first submit attempt
  function updateField<K extends keyof typeof DEFAULT_FORM>(key: K, value: string) {
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
    setEditingService(null);
    setIsCreating(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      shortDescription: service.shortDescription,
      longDescription: service.longDescription,
      forWho: service.forWho ?? "",
      buttonText: service.buttonText ?? "",
      buttonLink: service.buttonLink ?? "",
      shadowLetters: service.shadowLetters ?? "",
      backgroundColor: service.backgroundColor ?? "#3B5249",
    });
    setErrors({});
    setSubmitted(false);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingService(null);
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

    const backgroundColor = rgbToHex(formData.backgroundColor);

    const payload = {
      title: formData.title,
      shortDescription: formData.shortDescription,
      longDescription: formData.longDescription,
      forWho: formData.forWho,
      buttonText: formData.buttonText,
      buttonLink: formData.buttonLink,
      shadowLetters: formData.shadowLetters,
      backgroundColor,
    };

    if (editingService) {
      await updateService({ id: editingService._id, ...payload });
    } else {
      await createService({ lang: language ?? undefined, ...payload });
    }

    resetForm();
  };

  const handleDeleteClick = (id: Id<"services">) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    await deleteService({ id: pendingDeleteId });
    setPendingDeleteId(null);
  };

  const handleDuplicate = async (service: Service) => {
    await createService({
      lang: language ?? undefined,
      title: `${service.title} (Copy)`,
      shortDescription: service.shortDescription,
      longDescription: service.longDescription,
      forWho: service.forWho,
      buttonText: service.buttonText,
      buttonLink: service.buttonLink,
      shadowLetters: service.shadowLetters,
      backgroundColor: service.backgroundColor,
    });
  };

  if (services === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B6E9E]"></div>
      </div>
    );
  }

  return (
    <div>
      <AdminConfirmModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete service?"
        description="This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
        confirmTextPending="Deleting…"
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
            <span>Services</span>
          </div>
          <h1 className="text-3xl lg:text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            Services
          </h1>
          <p className="text-[#3B5249]/65 mt-2">
            Manage your service offerings. These appear on the Home and Services pages.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors"
        >
          <Plus size={20} />
          Add Service
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-2xl mt-6 border border-[#D4B483]/20 shadow-sm">
        {services.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
            <p className="text-[#3B5249]/60">
              No services yet. Add your first service to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4B483]/15">
            {services.map((service) => (
              <div
                key={service._id}
                className="p-6 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
              >
                <div className="text-[#3B5249]/35 cursor-move mt-1">
                  <GripVertical size={20} />
                </div>

                {/* Color swatch */}
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: service.backgroundColor ?? "#3B5249" }}
                  title={service.backgroundColor}
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#3B5249]">{service.title}</h3>
                  <div
                    className="text-[#3B5249]/65 text-sm mt-1 line-clamp-2 [&_a]:text-[#7B6E9E] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: service.shortDescription }}
                  />
                  <div className="flex gap-4 mt-2 text-xs text-[#3B5249]/55">
                    {service.buttonText && <span>Button: {service.buttonText}</span>}
                    {service.shadowLetters && <span>Shadow: &ldquo;{service.shadowLetters}&rdquo;</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(service)}
                    className="p-2 text-[#3B5249]/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(service._id)}
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
      {(editingService || isCreating) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
              {/* Title */}
              <div>
                <GeneralInput
                  label="Title"
                  placeholder="e.g., General English Classes"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-[#3B5249]/85 mb-2">
                  Short Description
                  <span className="text-[#3B5249]/45 font-normal ml-2">(for preview cards)</span>
                </label>
                <div className={errors.shortDescription ? "rounded-lg ring-1 ring-red-400" : ""}>
                  <RichTextEditor
                    editorKey={editingService?._id || "new-short"}
                    value={formData.shortDescription}
                    onChange={(value) => updateField("shortDescription", value)}
                    placeholder="Brief description for the service card..."
                    tools={["bold", "italic", "link"]}
                  />
                </div>
                {errors.shortDescription && (
                  <p className="mt-1 text-xs text-red-500">{errors.shortDescription}</p>
                )}
              </div>

              {/* Long Description */}
              <div>
                <label className="block text-sm font-medium text-[#3B5249]/85 mb-2">
                  Long Description
                  <span className="text-[#3B5249]/45 font-normal ml-2">(for detailed view)</span>
                </label>
                <div className={errors.longDescription ? "rounded-lg ring-1 ring-red-400" : ""}>
                  <RichTextEditor
                    editorKey={editingService?._id || "new-long"}
                    value={formData.longDescription}
                    onChange={(value) => updateField("longDescription", value)}
                    placeholder="Detailed description for the service page..."
                    tools={["bold", "link", "italic"]}
                  />
                </div>
                {errors.longDescription && (
                  <p className="mt-1 text-xs text-red-500">{errors.longDescription}</p>
                )}
              </div>

              {/* For Who */}
              <div>
                <GeneralInput
                  label="For Who"
                  placeholder="e.g., Beginners, professionals, students..."
                  value={formData.forWho}
                  onChange={(e) => updateField("forWho", e.target.value)}
                />
                {errors.forWho && (
                  <p className="mt-1 text-xs text-red-500">{errors.forWho}</p>
                )}
              </div>

              {/* Button Text + Href */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <GeneralInput
                    label="Button Text"
                    placeholder="e.g., Learn More"
                    value={formData.buttonText}
                    onChange={(e) => updateField("buttonText", e.target.value)}
                  />
                  {errors.buttonText && (
                    <p className="mt-1 text-xs text-red-500">{errors.buttonText}</p>
                  )}
                </div>
                <div>
                  <GeneralInput
                    label="Button URL"
                    placeholder="e.g., /services/english"
                    value={formData.buttonLink}
                    onChange={(e) => updateField("buttonLink", e.target.value)}
                  />
                  {errors.buttonLink && (
                    <p className="mt-1 text-xs text-red-500">{errors.buttonLink}</p>
                  )}
                </div>
              </div>

              {/* Shadow Letters */}
              <div>
                <GeneralInput
                  label="Shadow Letters"
                  placeholder="e.g., ABC"
                  value={formData.shadowLetters}
                  onChange={(e) => updateField("shadowLetters", e.target.value)}
                />
                {errors.shadowLetters && (
                  <p className="mt-1 text-xs text-red-500">{errors.shadowLetters}</p>
                )}
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-[#3B5249]/85 mb-3">
                  Background Color
                </label>

                {/* Preset swatches */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      title={preset.label}
                      onClick={() => updateField("backgroundColor", preset.color)}
                      className={[
                        "w-8 h-8 rounded-full border-2 transition-all",
                        formData.backgroundColor === preset.color
                          ? "border-[#3B5249] scale-110 shadow-md"
                          : "border-transparent hover:scale-105 hover:border-[#3B5249]/40",
                      ].join(" ")}
                      style={{ backgroundColor: preset.color }}
                      aria-label={preset.label}
                    />
                  ))}
                </div>

                {/* Native color picker + hex display */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => updateField("backgroundColor", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#D4B483]/30 p-0.5 bg-white"
                    title="Custom color"
                  />
                  <div className="flex items-center gap-2 bg-[#FAF6F0] border border-[#D4B483]/25 rounded-lg px-3 py-2">
                    <div
                      className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: formData.backgroundColor }}
                    />
                    <span className="text-sm font-mono text-[#3B5249]">
                      {formData.backgroundColor.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-[#3B5249]/50">
                    {COLOR_PRESETS.find((p) => p.color === formData.backgroundColor)?.label ?? "Custom"}
                  </span>
                </div>
              </div>

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
                  {editingService ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}