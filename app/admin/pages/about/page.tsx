"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import SvgImageUploader from "@/components/admin/inputs/SvgImageUploader";
import { Id } from "@/convex/_generated/dataModel";
import CTA from "@/components/admin/CTA";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type Block = {
  id: string;
  eyebrow?: string;
  body?: string;
  imageStorageId?: Id<"_storage">;
  imageAlt?: string;
  imageBlurDataUrl?: string;
  iconStorageId?: Id<"_storage">;
};

type SectionData = Record<string, any>;

const sections = [
  { key: "hero", label: "Hero" },
  { key: "journey", label: "My Journey" },
  { key: "credentials", label: "Credentials" },
  { key: "why_coaching", label: "Why Coaching" },
  { key: "glimpse", label: "Glimpse Into My World" },
  { key: "who_i_work_with", label: "Who I Work With" },
  { key: "cta", label: "CTA" },
];

const DEFAULT_WHO_BLOCKS: Block[] = [
  { id: "who-en", eyebrow: "ENGLISH LEARNERS", body: "", iconStorageId: undefined },
  { id: "who-hu", eyebrow: "HUNGARIAN LEARNERS", body: "", iconStorageId: undefined },
];

const DEFAULT_GLIMPSE_BLOCKS: Block[] = [
  { id: "glimpse-1", imageStorageId: undefined, imageAlt: "" },
  { id: "glimpse-2", imageStorageId: undefined, imageAlt: "" },
];

const DEFAULT_CREDENTIAL_BLOCKS: Block[] = [
  { id: "cred-1", eyebrow: "", body: "" },
];

