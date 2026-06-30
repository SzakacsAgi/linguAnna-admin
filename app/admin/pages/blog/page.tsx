"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import { FileText, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import SvgIconUploader from "@/components/admin/inputs/SvgIconUploader";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import SharedContentNavigator from "@/components/admin/SharedContentNavigator";
import CTA from "@/components/admin/CTA";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type SectionContent = {
  heading?: string;
  eyebrow?: string;
  subheading?: string;
  paragraphs?: string[];
  body?: string;
  buttonText?: string;
  buttonLink?: string;
  getInTouchButtonText?: string;
  getInTouchButtonLink?: string;
  servicesButtonText?: string;
  servicesButtonLink?: string;
  blogCardReadMoreButtonText?: string;
  allPostsText?: string;
  placeholder?: string;
  footnote?: string;
  invalidEmailMessage?: string;
  submitErrorMessage?: string;
  successMessage?: string;
  subscribingButtonText?: string;
};

type BlogCategory = {
  _id: Id<"blogCategories">;
  title: string;
  icon?: string;
  isDefault?: boolean;
  order: number;
};

const sections = [
  { key: "hero", label: "Header" },
  { key: "featured", label: "Featured" },
  { key: "recent", label: "Recent Musings" },
  { key: "newsletter", label: "Newsletter" },
  { key: "categories", label: "Categories" },
  { key: "no_posts", label: "No Posts" },
];

type SectionKey =
  | "hero"
  | "featured"
  | "recent"
  | "newsletter"
  | "categories"
  | "no_posts";

