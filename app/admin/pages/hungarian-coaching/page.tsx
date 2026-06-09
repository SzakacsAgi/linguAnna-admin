"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import CTA from "@/components/admin/CTA";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";

import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type ImageBlock = {
  id: string;
  heading?: string;
  body?: string;
  imageStorageId?: Id<"_storage">;
  imageAlt?: string;
  imageBlurDataUrl?: string;
};

type PricingBlock = {
  id: string;
  name?: string;
  sessionsLabel?: string;
  price?: string;
  validity?: string;
  buttonText?: string;
  buttonLink?: string;
  badge?: string;
};

type TestimonialBlock = {
  id: string;
  quote?: string;
  author?: string;
};

type FaqBlock = {
  id: string;
  question?: string;
  answer?: string;
};

type SectionData = Record<string, any>;

const sections = [
  { key: "hero", label: "Hero" },
  { key: "paths", label: "Learning Paths" },
  { key: "pricing", label: "Pricing" },
  { key: "inline_cta", label: "Inline CTA" },
  { key: "testimonials", label: "Testimonials" },
  { key: "faq", label: "FAQ" },
  { key: "bottom_cta", label: "Bottom CTA" },
];

const DEFAULT_PATH_BLOCKS: ImageBlock[] = [
  {
    id: "path-1",
    heading: "",
    body: "",
    imageStorageId: undefined,
    imageAlt: "",
  },
  {
    id: "path-2",
    heading: "",
    body: "",
    imageStorageId: undefined,
    imageAlt: "",
  },
];

const DEFAULT_PRICING_BLOCKS: PricingBlock[] = [
  {
    id: "pricing-1",
    name: "",
    sessionsLabel: "",
    price: "",
    validity: "",
    buttonText: "",
    buttonLink: "",
    badge: "",
  },
  {
    id: "pricing-2",
    name: "",
    sessionsLabel: "",
    price: "",
    validity: "",
    buttonText: "",
    buttonLink: "",
    badge: "",
  },
  {
    id: "pricing-3",
    name: "",
    sessionsLabel: "",
    price: "",
    validity: "",
    buttonText: "",
    buttonLink: "",
    badge: "",
  },
];

const DEFAULT_TESTIMONIAL_BLOCKS: TestimonialBlock[] = [
  {
    id: "testimonial-1",
    quote: "",
    author: "",
  },
];

const DEFAULT_FAQ_BLOCKS: FaqBlock[] = [
  { id: "faq-1", question: "", answer: "" },
  { id: "faq-2", question: "", answer: "" },
  { id: "faq-3", question: "", answer: "" },
  { id: "faq-4", question: "", answer: "" },
  { id: "faq-5", question: "", answer: "" },
  { id: "faq-6", question: "", answer: "" },
];

