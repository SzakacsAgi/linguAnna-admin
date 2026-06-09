"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Eye, FileText, Save } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";
import { UnsavedChangesCornerHint } from "@/components/admin/UnsavedChangesCornerHint";

import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";

type BlogCategoryOption = {
  title: string;
  icon?: string;
};

export type BlogPostEditorValues = {
  title: string;
  excerpt: string; // HTML
  category: string;
  image: string; // URL
  imageBlurDataUrl?: string;
  featuredImageStorageId?: Id<"_storage">;
  featuredImageAlt: string;
  date: string;
  readTime: string;
  content: string; // HTML
  published: boolean;
};

type BlogPostEditorPageProps = {
  mode: "create" | "edit";
  initialValues: BlogPostEditorValues;
  headerTitle: string;
  crumbLabel: string;
  onSubmit: (args: {
    values: BlogPostEditorValues;
    slug: string;
    publish: boolean;
  }) => Promise<void>;
};

const DEFAULT_CATEGORY_TITLE = "Not categorized";

const slugFromTitle = (title: string) => {
  const normalized = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  return normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
};

function valuesEqual(a: BlogPostEditorValues, b: BlogPostEditorValues) {
  return (
    a.title === b.title &&
    a.excerpt === b.excerpt &&
    a.category === b.category &&
    a.image === b.image &&
    (a.imageBlurDataUrl ?? null) === (b.imageBlurDataUrl ?? null) &&
    (a.featuredImageStorageId ?? null) === (b.featuredImageStorageId ?? null) &&
    a.featuredImageAlt === b.featuredImageAlt &&
    a.date === b.date &&
    a.readTime === b.readTime &&
    a.content === b.content &&
    a.published === b.published
  );
}