export default function BlogPageEditor() {
  const searchParams = useSearchParams();
  const { language } = useAdminLanguage();

  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "blog",
    lang: language ?? undefined,
  });
  const upsertContent = useMutation(api.admin.upsertPageContent);

  const showSaveError = useAdminSaveErrorPopup();

  const categories = useQuery(api.admin.getBlogCategoriesAdmin, {
    lang: language ?? undefined,
  });
  const createCategory = useMutation(api.admin.createBlogCategory);
  const updateCategory = useMutation(api.admin.updateBlogCategory);
  const deleteCategory = useMutation(api.admin.deleteBlogCategory);
  const reorderCategories = useMutation(api.admin.reorderBlogCategories);
  const ensureDefaultBlogCategory = useMutation(
    api.admin.ensureDefaultBlogCategory,
  );

  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [formData, setFormData] = useState<Record<string, SectionContent>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [errors, setErrors] = useState<
    Record<string, Partial<Record<keyof SectionContent, any>>>
  >({});
  const [categoryErrors, setCategoryErrors] = useState<{
    title?: string;
    icon?: string;
  }>({});

  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(
    null,
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    title: "",
    icon: "",
  });
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<
    number | null
  >(null);
  const [orderedCategories, setOrderedCategories] = useState<
    BlogCategory[] | null
  >(null);
  const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);

  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] =
    useState<Id<"blogCategories"> | null>(null);
  const [pendingDeleteCategoryTitle, setPendingDeleteCategoryTitle] =
    useState<string>("");

  const pendingFocusSectionKeyRef = useRef<SectionKey | null>(null);

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (!requestedSection) return;
    if (sections.some((s) => s.key === requestedSection)) {
      setActiveSection(requestedSection as SectionKey);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pageContent) return;
    const map: Record<string, SectionContent> = {};
    for (const section of pageContent) {
      map[section.sectionKey] = section.content;
    }

    // No defaults: if a section doesn't exist in the DB yet, keep it empty.
    map.no_posts = map.no_posts ?? {};
    map.featured = map.featured ?? {};
    map.recent = map.recent ?? {};
    map.newsletter = map.newsletter ?? {};

    setFormData(map);
  }, [pageContent]);

  useEffect(() => {
    if (categories !== undefined) {
      setOrderedCategories(categories as BlogCategory[]);
    }
  }, [categories]);

  const didEnsureDefaultCategoryLangRef = useRef<string | null>(null);
  useEffect(() => {
    const langKey = (language ?? "en").toLowerCase();
    if (didEnsureDefaultCategoryLangRef.current === langKey) return;
    if (categories === undefined) return;
    const list = categories as BlogCategory[];
    if (list.some((c) => c.isDefault)) return;

    didEnsureDefaultCategoryLangRef.current = langKey;
    void ensureDefaultBlogCategory({
      lang: language ?? undefined,
    });
  }, [categories, ensureDefaultBlogCategory, language]);

  const updateSection = (
    sectionKey: string,
    field: keyof SectionContent,
    value: any,
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

  const updateParagraph = (sectionKey: string, value: string) => {
    updateSection(sectionKey, "paragraphs", [value]);
  };

  const computeValidationErrors = () => {
    const hero = formData.hero ?? {};
    const featured = formData.featured ?? {};
    const recent = formData.recent ?? {};
    const newsletter = formData.newsletter ?? {};
    const noPosts = formData.no_posts ?? {};

    const next: Record<string, Partial<Record<keyof SectionContent, any>>> = {
      hero: {
        heading: requiredError(hero.heading),
        paragraphs: [requiredError((hero.paragraphs || [""])[0], true)],
      },
      featured: {
        eyebrow: requiredError(featured.eyebrow),
        buttonText: requiredError(featured.buttonText),
      },
      recent: {
        heading: requiredError(recent.heading),
      },
      newsletter: {
        heading: requiredError(newsletter.heading),
        body: requiredError(newsletter.body),
        placeholder: requiredError(newsletter.placeholder),
        buttonText: requiredError(newsletter.buttonText),
      },
      no_posts: {
        heading: requiredError(noPosts.heading),
        body: requiredError(
          noPosts.body || (noPosts.paragraphs || [""])[0],
          true,
        ),
        getInTouchButtonText: requiredError(noPosts.getInTouchButtonText),
        getInTouchButtonLink: requiredError(noPosts.getInTouchButtonLink),
        servicesButtonText: requiredError(noPosts.servicesButtonText),
        servicesButtonLink: requiredError(noPosts.servicesButtonLink),
      },
    };

    // Clean undefined
    for (const sectionKey of Object.keys(next)) {
      for (const key of Object.keys(next[sectionKey]) as Array<
        keyof SectionContent
      >) {
        if (key === "paragraphs") {
          const arr =
            (next[sectionKey].paragraphs as Array<string | undefined>) ?? [];
          if (!arr.some(Boolean)) delete next[sectionKey].paragraphs;
          continue;
        }
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

  const handleSave = async () => {
    const nextErrors = computeValidationErrors();
    const errorKeys = Object.keys(nextErrors) as SectionKey[];
    if (errorKeys.length > 0) {
      const activeIndex = sections.findIndex((s) => s.key === activeSection);

      let nextInvalidKey: SectionKey = activeSection;
      if (errorKeys.includes(activeSection)) {
        nextInvalidKey = activeSection;
      } else {
        for (let offset = 1; offset <= sections.length; offset++) {
          const idx = (activeIndex + offset) % sections.length;
          const candidate = sections[idx]?.key as SectionKey | undefined;
          if (candidate && errorKeys.includes(candidate)) {
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
      for (const sectionKey of [
        "hero",
        "featured",
        "recent",
        "newsletter",
        "no_posts",
      ]) {
        const content = formData[sectionKey] ?? {};
        await upsertContent({
          pageSlug: "blog",
          sectionKey,
          lang: language ?? undefined,
          content,
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't save Blog page",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ title: "", icon: "" });
    setCategoryErrors({});
    setEditingCategory(null);
    setIsCreatingCategory(false);
  };

  const updateCategoryField = (
    field: keyof typeof categoryFormData,
    value: string,
  ) => {
    setCategoryFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCategoryErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleCreateCategory = () => {
    setIsCreatingCategory(true);
    setEditingCategory(null);
    setCategoryFormData({ title: "", icon: "" });
    setCategoryErrors({});
  };

  const handleEditCategory = (category: BlogCategory) => {
    setEditingCategory(category);
    setIsCreatingCategory(false);
    setCategoryFormData({
      title: category.title,
      icon: category.icon || "",
    });
    setCategoryErrors({});
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextCategoryErrors = {
      title: requiredError(categoryFormData.title),
      // SVG markup often has no inner text, so treat it as a plain required string.
      icon: requiredError(categoryFormData.icon),
    };
    for (const k of Object.keys(nextCategoryErrors) as Array<
      keyof typeof nextCategoryErrors
    >) {
      if (!nextCategoryErrors[k]) delete nextCategoryErrors[k];
    }
    setCategoryErrors(nextCategoryErrors);
    if (Object.keys(nextCategoryErrors).length > 0) return;

    if (editingCategory) {
      await updateCategory({
        id: editingCategory._id,
        title: categoryFormData.title,
        icon: categoryFormData.icon || undefined,
      });
    } else {
      await createCategory({
        lang: language ?? undefined,
        title: categoryFormData.title,
        icon: categoryFormData.icon || undefined,
      });
    }

    resetCategoryForm();
  };

  const handleDeleteCategory = async (id: Id<"blogCategories">) => {
    setPendingDeleteCategoryId(id);

    const category = (categoryList ?? []).find((c) => c._id === id);
    setPendingDeleteCategoryTitle(category?.title ?? "this category");

    setDeleteCategoryModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategoryId) return;
    try {
      await deleteCategory({ id: pendingDeleteCategoryId });
      setPendingDeleteCategoryId(null);
      setPendingDeleteCategoryTitle("");
      setDeleteCategoryModalOpen(false);
    } catch (error) {
      await showSaveError(error, {
        title: "Couldn't delete category",
      });
    }
  };

  const categoryList =
    orderedCategories ?? ((categories ?? []) as BlogCategory[]);

  const defaultCategory = categoryList.find((c) => c.isDefault);
  const nonDefaultCategoryList = categoryList.filter((c) => !c.isDefault);

  const defaultCategoryTitle = defaultCategory?.title ?? "Not categorized";

  const handleCategoryDragStart = (index: number) => {
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === index) return;

    const nextNonDefault = [...nonDefaultCategoryList];
    const draggedItem = nextNonDefault[draggedCategoryIndex];
    if (!draggedItem) return;
    nextNonDefault.splice(draggedCategoryIndex, 1);
    nextNonDefault.splice(index, 0, draggedItem);

    setOrderedCategories(
      defaultCategory ? [defaultCategory, ...nextNonDefault] : nextNonDefault,
    );
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragEnd = async () => {
    setDraggedCategoryIndex(null);

    const current = orderedCategories;
    if (!current || isSavingCategoryOrder) return;

    const originalIds = ((categories ?? []) as BlogCategory[])
      .filter((c) => !c.isDefault)
      .map((c) => c._id);
    const nextIds = current.filter((c) => !c.isDefault).map((c) => c._id);
    const changed =
      originalIds.length !== nextIds.length ||
      originalIds.some((id, i) => id !== nextIds[i]);
    if (!changed) return;

    try {
      setIsSavingCategoryOrder(true);
      await reorderCategories({ orderedIds: nextIds });
    } finally {
      setIsSavingCategoryOrder(false);
    }
  };

  if (pageContent === undefined) {
    return <AdminPageLoader />;
  }

  const hero = formData.hero || {};
  const featured = formData.featured || {};
  const recent = formData.recent || {};
  const newsletter = formData.newsletter || {};
  const noPosts = formData.no_posts || {};

  return (
    <AdminPageLayout
      pageTitle="Blog"
      breadcrumbLabel="Blog"
      backHref="/admin/pages"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as SectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      <AdminConfirmModal
        open={deleteCategoryModalOpen}
        onOpenChange={(open) => {
          setDeleteCategoryModalOpen(open);
          if (!open) {
            setPendingDeleteCategoryId(null);
            setPendingDeleteCategoryTitle("");
          }
        }}
        title="Delete category?"
        description={
          <div className="space-y-2">
            <div>
              Are you sure you want to delete{" "}
              <b>{pendingDeleteCategoryTitle}</b>?
            </div>
            <div className="text-sm text-muted-foreground">
              Blog posts currently in this category will be moved to{" "}
              <b>{defaultCategoryTitle}</b>.
            </div>
          </div>
        }
        variant="destructive"
        confirmText="Delete"
        confirmTextPending="Deleting…"
        closeOnConfirm={false}
        onConfirm={confirmDeleteCategory}
      />

      <div className="space-y-6">
        {activeSection === "hero" && (
          <div className="space-y-6" data-admin-section-key="hero">
            <GeneralInput
              label="Title"
              placeholder="Blog title..."
              value={hero.heading || ""}
              onChange={(e) => updateSection("hero", "heading", e.target.value)}
              error={(errors.hero as any)?.heading}
            />

            <RichTextEditor
              label="Description"
              editorKey="blog-description"
              value={(hero.paragraphs || [""])[0] || ""}
              onChange={(value) => updateParagraph("hero", value)}
              tools={["bold", "italic", "link"]}
              placeholder="Description..."
              error={((errors.hero as any)?.paragraphs ?? [])[0]}
            />

            <SharedContentNavigator
              href="/admin/blog"
              navLabel="Admin → Blog"
              textBeforNav="Edit your articles in"
            />
          </div>
        )}

        {activeSection === "categories" && (
          <div className="space-y-6" data-admin-section-key="categories">
            <div className="flex items-center justify-between">
              <button
                onClick={handleCreateCategory}
                className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2.5 rounded-full hover:bg-[#7B6E9E] transition-colors"
              >
                <Plus size={18} />
                New Category
              </button>
            </div>

            {categories !== undefined && defaultCategory && (
              <div className="border border-[#D4B483]/20 rounded-xl bg-white p-5 flex items-start gap-4">
                <div className="bg-[#7B6E9E]/10 border border-[#7B6E9E]/15 p-2 rounded-lg flex-shrink-0">
                  {defaultCategory.icon ? (
                    <div
                      className="w-5 h-5 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: defaultCategory.icon }}
                    />
                  ) : (
                    <FileText className="text-[#7B6E9E]" size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#3B5249] truncate">
                    {defaultCategory.title}
                  </div>
                  <div className="text-xs text-[#3B5249]/55 mt-1">
                    Default category (can be edited, cannot be deleted).
                  </div>
                  <div className="text-xs text-[#3B5249]/55 mt-1">
                    It will be the category used if a post has an already
                    deleted category.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditCategory(defaultCategory)}
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>
            )}

            <div className="bg-[#FAF6F0]/50 border border-[#D4B483]/20 rounded-xl overflow-hidden">
              {categories === undefined ? (
                <div className="p-6 text-sm text-[#3B5249]/55">Loading...</div>
              ) : nonDefaultCategoryList.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
                  <p className="text-[#3B5249]/60">No other categories yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D4B483]/15">
                  {nonDefaultCategoryList.map((category, index) => (
                    <div
                      key={category._id}
                      onDragOver={(e) => handleCategoryDragOver(e, index)}
                      className="p-5 flex items-start gap-4 bg-white hover:bg-[#FAF6F0]/70 transition-colors"
                    >
                      <div
                        className="text-[#3B5249]/35 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                        draggable
                        onDragStart={() => handleCategoryDragStart(index)}
                        onDragEnd={() => void handleCategoryDragEnd()}
                      >
                        <GripVertical size={20} />
                      </div>

                      <div className="bg-[#7B6E9E]/10 border border-[#7B6E9E]/15 p-2 rounded-lg flex-shrink-0">
                        {category.icon ? (
                          <div
                            className="w-5 h-5 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: category.icon }}
                          />
                        ) : (
                          <FileText className="text-[#7B6E9E]" size={20} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#3B5249] truncate">
                          {category.title}
                        </div>
                        <div className="text-xs text-[#3B5249]/55 mt-1">
                          This category will appear on the public Blog page.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        {!category.isDefault && (
                          <button
                            onClick={() => handleDeleteCategory(category._id)}
                            disabled={!!category.isDefault}
                            className={`p-2 rounded-lg transition-colors`}
                            title={"Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "featured" && (
          <div className="space-y-6" data-admin-section-key="featured">
            <GeneralInput
              label="Eyebrow label"
              placeholder='e.g. "Featured Article"'
              value={featured.eyebrow || ""}
              onChange={(e) =>
                updateSection("featured", "eyebrow", e.target.value)
              }
              error={(errors.featured as any)?.eyebrow}
            />
            <GeneralInput
              label="Read more button text"
              placeholder='e.g. "Read More"'
              value={featured.buttonText || ""}
              onChange={(e) =>
                updateSection("featured", "buttonText", e.target.value)
              }
              error={(errors.featured as any)?.buttonText}
            />
            <SharedContentNavigator
              href="/admin/blog"
              navLabel="Admin → Blog"
              textBeforNav="Pick which post is featured (star toggle) in"
            />
          </div>
        )}

        {activeSection === "recent" && (
          <div className="space-y-6" data-admin-section-key="recent">
            <GeneralInput
              label="Section heading"
              placeholder='e.g. "Recent Musings"'
              value={recent.heading || ""}
              onChange={(e) =>
                updateSection("recent", "heading", e.target.value)
              }
              error={(errors.recent as any)?.heading}
            />
          </div>
        )}

        {activeSection === "newsletter" && (
          <div className="space-y-6" data-admin-section-key="newsletter">
            <GeneralInput
              label="Title"
              placeholder='e.g. "Join the LinguAnna Circle"'
              value={newsletter.heading || ""}
              onChange={(e) =>
                updateSection("newsletter", "heading", e.target.value)
              }
              error={(errors.newsletter as any)?.heading}
            />
            <GeneralInput
              label="Description"
              placeholder="Short text shown under the title"
              value={newsletter.body || ""}
              onChange={(e) =>
                updateSection("newsletter", "body", e.target.value)
              }
              error={(errors.newsletter as any)?.body}
            />
            <GeneralInput
              label="Email input placeholder"
              placeholder='e.g. "Your email address"'
              value={newsletter.placeholder || ""}
              onChange={(e) =>
                updateSection("newsletter", "placeholder", e.target.value)
              }
              error={(errors.newsletter as any)?.placeholder}
            />
            <GeneralInput
              label="Subscribe button text"
              placeholder='e.g. "Subscribe"'
              value={newsletter.buttonText || ""}
              onChange={(e) =>
                updateSection("newsletter", "buttonText", e.target.value)
              }
              error={(errors.newsletter as any)?.buttonText}
            />
            <GeneralInput
              label="Footnote"
              placeholder='e.g. "No spam, only deep insights twice a month."'
              value={newsletter.footnote || ""}
              onChange={(e) =>
                updateSection("newsletter", "footnote", e.target.value)
              }
              error={(errors.newsletter as any)?.footnote}
            />
            <GeneralInput
              label="Subscribing button text (loading)"
              placeholder='e.g. "Subscribing..."'
              value={newsletter.subscribingButtonText || ""}
              onChange={(e) =>
                updateSection(
                  "newsletter",
                  "subscribingButtonText",
                  e.target.value,
                )
              }
              error={(errors.newsletter as any)?.subscribingButtonText}
            />
            <GeneralInput
              label="Success message"
              placeholder='e.g. "Thanks for subscribing!"'
              value={newsletter.successMessage || ""}
              onChange={(e) =>
                updateSection("newsletter", "successMessage", e.target.value)
              }
              error={(errors.newsletter as any)?.successMessage}
            />
            <GeneralInput
              label="Invalid email message"
              placeholder='e.g. "Invalid email address."'
              value={newsletter.invalidEmailMessage || ""}
              onChange={(e) =>
                updateSection(
                  "newsletter",
                  "invalidEmailMessage",
                  e.target.value,
                )
              }
              error={(errors.newsletter as any)?.invalidEmailMessage}
            />
            <GeneralInput
              label="Submit error message"
              placeholder='e.g. "Something went wrong. Please try again later."'
              value={newsletter.submitErrorMessage || ""}
              onChange={(e) =>
                updateSection(
                  "newsletter",
                  "submitErrorMessage",
                  e.target.value,
                )
              }
              error={(errors.newsletter as any)?.submitErrorMessage}
            />
          </div>
        )}

        {activeSection === "no_posts" && (
          <div data-admin-section-key="no_posts">
            <CTA
              title={noPosts.heading || ""}
              onTitleChange={(value) =>
                updateSection("no_posts", "heading", value)
              }
              titleError={(errors.no_posts as any)?.heading}
              description={
                noPosts.body || (noPosts.paragraphs || [""])[0] || ""
              }
              onDescriptionChange={(value) =>
                updateSection("no_posts", "body", value)
              }
              editorKey="blog-no-posts-description"
              descriptionError={(errors.no_posts as any)?.body}
              titleLabel="No Posts title"
              titlePlaceholder="e.g. No blog posts yet"
              descriptionLabel="No Posts description"
              descriptionPlaceholder="Short message shown when there are no posts"
              buttons={[
                {
                  text: noPosts.getInTouchButtonText,
                  link: noPosts.getInTouchButtonLink,
                  onTextChange: (value) =>
                    updateSection("no_posts", "getInTouchButtonText", value),
                  onLinkChange: (value) =>
                    updateSection("no_posts", "getInTouchButtonLink", value),
                  textLabel: "Primary button text",
                  linkLabel: "Primary button link",
                  textPlaceholder: "e.g. Get in touch",
                  linkPlaceholder: "/#contact",
                  textError: (errors.no_posts as any)?.getInTouchButtonText,
                  linkError: (errors.no_posts as any)?.getInTouchButtonLink,
                },
                {
                  text: noPosts.servicesButtonText,
                  link: noPosts.servicesButtonLink,
                  onTextChange: (value) =>
                    updateSection("no_posts", "servicesButtonText", value),
                  onLinkChange: (value) =>
                    updateSection("no_posts", "servicesButtonLink", value),
                  textLabel: "Secondary button text",
                  linkLabel: "Secondary button link",
                  textPlaceholder: "e.g. View services",
                  linkPlaceholder: "/services",
                  textError: (errors.no_posts as any)?.servicesButtonText,
                  linkError: (errors.no_posts as any)?.servicesButtonLink,
                },
              ]}
            />
          </div>
        )}
      </div>

      {(editingCategory || isCreatingCategory) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="border-b border-[#D4B483]/20 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={resetCategoryForm}
                className="p-2 text-[#3B5249]/40 hover:text-[#3B5249] rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="p-6 space-y-6">
              <GeneralInput
                label="Name"
                placeholder="e.g., Learning Tips"
                value={categoryFormData.title}
                onChange={(e) => updateCategoryField("title", e.target.value)}
                error={categoryErrors.title}
              />

              <SvgIconUploader
                label="Icon (SVG)"
                value={categoryFormData.icon}
                onChange={(svg) => updateCategoryField("icon", svg)}
                helpText="Upload an SVG icon for this category."
                error={categoryErrors.icon}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-[#D4B483]/20">
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-6 py-2 text-[#3B5249]/70 hover:text-[#3B5249] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3B5249] text-[#FAF6F0] rounded-full hover:bg-[#7B6E9E] transition-colors"
                >
                  {editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