export default function AboutPageEditor() {
  const { language } = useAdminLanguage();
  const pageContent = useQuery(api.admin.getPageContentAdmin, {
    pageSlug: "about",
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
    if (!map.who_i_work_with.blocks || map.who_i_work_with.blocks.length === 0) {
      map.who_i_work_with = { ...map.who_i_work_with, blocks: DEFAULT_WHO_BLOCKS };
    }
    if (!map.glimpse.blocks || map.glimpse.blocks.length === 0) {
      map.glimpse = { ...map.glimpse, blocks: DEFAULT_GLIMPSE_BLOCKS };
    }
    if (!map.credentials.blocks || map.credentials.blocks.length === 0) {
      map.credentials = { ...map.credentials, blocks: DEFAULT_CREDENTIAL_BLOCKS };
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

  const getBlocks = (sectionKey: string): Block[] =>
    (formData[sectionKey]?.blocks ?? []) as Block[];

  const setBlocks = (sectionKey: string, blocks: Block[]) =>
    updateSection(sectionKey, { blocks });

  const addBlock = (sectionKey: string, template: Partial<Block> = {}) =>
    setBlocks(sectionKey, [...getBlocks(sectionKey), { id: createId(), ...template }]);

  const removeBlock = (sectionKey: string, index: number) => {
    const blocks = [...getBlocks(sectionKey)];
    blocks.splice(index, 1);
    setBlocks(sectionKey, blocks);
  };

  const updateBlock = (sectionKey: string, index: number, patch: Partial<Block>) => {
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
    if (requiredError(hero.body, true)) heroErrs.body = requiredError(hero.body, true);
    if (requiredError(hero.imageStorageId)) heroErrs.imageStorageId = requiredError(hero.imageStorageId);
    if (requiredError(hero.imageAlt)) heroErrs.imageAlt = requiredError(hero.imageAlt);
    if (Object.keys(heroErrs).length) next.hero = heroErrs;

    const journey = formData.journey ?? {};
    const journeyErrs: any = {};
    if (requiredError(journey.heading)) journeyErrs.heading = requiredError(journey.heading);
    if (requiredError(journey.body, true)) journeyErrs.body = requiredError(journey.body, true);
    if (Object.keys(journeyErrs).length) next.journey = journeyErrs;

    const credentials = formData.credentials ?? {};
    const credentialsErrs: any = {};
    const credentialBlocks = (credentials.blocks ?? []) as Block[];
    const credentialBlockErrs = credentialBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.eyebrow)) e.eyebrow = requiredError(b.eyebrow);
      if (requiredError(b.body, true)) e.body = requiredError(b.body, true);
      return e;
    });
    if (credentialBlockErrs.some((e) => Object.keys(e).length)) {
      credentialsErrs.blocks = credentialBlockErrs;
    }
    if (Object.keys(credentialsErrs).length) next.credentials = credentialsErrs;

    const why = formData.why_coaching ?? {};
    const whyErrs: any = {};
    if (requiredError(why.heading)) whyErrs.heading = requiredError(why.heading);
    if (requiredError(why.body, true)) whyErrs.body = requiredError(why.body, true);
    if (requiredError(why.imageStorageId)) whyErrs.imageStorageId = requiredError(why.imageStorageId);
    if (requiredError(why.imageAlt)) whyErrs.imageAlt = requiredError(why.imageAlt);
    if (Object.keys(whyErrs).length) next.why_coaching = whyErrs;

    const who = formData.who_i_work_with ?? {};
    const whoErrs: any = {};
    if (requiredError(who.heading)) whoErrs.heading = requiredError(who.heading);
    const whoBlocks = (who.blocks ?? []) as Block[];
    const whoBlockErrs = whoBlocks.map((b) => {
      const e: any = {};
      if (requiredError(b.eyebrow)) e.eyebrow = requiredError(b.eyebrow);
      if (requiredError(b.body, true)) e.body = requiredError(b.body, true);
      return e;
    });
    if (whoBlockErrs.some((e) => Object.keys(e).length)) whoErrs.blocks = whoBlockErrs;
    if (Object.keys(whoErrs).length) next.who_i_work_with = whoErrs;

    const glimpse = formData.glimpse ?? {};
    const glimpseErrs: any = {};
    if (requiredError(glimpse.heading)) glimpseErrs.heading = requiredError(glimpse.heading);
    if (requiredError(glimpse.body, true)) glimpseErrs.body = requiredError(glimpse.body, true);
    if (Object.keys(glimpseErrs).length) next.glimpse = glimpseErrs;

    const cta = formData.cta ?? {};
    const ctaErrs: any = {};
    if (requiredError(cta.heading)) ctaErrs.heading = requiredError(cta.heading);
    if (requiredError(cta.body, true)) ctaErrs.body = requiredError(cta.body, true);
    if (requiredError(cta.getInTouchButtonText)) ctaErrs.getInTouchButtonText = requiredError(cta.getInTouchButtonText);
    if (requiredError(cta.getInTouchButtonLink)) ctaErrs.getInTouchButtonLink = requiredError(cta.getInTouchButtonLink);
    if (Object.keys(ctaErrs).length) next.cta = ctaErrs;

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
          pageSlug: "about",
          sectionKey,
          lang: language ?? undefined,
          content,
        });
      }
      setHasChanges(false);
    } catch (error) {
      await showSaveError(error, { title: "Couldn't save About page" });
    } finally {
      setSaving(false);
    }
  };

  if (pageContent === undefined) return <AdminPageLoader />;

  const s = (key: string) => formData[key] ?? {};

  return (
    <AdminPageLayout
      pageTitle="Edit About Page"
      breadcrumbLabel="About"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saving={saving}
      hasChanges={hasChanges}
    >
      {/* =================== HERO =================== */}
      {activeSection === "hero" && (
        <div className="space-y-8" data-admin-section-key="hero">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <RichTextEditor
                label="Heading / Introduction text"
                editorKey="about-hero-body"
                value={s("hero").body ?? ""}
                onChange={(v) => updateSection("hero", { body: v })}
                placeholder="Hi, I'm Anna, the founder of LinguAnna..."
                tools={["bold", "italic", "link", "color"]}
                error={errors.hero?.body}
              />
            </div>
            <div>
              <ImageUploader
                label="Portrait photo"
                storageId={s("hero").imageStorageId}
                alt={s("hero").imageAlt}
                onImageChange={(id) => updateSection("hero", { imageStorageId: id })}
                onBlurDataUrlChange={(blur) => updateSection("hero", { imageBlurDataUrl: blur })}
                onAltChange={(v) => updateSection("hero", { imageAlt: v })}
                previewSize={280}
                error={errors.hero?.imageStorageId}
                altError={errors.hero?.imageAlt}
              />
            </div>
          </div>
        </div>
      )}

      {/* =================== JOURNEY =================== */}
      {activeSection === "journey" && (
        <div className="space-y-6" data-admin-section-key="journey">
          <GeneralInput
            label="Section heading"
            value={s("journey").heading ?? ""}
            onChange={(e) => updateSection("journey", { heading: e.target.value })}
            placeholder="My Journey"
            error={errors.journey?.heading}
          />
          <RichTextEditor
            label="Story text (right column)"
            editorKey="about-journey-body"
            value={s("journey").body ?? ""}
            onChange={(v) => updateSection("journey", { body: v })}
            placeholder="Language has always been more than a subject to me..."
            tools={["bold", "italic", "link", "color", "heading"]}
            error={errors.journey?.body}
          />
        </div>
      )}

      {/* =================== CREDENTIALS =================== */}
      {activeSection === "credentials" && (
        <div className="space-y-6" data-admin-section-key="credentials">
          <div className="grid lg:grid-cols-2 gap-6">
            <GeneralInput
              label="Card heading"
              value={s("credentials").heading ?? ""}
              onChange={(e) => updateSection("credentials", { heading: e.target.value })}
              placeholder="My Credentials"
            />
            <ImageUploader
              label="Heading icon"
              storageId={s("credentials").iconStorageId}
              alt={s("credentials").iconAlt}
              onImageChange={(id) => updateSection("credentials", { iconStorageId: id })}
              onAltChange={(v) => updateSection("credentials", { iconAlt: v })}
              previewSize={96}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Credential items</h3>
                <p className="text-xs text-[#3B5249]/55">Year + text block, drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() => addBlock("credentials", { eyebrow: "", body: "" })}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add item
              </button>
            </div>

            {getBlocks("credentials").length === 0 ? (
              <div className="text-sm text-[#3B5249]/55 border border-dashed border-[#D4B483]/35 rounded-lg p-4">
                No credential items yet.
              </div>
            ) : (
              <div className="space-y-4">
                {getBlocks("credentials").map((block, i) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      moveBlock("credentials", dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-[#3B5249]/45 cursor-grab select-none">
                          <GripVertical size={18} />
                        </span>
                        Item {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlock("credentials", i)}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>

                    <div className="space-y-4">
                      <GeneralInput
                        label="Year"
                        value={block.eyebrow ?? ""}
                        onChange={(e) =>
                          updateBlock("credentials", i, { eyebrow: e.target.value })
                        }
                        placeholder="2024"
                        error={errors.credentials?.blocks?.[i]?.eyebrow}
                      />
                      <RichTextEditor
                        label="Text block"
                        editorKey={`credentials-block-${block.id}`}
                        value={block.body ?? ""}
                        onChange={(v) => updateBlock("credentials", i, { body: v })}
                        placeholder="Neurolanguage Coach Certification"
                        tools={["bold", "italic", "link", "color"]}
                        error={errors.credentials?.blocks?.[i]?.body}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================== WHY COACHING =================== */}
      {activeSection === "why_coaching" && (
        <div className="space-y-6" data-admin-section-key="why_coaching">
          <GeneralInput
            label="Section heading"
            value={s("why_coaching").heading ?? ""}
            onChange={(e) => updateSection("why_coaching", { heading: e.target.value })}
            placeholder="Why Neurolanguage Coaching?"
            error={errors.why_coaching?.heading}
          />
          <div className="grid lg:grid-cols-2 gap-6">
            <RichTextEditor
              label="Body text"
              editorKey="about-why-body"
              value={s("why_coaching").body ?? ""}
              onChange={(v) => updateSection("why_coaching", { body: v })}
              placeholder="It was in France where I began teaching..."
              tools={["bold", "italic", "link", "color", 'heading']}
              error={errors.why_coaching?.body}
            />
            <ImageUploader
              label="Section image"
              storageId={s("why_coaching").imageStorageId}
              alt={s("why_coaching").imageAlt}
              onImageChange={(id) => updateSection("why_coaching", { imageStorageId: id })}
              onBlurDataUrlChange={(blur) => updateSection("why_coaching", { imageBlurDataUrl: blur })}
              onAltChange={(v) => updateSection("why_coaching", { imageAlt: v })}
              previewSize={240}
              error={errors.why_coaching?.imageStorageId}
              altError={errors.why_coaching?.imageAlt}
            />
          </div>
        </div>
      )}

      {/* =================== GLIMPSE =================== */}
      {activeSection === "glimpse" && (
        <div className="space-y-6" data-admin-section-key="glimpse">
          <GeneralInput
            label="Section heading"
            value={s("glimpse").heading ?? ""}
            onChange={(e) => updateSection("glimpse", { heading: e.target.value })}
            placeholder="A Glimpse Into My World"
            error={errors.glimpse?.heading}
          />
          <RichTextEditor
            label="Body text"
            editorKey="about-glimpse-body"
            value={s("glimpse").body ?? ""}
            onChange={(v) => updateSection("glimpse", { body: v })}
            placeholder="Outside of languages, I'm endlessly curious about personal growth..."
            tools={["bold", "italic", "link"]}
            error={errors.glimpse?.body}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Photos</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() => addBlock("glimpse", { imageAlt: "" })}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add photo
              </button>
            </div>

            {getBlocks("glimpse").length === 0 ? (
              <div className="text-sm text-[#3B5249]/55 border border-dashed border-[#D4B483]/35 rounded-lg p-4">
                No photos yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {getBlocks("glimpse").map((block, i) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      moveBlock("glimpse", dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-[#3B5249]/45 cursor-grab select-none">
                          <GripVertical size={18} />
                        </span>
                        Photo {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlock("glimpse", i)}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                    <ImageUploader
                      label="Photo"
                      storageId={block.imageStorageId}
                      alt={block.imageAlt ?? ""}
                      onImageChange={(id) => updateBlock("glimpse", i, { imageStorageId: id })}
                      onBlurDataUrlChange={(blur) => updateBlock("glimpse", i, { imageBlurDataUrl: blur })}
                      onAltChange={(v) => updateBlock("glimpse", i, { imageAlt: v })}
                      previewSize={200}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================== WHO I WORK WITH =================== */}
      {activeSection === "who_i_work_with" && (
        <div className="space-y-6" data-admin-section-key="who_i_work_with">
          <GeneralInput
            label="Section heading"
            value={s("who_i_work_with").heading ?? ""}
            onChange={(e) => updateSection("who_i_work_with", { heading: e.target.value })}
            placeholder="Who I Work With"
            error={errors.who_i_work_with?.heading}
          />
          <RichTextEditor
            label="Intro text"
            editorKey="about-who-intro"
            value={s("who_i_work_with").subheading ?? ""}
            onChange={(v) => updateSection("who_i_work_with", { subheading: v })}
            placeholder="What matters most to me isn't where you're starting from..."
            tools={["bold", "italic", "link", "color"]}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Audience cards</h3>
                <p className="text-xs text-[#3B5249]/55">Drag to reorder</p>
              </div>
              <button
                type="button"
                onClick={() => addBlock("who_i_work_with", { eyebrow: "", body: "" })}
                className="text-[#7B6E9E] text-sm flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add card
              </button>
            </div>

            {getBlocks("who_i_work_with").length === 0 ? (
              <div className="text-sm text-[#3B5249]/55 border border-dashed border-[#D4B483]/35 rounded-lg p-4">
                No audience cards yet.
              </div>
            ) : (
              <div className="space-y-4">
                {getBlocks("who_i_work_with").map((block, i) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      moveBlock("who_i_work_with", dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={`border border-[#D4B483]/20 rounded-xl p-4 bg-white ${dragIndex === i ? "ring-2 ring-[#7B6E9E]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-[#3B5249]/45 cursor-grab select-none">
                          <GripVertical size={18} />
                        </span>
                        Card {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlock("who_i_work_with", i)}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <GeneralInput
                          label="Label (eyebrow)"
                          value={block.eyebrow ?? ""}
                          onChange={(e) => updateBlock("who_i_work_with", i, { eyebrow: e.target.value })}
                          placeholder="ENGLISH LEARNERS"
                          error={errors.who_i_work_with?.blocks?.[i]?.eyebrow}
                        />
                        <RichTextEditor
                          label="Description"
                          editorKey={`who-block-${block.id}`}
                          value={block.body ?? ""}
                          onChange={(v) => updateBlock("who_i_work_with", i, { body: v })}
                          placeholder="For English, I work with B1+ learners..."
                          tools={["bold", "italic"]}
                          error={errors.who_i_work_with?.blocks?.[i]?.body}
                        />
                      </div>
                      <div>
                        <SvgImageUploader
                          label="Icon (SVG)"
                          storageId={block.iconStorageId}
                          alt={block.imageAlt ?? ""}
                          onImageChange={(id) => updateBlock("who_i_work_with", i, { iconStorageId: id })}
                          onAltChange={(v) => updateBlock("who_i_work_with", i, { imageAlt: v })}
                          previewSize={120}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================== CTA =================== */}
      {activeSection === "cta" && (
        <div data-admin-section-key="cta">
          <CTA
            title={s("cta").heading ?? ""}
            onTitleChange={(v) => updateSection("cta", { heading: v })}
            titleError={errors.cta?.heading}
            description={s("cta").body ?? ""}
            onDescriptionChange={(v) => updateSection("cta", { body: v })}
            editorKey="about-cta-body"
            descriptionError={errors.cta?.body}
            buttons={[
              {
                text: s("cta").getInTouchButtonText,
                link: s("cta").getInTouchButtonLink,
                onTextChange: (v) => updateSection("cta", { getInTouchButtonText: v }),
                onLinkChange: (v) => updateSection("cta", { getInTouchButtonLink: v }),
                textLabel: "Button text",
                linkLabel: "Button link",
                textPlaceholder: "Book your free discovery call",
                linkPlaceholder: "/contact",
                textError: errors.cta?.getInTouchButtonText,
                linkError: errors.cta?.getInTouchButtonLink,
              },
            ]}
          />
        </div>
      )}
    </AdminPageLayout>
  );
}