export default function BlogPostEditorPage({
  mode,
  initialValues,
  headerTitle,
  crumbLabel,
  onSubmit,
}: BlogPostEditorPageProps) {
  const showSaveError = useAdminSaveErrorPopup();
  const { language } = useAdminLanguage();
  const { setDirty, registerSaveHandler } = useUnsavedChanges();

  const categories = useQuery(api.admin.getBlogCategoriesAdmin, {
    lang: language ?? undefined,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    excerpt?: string;
    content?: string;
    category?: string;
    image?: string;
    featuredImageAlt?: string;
    date?: string;
    readTime?: string;
  }>({});

  const [formData, setFormData] = useState<BlogPostEditorValues>(initialValues);

  const baselineRef = useRef<BlogPostEditorValues>(initialValues);

  useEffect(() => {
    setFormData(initialValues);
    baselineRef.current = initialValues;
    setErrors({});
  }, [initialValues]);

  const categoryOptions = useMemo(() => {
    if (categories === undefined) return [] as BlogCategoryOption[];
    return ((categories ?? []) as any[]).map((c) => ({
      title: c.title as string,
      icon: c.icon as string | undefined,
    }));
  }, [categories]);

  const dropdownCategories =
    categoryOptions.length > 0
      ? categoryOptions
      : ([{ title: DEFAULT_CATEGORY_TITLE }] as BlogCategoryOption[]);

  const derivedSlug = useMemo(
    () => slugFromTitle(formData.title),
    [formData.title],
  );

  const featuredImageUrl = useQuery(
    api.media.getFileUrl,
    formData.featuredImageStorageId
      ? { storageId: formData.featuredImageStorageId }
      : "skip",
  );

  useEffect(() => {
    if (formData.category) return;
    if (categories === undefined) return;
    if (categoryOptions.length > 0) {
      const nextCategory = categoryOptions[0].title;
      setFormData((prev) => ({ ...prev, category: nextCategory }));
      // Treat the initial auto-selected category as baseline to avoid instant "unsaved" state.
      if (!baselineRef.current.category) {
        baselineRef.current = {
          ...baselineRef.current,
          category: nextCategory,
        };
      }
    } else {
      setFormData((prev) => ({ ...prev, category: DEFAULT_CATEGORY_TITLE }));
      if (!baselineRef.current.category) {
        baselineRef.current = {
          ...baselineRef.current,
          category: DEFAULT_CATEGORY_TITLE,
        };
      }
    }
  }, [categories, categoryOptions, formData.category]);

  useEffect(() => {
    if (!featuredImageUrl) return;
    if (formData.image === featuredImageUrl) return;
    setFormData((prev) => ({ ...prev, image: featuredImageUrl }));
  }, [featuredImageUrl, formData.image]);

  const handleSave = useCallback(
    async (publish: boolean) => {
      const nextErrors = {
        title: requiredError(formData.title),
        excerpt: requiredError(formData.excerpt, true),
        content: requiredError(formData.content, true),
        category: requiredError(formData.category),
        image: requiredError(formData.image),
        featuredImageAlt: formData.image
          ? requiredError(formData.featuredImageAlt)
          : undefined,
        date: requiredError(formData.date),
        readTime: requiredError(formData.readTime),
      };

      for (const key of Object.keys(nextErrors) as Array<
        keyof typeof nextErrors
      >) {
        if (!nextErrors[key]) delete nextErrors[key];
      }

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      setSaving(true);
      try {
        const slug = derivedSlug;
        if (!slug) {
          setErrors((prev) => ({
            ...prev,
            title: prev.title ?? "Please enter a title",
          }));
          return;
        }

        await onSubmit({ values: formData, slug, publish });
      } catch (error) {
        await showSaveError(error, {
          title:
            mode === "create"
              ? "Couldn't create blog post"
              : "Couldn't update blog post",
        });
      } finally {
        setSaving(false);
      }
    },
    [derivedSlug, formData, mode, onSubmit, showSaveError],
  );

  const handleFormSubmit = async (
    e: React.SyntheticEvent,
    publish: boolean = false,
  ) => {
    e.preventDefault();
    await handleSave(publish);
  };

  const hasChanges = useMemo(() => {
    return !valuesEqual(formData, baselineRef.current);
  }, [formData]);

  useEffect(() => {
    setDirty(hasChanges);
    registerSaveHandler(() => handleSave(false), saving);
    return () => {
      setDirty(false);
      registerSaveHandler(null, false);
    };
  }, [handleSave, hasChanges, registerSaveHandler, saving, setDirty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSaveCombo =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      if (e.altKey) return;

      e.preventDefault();
      if (saving) return;
      void handleSave(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, saving]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.12em] text-[#68582E]/70 mb-3">
            <Link
              href="/admin/blog"
              className="hover:text-[#7B6E9E] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={16} />
              Blog Posts
            </Link>
            <span>/</span>
            <span>{crumbLabel}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            {headerTitle}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 border border-[#D4B483]/35 text-[#3B5249]/80 px-4 py-2.5 rounded-full hover:bg-[#FAF6F0] transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            Save Draft
          </button>
          <button
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors disabled:opacity-50"
          >
            <Eye size={18} />
            Publish
          </button>
        </div>
      </div>

      <form
        className="grid lg:grid-cols-3 gap-6"
        onSubmit={(e) => void handleFormSubmit(e, false)}
      >
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <GeneralInput
                label="Title"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Enter post title..."
                inputClassName="text-xl py-3"
                error={errors.title}
              />
              <div className="text-xs text-[#3B5249]/55">
                URL:{" "}
                <span className="font-mono">/blog/{derivedSlug || "..."}</span>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#3B5249]/85">
                  Excerpt
                </label>
                <RichTextEditor
                  editorKey={`${mode}-blog-post-excerpt`}
                  value={formData.excerpt}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, excerpt: value }));
                    setErrors((prev) => ({ ...prev, excerpt: undefined }));
                  }}
                  error={errors.excerpt}
                  placeholder="Brief summary of the post..."
                  tools={["heading", "bold", "italic", "link", "emoji"]}
                  editorClassName="min-h-[120px]"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#3B5249]/85">
                  Content
                </label>
                <RichTextEditor
                  editorKey={`${mode}-blog-post-content`}
                  value={formData.content}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, content: value }));
                    setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  placeholder="Write your post content here..."
                  tools={["heading", "lists", "bold", "italic", "link", "emoji"]}
                  editorClassName="min-h-[360px]"
                  error={errors.content}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category */}
            <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6">
              <label className="block text-sm font-medium text-[#3B5249]/85 mb-2">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, category: value }));
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownCategories.map((cat) => (
                    <SelectItem key={cat.title} value={cat.title}>
                      <span className="flex items-center gap-2">
                        {cat.icon ? (
                          <span
                            className="w-4 h-4 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full"
                            aria-hidden
                            dangerouslySetInnerHTML={{ __html: cat.icon }}
                          />
                        ) : (
                          <FileText size={16} className="text-[#7B6E9E]" />
                        )}
                        <span>{cat.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.category ? (
                <p className="text-xs text-red-600 mt-2">{errors.category}</p>
              ) : null}

              {categories !== undefined && categoryOptions.length === 0 && (
                <p className="text-xs text-[#3B5249]/55 mt-2">
                  No categories created yet. You can manage them in{" "}
                  <Link
                    href="/admin/pages/blog?section=categories"
                    className="text-[#7B6E9E] underline"
                  >
                    Pages → Blog → Categories
                  </Link>
                  .
                </p>
              )}
            </div>

            {/* Featured Image */}
            <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 space-y-4">
              {formData.image && !formData.featuredImageStorageId ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#3B5249]/85">
                    Featured Image
                  </p>
                  <div className="rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.image}
                      alt={formData.featuredImageAlt || "Featured image"}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                </div>
              ) : null}

              {formData.image && !formData.featuredImageStorageId ? (
                <GeneralInput
                  label="Image alt text"
                  value={formData.featuredImageAlt}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      featuredImageAlt: e.target.value,
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      featuredImageAlt: undefined,
                    }));
                  }}
                  placeholder="Describe the image…"
                  error={errors.featuredImageAlt}
                />
              ) : null}

              <ImageUploader
                label={
                  formData.image && !formData.featuredImageStorageId
                    ? "Replace image"
                    : "Featured Image"
                }
                storageId={formData.featuredImageStorageId}
                alt={formData.featuredImageAlt}
                onImageChange={(id) => {
                  setFormData((prev) => ({
                    ...prev,
                    featuredImageStorageId: id,
                  }));
                  setErrors((prev) => ({ ...prev, image: undefined }));
                  if (!id) {
                    // If we remove uploaded image, also clear the URL.
                    setFormData((prev) => ({ ...prev, image: "" }));
                  }
                }}
                onBlurDataUrlChange={(blur) => {
                  setFormData((prev) => ({
                    ...prev,
                    imageBlurDataUrl: blur,
                  }));
                }}
                onAltChange={(alt) =>
                  setFormData((prev) => ({ ...prev, featuredImageAlt: alt }))
                }
                previewSize={220}
                error={errors.image}
                altError={errors.featuredImageAlt}
              />
            </div>

            {/* Meta */}
            <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 space-y-4">
              <GeneralInput
                label="Date"
                value={formData.date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, date: e.target.value }));
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                placeholder="January 1, 2026"
                error={errors.date}
              />
              <GeneralInput
                label="Read Time"
                value={formData.readTime}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, readTime: e.target.value }));
                  setErrors((prev) => ({ ...prev, readTime: undefined }));
                }}
                placeholder="5 min read"
                error={errors.readTime}
              />
              <div className="text-xs text-[#3B5249]/45 ml-2 flex items-center gap-1">
                <p>This text will be displayed after the</p>
                <Clock size={16} />
                <p>icon on blog card and article header</p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <UnsavedChangesCornerHint
        visible={hasChanges}
        onSave={() => void handleSave(false)}
        saving={saving}
        shortcutHint="Ctrl+S / Cmd+S"
      />
    </div>
  );
}