export default function HungarianCoachingPageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "hungarian-coaching",
    lang: language ?? undefined,
  });

  const upsertContent = useMutation(api.admin.upsertPageContent);
  const showSaveError = useAdminSaveErrorPopup();

  const [activeSection, setActiveSection] = useState("hero");
  const [formData, setFormData] = useState<Record<string, SectionData>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const pendingFocusSectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pageContent) return;

    const map: Record<string, SectionData> = {};
    for (const section of pageContent) {
      map[section.sectionKey] = { ...section.content };
    }

    for (const s of sections) {
      map[s.key] = map[s.key] ?? {};
    }

    if (!map.paths.blocks || map.paths.blocks.length === 0) {
      map.paths = { ...map.paths, blocks: DEFAULT_PATH_BLOCKS };
    }

    if (!map.pricing.blocks || map.pricing.blocks.length === 0) {
      map.pricing = { ...map.pricing, blocks: DEFAULT_PRICING_BLOCKS };
    }

    if (!map.testimonials.blocks || map.testimonials.blocks.length === 0) {
      map.testimonials = { ...map.testimonials, blocks: DEFAULT_TESTIMONIAL_BLOCKS };
    }

    if (!map.faq.blocks || map.faq.blocks.length === 0) {
      map.faq = { ...map.faq, blocks: DEFAULT_FAQ_BLOCKS };
    }

    setFormData(map);
  }, [pageContent]);

  const createId = () => {
    const c = crypto as any;
    return c?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const updateSection = (sectionKey: string, patch: Partial<SectionData>) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], ...patch },
    }));

    setErrors((prev) => {
      const next = { ...prev };
      if (next[sectionKey]) {
        next[sectionKey] = { ...next[sectionKey] };
        for (const k of Object.keys(patch)) delete next[sectionKey][k];
      }
      return next;
    });

    setHasChanges(true);
  };

  const getBlocks = <T,>(sectionKey: string): T[] =>
    (formData[sectionKey]?.blocks ?? []) as T[];

  const setBlocks = (sectionKey: string, blocks: any[]) =>
    updateSection(sectionKey, { blocks });

  const addBlock = (sectionKey: string, template: Record<string, any> = {}) =>
    setBlocks(sectionKey, [...getBlocks(sectionKey), { id: createId(), ...template }]);

  const removeBlock = (sectionKey: string, index: number) => {
    const blocks = [...getBlocks(sectionKey)];
    blocks.splice(index, 1);
    setBlocks(sectionKey, blocks);
  };

  const updateBlock = (sectionKey: string, index: number, patch: Record<string, any>) => {
    const blocks = [...getBlocks(sectionKey)];
    blocks[index] = { ...blocks[index], ...patch };
    setBlocks(sectionKey, blocks);

    setErrors((prev) => {
      const next = { ...prev };
      if (next[sectionKey]?.blocks?.[index]) {
        const blockErrors = [...(next[sectionKey].blocks ?? [])];
        blockErrors[index] = { ...blockErrors[index] };
        for (const k of Object.keys(patch)) delete blockErrors[index][k];
        next[sectionKey] = { ...next[sectionKey], blocks: blockErrors };
      }
      return next;
    });
  };

  const moveBlock = (sectionKey: string, from: number, to: number) => {
    if (from === to) return;
    const blocks = [...getBlocks(sectionKey)];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    setBlocks(sectionKey, blocks);
  };

  const computeErrors = (): Record<string, any> => {
    const next: Record<string, any> = {};

    const hero = formData.hero ?? {};
    const heroErrs: any = {};
    if (requiredError(hero.eyebrow)) heroErrs.eyebrow = requiredError(hero.eyebrow);
    if (requiredError(hero.heading)) heroErrs.heading = requiredError(hero.heading);
    if (requiredError(hero.body, true)) heroErrs.body = requiredError(hero.body, true);
    if (requiredError(hero.buttonText)) heroErrs.buttonText = requiredError(hero.buttonText);
    if (requiredError(hero.buttonLink)) heroErrs.buttonLink = requiredError(hero.buttonLink);
    if (Object.keys(heroErrs).length) next.hero = heroErrs;

    const paths = formData.paths ?? {};
    const pathsErrs: any = {};
    if (requiredError(paths.eyebrow)) pathsErrs.eyebrow = requiredError(paths.eyebrow);
    if (requiredError(paths.heading)) pathsErrs.heading = requiredError(paths.heading);

    const pathBlocks = (paths.blocks ?? []) as ImageBlock[];
    const pathBlockErrs = pathBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.heading)) e.heading = requiredError(b.heading);
      if (requiredError(b.body, true)) e.body = requiredError(b.body, true);
      if (requiredError(b.imageStorageId)) e.imageStorageId = requiredError(b.imageStorageId);
      if (requiredError(b.imageAlt)) e.imageAlt = requiredError(b.imageAlt);
      return e;
    });
    if (pathBlockErrs.some((e) => Object.keys(e).length)) pathsErrs.blocks = pathBlockErrs;
    if (Object.keys(pathsErrs).length) next.paths = pathsErrs;

    const pricing = formData.pricing ?? {};
    const pricingErrs: any = {};
    if (requiredError(pricing.eyebrow)) pricingErrs.eyebrow = requiredError(pricing.eyebrow);
    if (requiredError(pricing.heading)) pricingErrs.heading = requiredError(pricing.heading);
    if (requiredError(pricing.footerText)) pricingErrs.footerText = requiredError(pricing.footerText);
    if (requiredError(pricing.footerLinkText)) pricingErrs.footerLinkText = requiredError(pricing.footerLinkText);
    if (requiredError(pricing.footerLinkHref)) pricingErrs.footerLinkHref = requiredError(pricing.footerLinkHref);

    const pricingBlocks = (pricing.blocks ?? []) as PricingBlock[];
    const pricingBlockErrs = pricingBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.name)) e.name = requiredError(b.name);
      if (requiredError(b.sessionsLabel)) e.sessionsLabel = requiredError(b.sessionsLabel);
      if (requiredError(b.price)) e.price = requiredError(b.price);
      if (requiredError(b.validity)) e.validity = requiredError(b.validity);
      if (requiredError(b.buttonText)) e.buttonText = requiredError(b.buttonText);
      if (requiredError(b.buttonLink)) e.buttonLink = requiredError(b.buttonLink);
      if (requiredError(b.badge)) e.badge = requiredError(b.badge);
      return e;
    });
    if (pricingBlockErrs.some((e) => Object.keys(e).length)) pricingErrs.blocks = pricingBlockErrs;
    if (Object.keys(pricingErrs).length) next.pricing = pricingErrs;

    const inlineCta = formData.inline_cta ?? {};
    const inlineCtaErrs: any = {};
    if (requiredError(inlineCta.text)) inlineCtaErrs.text = requiredError(inlineCta.text);
    if (requiredError(inlineCta.linkText)) inlineCtaErrs.linkText = requiredError(inlineCta.linkText);
    if (requiredError(inlineCta.linkHref)) inlineCtaErrs.linkHref = requiredError(inlineCta.linkHref);
    if (Object.keys(inlineCtaErrs).length) next.inline_cta = inlineCtaErrs;

    const testimonials = formData.testimonials ?? {};
    const testimonialsErrs: any = {};
    if (requiredError(testimonials.eyebrow)) testimonialsErrs.eyebrow = requiredError(testimonials.eyebrow);

    const testimonialBlocks = (testimonials.blocks ?? []) as TestimonialBlock[];
    const testimonialBlockErrs = testimonialBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.quote, true)) e.quote = requiredError(b.quote, true);
      if (requiredError(b.author)) e.author = requiredError(b.author);
      return e;
    });
    if (testimonialBlockErrs.some((e) => Object.keys(e).length)) {
      testimonialsErrs.blocks = testimonialBlockErrs;
    }
    if (Object.keys(testimonialsErrs).length) next.testimonials = testimonialsErrs;

    const faq = formData.faq ?? {};
    const faqErrs: any = {};
    if (requiredError(faq.heading)) faqErrs.heading = requiredError(faq.heading);

    const faqBlocks = (faq.blocks ?? []) as FaqBlock[];
    const faqBlockErrs = faqBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.question)) e.question = requiredError(b.question);
      if (requiredError(b.answer, true)) e.answer = requiredError(b.answer, true);
      return e;
    });
    if (faqBlockErrs.some((e) => Object.keys(e).length)) faqErrs.blocks = faqBlockErrs;
    if (Object.keys(faqErrs).length) next.faq = faqErrs;

    const bottomCta = formData.bottom_cta ?? {};
    const bottomCtaErrs: any = {};
    if (requiredError(bottomCta.heading)) bottomCtaErrs.heading = requiredError(bottomCta.heading);
    if (requiredError(bottomCta.body, true)) bottomCtaErrs.body = requiredError(bottomCta.body, true);
    if (requiredError(bottomCta.getInTouchButtonText)) {
      bottomCtaErrs.getInTouchButtonText = requiredError(bottomCta.getInTouchButtonText);
    }
    if (requiredError(bottomCta.getInTouchButtonLink)) {
      bottomCtaErrs.getInTouchButtonLink = requiredError(bottomCta.getInTouchButtonLink);
    }
    if (Object.keys(bottomCtaErrs).length) next.bottom_cta = bottomCtaErrs;

    setErrors(next);
    return next;
  };

  const focusFirstInvalid = (sectionKey: string) => {
    if (typeof document === "undefined") return;
    const root = document.querySelector(`[data-admin-section-key="${sectionKey}"]`) as HTMLElement | null;
    if (!root) return;

    const target =
      (root.querySelector('[aria-invalid="true"]') as HTMLElement | null) ??
      (root.querySelector("input, textarea, [contenteditable='true']") as HTMLElement | null);

    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  };

  useEffect(() => {
    const pending = pendingFocusSectionKeyRef.current;
    if (!pending || pending !== activeSection) return;
    pendingFocusSectionKeyRef.current = null;
    requestAnimationFrame(() => focusFirstInvalid(pending));
  }, [activeSection, errors]);

  const handleSave = async () => {
    const nextErrors = computeErrors();
    const errorKeys = Object.keys(nextErrors);

    if (errorKeys.length > 0) {
      const activeIndex = sections.findIndex((s) => s.key === activeSection);
      let nextInvalidKey = activeSection;

      if (!errorKeys.includes(activeSection)) {
        for (let offset = 1; offset <= sections.length; offset++) {
          const candidate = sections[(activeIndex + offset) % sections.length]?.key;
          if (candidate && errorKeys.includes(candidate)) {
            nextInvalidKey = candidate;
            break;
          }
        }
      }

      pendingFocusSectionKeyRef.current = nextInvalidKey;
      if (nextInvalidKey !== activeSection) setActiveSection(nextInvalidKey);
      return;
    }

    setSaving(true);
    try {
      for (const [sectionKey, content] of Object.entries(formData)) {
        await upsertContent({
          pageSlug: "hungarian-coaching",
          sectionKey,
          lang: language ?? undefined,
          content,
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, { title: "Couldn't save Hungarian Coaching page" });
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) return <AdminPageLoader />;

  const s = (key: string) => formData[key] ?? {};

  return (
    <AdminPageLayout
      pageTitle="Edit Hungarian Coaching Page"
      breadcrumbLabel="Hungarian Coaching"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {activeSection === "hero" && (
        <div className="space-y-6" data-admin-section-key="hero">
          <GeneralInput
            label="Eyebrow"
            value={s("hero").eyebrow ?? ""}
            onChange={(e) => updateSection("hero", { eyebrow: e.target.value })}
            placeholder="LinguAnna Coaching"
            error={errors.hero?.eyebrow}
          />
          <GeneralInput
            label="Main heading"
            value={s("hero").heading ?? ""}
            onChange={(e) => updateSection("hero", { heading: e.target.value })}
            placeholder="Stop being on the outside..."
            error={errors.hero?.heading}
          />
          <RichTextEditor
            label="Intro text"
            editorKey="hungarian-coaching-hero-body"
            value={s("hero").body ?? ""}
            onChange={(v) => updateSection("hero", { body: v })}
            placeholder="Whether you're starting from zero..."
            tools={["bold", "italic", "link", "color"]}
            error={errors.hero?.body}
          />
          <div className="grid lg:grid-cols-2 gap-6">
            <GeneralInput
              label="Button text"
              value={s("hero").buttonText ?? ""}
              onChange={(e) => updateSection("hero", { buttonText: e.target.value })}
              placeholder="Book a free discovery call"
              error={errors.hero?.buttonText}
            />
            <GeneralInput
              label="Button link"
              value={s("hero").buttonLink ?? ""}
              onChange={(e) => updateSection("hero", { buttonLink: e.target.value })}
              placeholder="/contact"
              error={errors.hero?.buttonLink}
            />
          </div>
        </div>
      )}

      {activeSection === "paths" && (
        <div className="space-y-6" data-admin-section-key="paths">
          <GeneralInput
            label="Eyebrow"
            value={s("paths").eyebrow ?? ""}
            onChange={(e) => updateSection("paths", { eyebrow: e.target.value })}
            placeholder="The Learning Experience"
            error={errors.paths?.eyebrow}
          />
          <GeneralInput
            label="Section heading"
            value={s("paths").heading ?? ""}
            onChange={(e) => updateSection("paths", { heading: e.target.value })}
            placeholder="Two Paths to Proficiency"
            error={errors.paths?.heading}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Path cards</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  addBlock("paths", {
                    heading: "",
                    body: "",
                    imageStorageId: undefined,
                    imageAlt: "",
                  })
                }
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add path
              </button>
            </div>

            <div className="space-y-4">
              {getBlocks<ImageBlock>("paths").map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveBlock("paths", dragIndex, i);
                    setDragIndex(null);
                  }}
                  className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-[#3B5249]/45 cursor-grab select-none">
                        <GripVertical size={18} />
                      </span>
                      Path {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock("paths", i)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <GeneralInput
                        label="Card heading"
                        value={block.heading ?? ""}
                        onChange={(e) => updateBlock("paths", i, { heading: e.target.value })}
                        placeholder="Learn Hungarian - structured coaching"
                        error={errors.paths?.blocks?.[i]?.heading}
                      />
                      <RichTextEditor
                        label="Description"
                        editorKey={`paths-block-${block.id}`}
                        value={block.body ?? ""}
                        onChange={(v) => updateBlock("paths", i, { body: v })}
                        placeholder="Hungarian is one of the most unique languages..."
                        tools={["bold", "italic", "link", "color"]}
                        error={errors.paths?.blocks?.[i]?.body}
                      />
                    </div>

                    <div>
                      <ImageUploader
                        label="Card image"
                        storageId={block.imageStorageId}
                        alt={block.imageAlt ?? ""}
                        onImageChange={(id) => updateBlock("paths", i, { imageStorageId: id })}
                        onBlurDataUrlChange={(blur) =>
                          updateBlock("paths", i, { imageBlurDataUrl: blur })
                        }
                        onAltChange={(v) => updateBlock("paths", i, { imageAlt: v })}
                        previewSize={240}
                        error={errors.paths?.blocks?.[i]?.imageStorageId}
                        altError={errors.paths?.blocks?.[i]?.imageAlt}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === "pricing" && (
        <div className="space-y-6" data-admin-section-key="pricing">
          <GeneralInput
            label="Eyebrow"
            value={s("pricing").eyebrow ?? ""}
            onChange={(e) => updateSection("pricing", { eyebrow: e.target.value })}
            placeholder="Pricing & Investment"
            error={errors.pricing?.eyebrow}
          />
          <GeneralInput
            label="Section heading"
            value={s("pricing").heading ?? ""}
            onChange={(e) => updateSection("pricing", { heading: e.target.value })}
            placeholder="Conversation Bundles"
            error={errors.pricing?.heading}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Pricing cards</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  addBlock("pricing", {
                    name: "",
                    sessionsLabel: "",
                    price: "",
                    validity: "",
                    buttonText: "",
                    buttonLink: "",
                    badge: "",
                  })
                }
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add package
              </button>
            </div>

            <div className="space-y-4">
              {getBlocks<PricingBlock>("pricing").map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveBlock("pricing", dragIndex, i);
                    setDragIndex(null);
                  }}
                  className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-[#3B5249]/45 cursor-grab select-none">
                        <GripVertical size={18} />
                      </span>
                      Package {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock("pricing", i)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <GeneralInput
                        label="Package name"
                        value={block.name ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { name: e.target.value })}
                        placeholder="Starter"
                        error={errors.pricing?.blocks?.[i]?.name}
                      />
                      <GeneralInput
                        label="Sessions label"
                        value={block.sessionsLabel ?? ""}
                        onChange={(e) =>
                          updateBlock("pricing", i, { sessionsLabel: e.target.value })
                        }
                        placeholder="4 Sessions"
                        error={errors.pricing?.blocks?.[i]?.sessionsLabel}
                      />
                      <GeneralInput
                        label="Price"
                        value={block.price ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { price: e.target.value })}
                        placeholder="€105"
                        error={errors.pricing?.blocks?.[i]?.price}
                      />
                      <GeneralInput
                        label="Validity text"
                        value={block.validity ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { validity: e.target.value })}
                        placeholder="Valid for 5 weeks"
                        error={errors.pricing?.blocks?.[i]?.validity}
                      />
                    </div>

                    <div className="space-y-4">
                      <GeneralInput
                        label="Button text"
                        value={block.buttonText ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { buttonText: e.target.value })}
                        placeholder="Choose Starter"
                        error={errors.pricing?.blocks?.[i]?.buttonText}
                      />
                      <GeneralInput
                        label="Button link"
                        value={block.buttonLink ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { buttonLink: e.target.value })}
                        placeholder="/contact"
                        error={errors.pricing?.blocks?.[i]?.buttonLink}
                      />
                      <GeneralInput
                        label="Badge"
                        value={block.badge ?? ""}
                        onChange={(e) => updateBlock("pricing", i, { badge: e.target.value })}
                        placeholder="Most Popular"
                        error={errors.pricing?.blocks?.[i]?.badge}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GeneralInput
              label="Footer text"
              value={s("pricing").footerText ?? ""}
              onChange={(e) => updateSection("pricing", { footerText: e.target.value })}
              placeholder="Ready to get started? Send me a message..."
              error={errors.pricing?.footerText}
            />
            <GeneralInput
              label="Footer link text"
              value={s("pricing").footerLinkText ?? ""}
              onChange={(e) => updateSection("pricing", { footerLinkText: e.target.value })}
              placeholder="Get in touch"
              error={errors.pricing?.footerLinkText}
            />
          </div>

          <GeneralInput
            label="Footer link href"
            value={s("pricing").footerLinkHref ?? ""}
            onChange={(e) => updateSection("pricing", { footerLinkHref: e.target.value })}
            placeholder="/contact"
            error={errors.pricing?.footerLinkHref}
          />
        </div>
      )}

      {activeSection === "inline_cta" && (
        <div className="space-y-6" data-admin-section-key="inline_cta">
          <GeneralInput
            label="Text"
            value={s("inline_cta").text ?? ""}
            onChange={(e) => updateSection("inline_cta", { text: e.target.value })}
            placeholder="Ready to get started?"
            error={errors.inline_cta?.text}
          />
          <div className="grid lg:grid-cols-2 gap-6">
            <GeneralInput
              label="Link text"
              value={s("inline_cta").linkText ?? ""}
              onChange={(e) => updateSection("inline_cta", { linkText: e.target.value })}
              placeholder="Send me a message"
              error={errors.inline_cta?.linkText}
            />
            <GeneralInput
              label="Link href"
              value={s("inline_cta").linkHref ?? ""}
              onChange={(e) => updateSection("inline_cta", { linkHref: e.target.value })}
              placeholder="/contact"
              error={errors.inline_cta?.linkHref}
            />
          </div>
        </div>
      )}

      {activeSection === "testimonials" && (
        <div className="space-y-6" data-admin-section-key="testimonials">
          <GeneralInput
            label="Eyebrow"
            value={s("testimonials").eyebrow ?? ""}
            onChange={(e) => updateSection("testimonials", { eyebrow: e.target.value })}
            placeholder="What clients say"
            error={errors.testimonials?.eyebrow}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Testimonials</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() => addBlock("testimonials", { quote: "", author: "" })}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add testimonial
              </button>
            </div>

            <div className="space-y-4">
              {getBlocks<TestimonialBlock>("testimonials").map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveBlock("testimonials", dragIndex, i);
                    setDragIndex(null);
                  }}
                  className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-[#3B5249]/45 cursor-grab select-none">
                        <GripVertical size={18} />
                      </span>
                      Testimonial {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock("testimonials", i)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="space-y-4">
                    <RichTextEditor
                      label="Quote"
                      editorKey={`testimonial-${block.id}`}
                      value={block.quote ?? ""}
                      onChange={(v) => updateBlock("testimonials", i, { quote: v })}
                      placeholder="I've had many English teachers..."
                      tools={["bold", "italic", "link", "color"]}
                      error={errors.testimonials?.blocks?.[i]?.quote}
                    />
                    <GeneralInput
                      label="Author"
                      value={block.author ?? ""}
                      onChange={(e) => updateBlock("testimonials", i, { author: e.target.value })}
                      placeholder="Tom"
                      error={errors.testimonials?.blocks?.[i]?.author}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === "faq" && (
        <div className="space-y-6" data-admin-section-key="faq">
          <GeneralInput
            label="Section heading"
            value={s("faq").heading ?? ""}
            onChange={(e) => updateSection("faq", { heading: e.target.value })}
            placeholder="Common Questions"
            error={errors.faq?.heading}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">FAQ items</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() => addBlock("faq", { question: "", answer: "" })}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {getBlocks<FaqBlock>("faq").map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveBlock("faq", dragIndex, i);
                    setDragIndex(null);
                  }}
                  className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-[#3B5249]/45 cursor-grab select-none">
                        <GripVertical size={18} />
                      </span>
                      FAQ {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock("faq", i)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="space-y-4">
                    <GeneralInput
                      label="Question"
                      value={block.question ?? ""}
                      onChange={(e) => updateBlock("faq", i, { question: e.target.value })}
                      placeholder="How long are sessions?"
                      error={errors.faq?.blocks?.[i]?.question}
                    />
                    <RichTextEditor
                      label="Answer"
                      editorKey={`faq-${block.id}`}
                      value={block.answer ?? ""}
                      onChange={(v) => updateBlock("faq", i, { answer: v })}
                      placeholder="Sessions are 45 minutes long..."
                      tools={["bold", "italic", "link", "color"]}
                      error={errors.faq?.blocks?.[i]?.answer}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === "bottom_cta" && (
        <div data-admin-section-key="bottom_cta">
          <CTA
            title={s("bottom_cta").heading ?? ""}
            onTitleChange={(v) => updateSection("bottom_cta", { heading: v })}
            titleError={errors.bottom_cta?.heading}
            description={s("bottom_cta").body ?? ""}
            onDescriptionChange={(v) => updateSection("bottom_cta", { body: v })}
            editorKey="hungarian-coaching-bottom-cta-body"
            descriptionError={errors.bottom_cta?.body}
            buttons={[
              {
                text: s("bottom_cta").getInTouchButtonText,
                link: s("bottom_cta").getInTouchButtonLink,
                onTextChange: (v) =>
                  updateSection("bottom_cta", { getInTouchButtonText: v }),
                onLinkChange: (v) =>
                  updateSection("bottom_cta", { getInTouchButtonLink: v }),
                textLabel: "Button text",
                linkLabel: "Button link",
                textPlaceholder: "Book your free discovery call",
                linkPlaceholder: "/contact",
                textError: errors.bottom_cta?.getInTouchButtonText,
                linkError: errors.bottom_cta?.getInTouchButtonLink,
              },
            ]}
          />
        </div>
      )}
    </AdminPageLayout>
  );
}