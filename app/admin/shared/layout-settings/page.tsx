"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import {
  Plus,
  Trash2,
  Facebook,
  Linkedin,
  Instagram,
  Copyright,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import AdminPageLoader from "@/components/admin/AdminPageLoader";
import GeneralInput from "@/components/admin/inputs/GeneralInput";
import ImageUploader from "@/components/admin/inputs/ImageUploader";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import { requiredError } from "@/lib/admin/required";
import { useAdminSaveErrorPopup } from "@/hooks/useAdminSaveErrorPopup";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

type LayoutSectionKey = "header" | "footer";

const LAYOUT_SECTIONS: { key: LayoutSectionKey; label: string }[] = [
  { key: "header", label: "Header" },
  { key: "footer", label: "Footer" },
];

interface NavLink {
  href: string;
  label: string;
  isContact?: boolean;
}

interface SocialLink {
  platform: "facebook" | "linkedin" | "instagram";
  url: string;
  enabled: boolean;
}

interface HeaderData {
  logoStorageId?: string;
  logoUrl?: string; // Legacy support
  logoAlt: string;
  navLinks: NavLink[];
}

interface FooterData {
  brandName: string;
  tagline: string;
  email: string;
  socialLinks: SocialLink[];
  legalLinks: { label: string; url: string }[];
  copyrightText: string;
  contactColumnTitle: string;
  legalColumnTitle: string;
}

const emptyHeaderData: HeaderData = {
  logoUrl: "",
  logoAlt: "",
  navLinks: [],
};

const emptyFooterData: FooterData = {
  brandName: "",
  tagline: "",
  email: "",
  socialLinks: [
    { platform: "facebook", url: "", enabled: false },
    { platform: "linkedin", url: "", enabled: false },
    { platform: "instagram", url: "", enabled: false },
  ],
  legalLinks: [],
  copyrightText: "",
  contactColumnTitle: "",
  legalColumnTitle: "",
};

export default function LayoutSettingsPage() {
  const { language } = useAdminLanguage();
  const headerSettings = useQuery(api.admin.getSiteSettingsAdmin, {
    key: "header",
    lang: language ?? undefined,
  });
  const footerSettings = useQuery(api.admin.getSiteSettingsAdmin, {
    key: "footer",
    lang: language ?? undefined,
  });
  const upsertSettings = useMutation(api.admin.upsertSiteSettings);

  const showSaveError = useAdminSaveErrorPopup();

  const [activeSection, setActiveSection] =
    useState<LayoutSectionKey>("header");
  const [headerData, setHeaderData] = useState<HeaderData>(emptyHeaderData);
  const [footerData, setFooterData] = useState<FooterData>(emptyFooterData);
  const [saving, setSaving] = useState(false);

  const [headerHasChanges, setHeaderHasChanges] = useState(false);
  const [footerHasChanges, setFooterHasChanges] = useState(false);

  const [headerErrors, setHeaderErrors] = useState<{
    logo?: string;
    logoAlt?: string;
    navLinks?: Array<{ label?: string; href?: string }>;
    navLinksGeneral?: string;
  }>({});
  const [footerErrors, setFooterErrors] = useState<{
    brandName?: string;
    tagline?: string;
    contactColumnTitle?: string;
    legalColumnTitle?: string;
    email?: string;
    socialLinks?: Array<{ enabled?: string; url?: string }>;
    legalLinks?: Array<{ label?: string; url?: string }>;
    legalLinksGeneral?: string;
    copyrightText?: string;
  }>({});

  const pendingFocusSectionKeyRef = useRef<LayoutSectionKey | null>(null);

  // Drag and drop state
  const [draggedNavIndex, setDraggedNavIndex] = useState<number | null>(null);
  const [draggedSocialIndex, setDraggedSocialIndex] = useState<number | null>(
    null,
  );
  const [draggedLegalIndex, setDraggedLegalIndex] = useState<number | null>(
    null,
  );

  // Load data from database
  useEffect(() => {
    if (headerSettings === undefined) return;

    if (headerSettings === null) {
      setHeaderData(emptyHeaderData);
      setHeaderHasChanges(false);
      return;
    }

    const saved = headerSettings.data as Partial<HeaderData> | undefined;
    setHeaderData({
      ...emptyHeaderData,
      ...(saved ?? {}),
      navLinks: (saved?.navLinks ?? []) as NavLink[],
    });
    setHeaderHasChanges(false);
  }, [headerSettings, language]);

  useEffect(() => {
    if (footerSettings === undefined) return;

    if (footerSettings === null) {
      setFooterData(emptyFooterData);
      setFooterHasChanges(false);
      return;
    }

    // Ensure socialLinks always has all platforms
    const savedData = footerSettings.data as Partial<FooterData>;
    const mergedSocialLinks = emptyFooterData.socialLinks.map((defaultLink) => {
      const savedLink = savedData.socialLinks?.find(
        (s: SocialLink) => s.platform === defaultLink.platform,
      );
      return savedLink || defaultLink;
    });

    setFooterData({
      ...emptyFooterData,
      ...savedData,
      socialLinks: mergedSocialLinks,
      legalLinks: (savedData.legalLinks ?? []) as Array<{
        label: string;
        url: string;
      }>,
    });

    setFooterHasChanges(false);
  }, [footerSettings, language]);

  const validateHeader = () => {
    const nextErrors: typeof headerErrors = {};

    const hasLogo = Boolean(
      (headerData.logoStorageId && String(headerData.logoStorageId).trim()) ||
      (headerData.logoUrl && headerData.logoUrl.trim()),
    );
    nextErrors.logo = hasLogo ? undefined : "It is required";
    nextErrors.logoAlt = requiredError(headerData.logoAlt);

    if (!headerData.navLinks || headerData.navLinks.length === 0) {
      nextErrors.navLinksGeneral = "Add at least one navigation link.";
    } else {
      nextErrors.navLinks = headerData.navLinks.map((l) => ({
        label: requiredError(l.label),
        href: requiredError(l.href),
      }));
      const hasNavLinkErrors = nextErrors.navLinks.some(
        (e) => Boolean(e.label) || Boolean(e.href),
      );
      if (!hasNavLinkErrors) {
        delete nextErrors.navLinks;
      }
    }

    const hasAnyErrors = Object.values(nextErrors).some((v) => {
      if (Array.isArray(v))
        return v.some((x) => Object.values(x).some(Boolean));
      return Boolean(v);
    });

    setHeaderErrors(nextErrors);
    return !hasAnyErrors;
  };

  const validateFooter = () => {
    const nextErrors: typeof footerErrors = {};
    nextErrors.brandName = requiredError(footerData.brandName);
    nextErrors.tagline = requiredError(footerData.tagline, true);
    nextErrors.contactColumnTitle = requiredError(
      footerData.contactColumnTitle,
    );
    nextErrors.legalColumnTitle = requiredError(footerData.legalColumnTitle);
    nextErrors.email = requiredError(footerData.email);
    nextErrors.copyrightText = requiredError(footerData.copyrightText);

    nextErrors.socialLinks = footerData.socialLinks.map((s) => ({
      url: s.enabled ? requiredError(s.url) : undefined,
    }));
    const hasSocialErrors = nextErrors.socialLinks.some((e) => Boolean(e.url));
    if (!hasSocialErrors) {
      delete nextErrors.socialLinks;
    }

    if (!footerData.legalLinks || footerData.legalLinks.length === 0) {
      nextErrors.legalLinksGeneral = "Add at least one legal link.";
    } else {
      nextErrors.legalLinks = footerData.legalLinks.map((l) => ({
        label: requiredError(l.label),
        url: requiredError(l.url),
      }));
      const hasLegalErrors = nextErrors.legalLinks.some(
        (e) => Boolean(e.label) || Boolean(e.url),
      );
      if (!hasLegalErrors) {
        delete nextErrors.legalLinks;
      }
    }

    const hasAnyErrors = Object.values(nextErrors).some((v) => {
      if (Array.isArray(v))
        return v.some((x) => Object.values(x).some(Boolean));
      return Boolean(v);
    });
    setFooterErrors(nextErrors);
    return !hasAnyErrors;
  };

  const focusFirstInvalidFieldInSection = (sectionKey: LayoutSectionKey) => {
    if (typeof document === "undefined") return;

    const root = document.querySelector(
      `[data-admin-section-key="${sectionKey}"]`,
    ) as HTMLElement | null;
    if (!root) return;

    const target =
      (root.querySelector('[aria-invalid="true"]') as HTMLElement | null) ??
      (root.querySelector(
        "input, textarea, [contenteditable='true'], button",
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
  }, [activeSection, headerErrors, footerErrors]);

  const handleSaveHeader = async () => {
    setSaving(true);
    try {
      await upsertSettings({
        key: "header",
        lang: language ?? undefined,
        data: headerData,
      });
      toast.success("Header settings saved!");
      setHeaderHasChanges(false);
    } catch (error) {
      await showSaveError(error, { title: "Couldn't save header settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFooter = async () => {
    setSaving(true);
    try {
      await upsertSettings({
        key: "footer",
        lang: language ?? undefined,
        data: footerData,
      });
      toast.success("Footer settings saved!");
      setFooterHasChanges(false);
    } catch (error) {
      await showSaveError(error, { title: "Couldn't save footer settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const headerOk = validateHeader();
    const footerOk = validateFooter();

    if (!headerOk || !footerOk) {
      const invalidKeys: LayoutSectionKey[] = [];
      if (!headerOk) invalidKeys.push("header");
      if (!footerOk) invalidKeys.push("footer");

      const activeIndex = LAYOUT_SECTIONS.findIndex(
        (s) => s.key === activeSection,
      );

      let nextInvalidKey: LayoutSectionKey = activeSection;
      if (invalidKeys.includes(activeSection)) {
        nextInvalidKey = activeSection;
      } else {
        for (let offset = 1; offset <= LAYOUT_SECTIONS.length; offset++) {
          const idx = (activeIndex + offset) % LAYOUT_SECTIONS.length;
          const candidate = LAYOUT_SECTIONS[idx]?.key;
          if (candidate && invalidKeys.includes(candidate)) {
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

    if (activeSection === "header") {
      await handleSaveHeader();
      return;
    }
    await handleSaveFooter();
  };

  const addNavLink = () => {
    setHeaderData({
      ...headerData,
      navLinks: [
        ...headerData.navLinks,
        { href: "", label: "", isContact: false },
      ],
    });
    setHeaderHasChanges(true);
  };

  const removeNavLink = (index: number) => {
    setHeaderData({
      ...headerData,
      navLinks: headerData.navLinks.filter((_, i) => i !== index),
    });
    setHeaderHasChanges(true);
  };

  const updateNavLink = (
    index: number,
    field: "href" | "label" | "isContact",
    value: string | boolean,
  ) => {
    const newLinks = [...headerData.navLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setHeaderData({ ...headerData, navLinks: newLinks });
    setHeaderHasChanges(true);
  };

  const updateSocialLink = (
    platform: string,
    field: "url" | "enabled",
    value: string | boolean,
  ) => {
    setFooterData({
      ...footerData,
      socialLinks: footerData.socialLinks.map((link) =>
        link.platform === platform ? { ...link, [field]: value } : link,
      ),
    });
    setFooterHasChanges(true);
  };

  const addLegalLink = () => {
    setFooterData({
      ...footerData,
      legalLinks: [...footerData.legalLinks, { label: "", url: "" }],
    });
    setFooterHasChanges(true);
  };

  const removeLegalLink = (index: number) => {
    setFooterData({
      ...footerData,
      legalLinks: footerData.legalLinks.filter((_, i) => i !== index),
    });
    setFooterHasChanges(true);
  };

  const updateLegalLink = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    const newLinks = [...footerData.legalLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFooterData({ ...footerData, legalLinks: newLinks });
    setFooterHasChanges(true);
  };

  // Drag and drop handlers for Navigation Links
  const handleNavDragStart = (index: number) => {
    setDraggedNavIndex(index);
  };

  const handleNavDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedNavIndex === null || draggedNavIndex === index) return;

    const newLinks = [...headerData.navLinks];
    const draggedItem = newLinks[draggedNavIndex];
    newLinks.splice(draggedNavIndex, 1);
    newLinks.splice(index, 0, draggedItem);
    setHeaderData({ ...headerData, navLinks: newLinks });
    setDraggedNavIndex(index);
    setHeaderHasChanges(true);
  };

  const handleNavDragEnd = () => {
    setDraggedNavIndex(null);
  };

  // Drag and drop handlers for Social Links
  const handleSocialDragStart = (index: number) => {
    setDraggedSocialIndex(index);
  };

  const handleSocialDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSocialIndex === null || draggedSocialIndex === index) return;

    const newLinks = [...footerData.socialLinks];
    const draggedItem = newLinks[draggedSocialIndex];
    newLinks.splice(draggedSocialIndex, 1);
    newLinks.splice(index, 0, draggedItem);
    setFooterData({ ...footerData, socialLinks: newLinks });
    setDraggedSocialIndex(index);
    setFooterHasChanges(true);
  };

  const handleSocialDragEnd = () => {
    setDraggedSocialIndex(null);
  };

  // Drag and drop handlers for Legal Links
  const handleLegalDragStart = (index: number) => {
    setDraggedLegalIndex(index);
  };

  const handleLegalDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedLegalIndex === null || draggedLegalIndex === index) return;

    const newLinks = [...footerData.legalLinks];
    const draggedItem = newLinks[draggedLegalIndex];
    newLinks.splice(draggedLegalIndex, 1);
    newLinks.splice(index, 0, draggedItem);
    setFooterData({ ...footerData, legalLinks: newLinks });
    setDraggedLegalIndex(index);
    setFooterHasChanges(true);
  };

  const handleLegalDragEnd = () => {
    setDraggedLegalIndex(null);
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <Facebook size={20} />;
      case "linkedin":
        return <Linkedin size={20} />;
      case "instagram":
        return <Instagram size={20} />;
      default:
        return null;
    }
  };

  if (headerSettings === undefined || footerSettings === undefined) {
    return <AdminPageLoader />;
  }

  return (
    <AdminPageLayout
      pageTitle="Header & Footer"
      breadcrumbLabel="Layout Settings"
      backHref="/admin/shared"
      sections={LAYOUT_SECTIONS}
      activeSection={activeSection}
      onSectionChange={(key) => setActiveSection(key as LayoutSectionKey)}
      onSave={handleSave}
      saving={saving}
      hasChanges={
        activeSection === "header" ? headerHasChanges : footerHasChanges
      }
    >
      {activeSection === "header" ? (
        <div className="space-y-6" data-admin-section-key="header">
          {/* Brand Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#3B5249]">Brand</h2>

            {/* Logo Upload */}
            <ImageUploader
              label="Logo"
              storageId={
                headerData.logoStorageId
                  ? (headerData.logoStorageId as Id<"_storage">)
                  : undefined
              }
              alt={headerData.logoAlt}
              onAltChange={(alt) => {
                setHeaderData({ ...headerData, logoAlt: alt });
                setHeaderHasChanges(true);
              }}
              onImageChange={(storageId) => {
                setHeaderData({
                  ...headerData,
                  logoStorageId: storageId,
                  logoUrl: undefined,
                });
                setHeaderHasChanges(true);
              }}
              accept=".svg,image/svg+xml,image/*"
              previewSize={64}
              helpText="SVG files are recommended for best quality. PNG and JPG also supported."
              error={headerErrors.logo}
              altError={headerErrors.logoAlt}
            />
          </div>

          {/* Navigation Links */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-[#3B5249]">
                  Navigation Links
                </h2>
                <p className="text-xs text-[#3B5249]/55">
                  List your nav items. Check "contact link" for the contact
                  link, because of the separate link style.
                </p>
              </div>

              <button
                type="button"
                onClick={addNavLink}
                className="flex items-center gap-1 text-sm text-[#7B6E9E] hover:text-[#3B5249] transition-colors"
              >
                <Plus size={16} />
                Add Link
              </button>
            </div>

            <div className="space-y-3">
              {headerErrors.navLinksGeneral ? (
                <p className="text-xs text-red-600">
                  {headerErrors.navLinksGeneral}
                </p>
              ) : null}
              {headerData.navLinks.map((link, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleNavDragStart(index)}
                  onDragOver={(e) => handleNavDragOver(e, index)}
                  onDragEnd={handleNavDragEnd}
                  className={`flex items-center gap-3 bg-[#FAF6F0] border border-[#D4B483]/20 p-3 rounded-lg transition-all ${draggedNavIndex === index
                    ? "opacity-50 scale-[0.98] shadow-lg"
                    : ""
                    }`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing p-1 text-[#3B5249]/35 hover:text-[#3B5249] transition-colors"
                    title="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </div>

                  <div className="flex-1">
                    <GeneralInput
                      label={undefined}
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) =>
                        updateNavLink(index, "label", e.target.value)
                      }
                      error={headerErrors.navLinks?.[index]?.label}
                    />
                  </div>

                  <div className="flex-1">
                    <GeneralInput
                      label={undefined}
                      placeholder="/path"
                      value={link.href}
                      onChange={(e) =>
                        updateNavLink(index, "href", e.target.value)
                      }
                      error={headerErrors.navLinks?.[index]?.href}
                    />
                  </div>

                  <label className="flex items-center gap-2 px-2 py-1 rounded-md border border-[#D4B483]/25 bg-white">
                    <input
                      type="checkbox"
                      checked={Boolean(link.isContact)}
                      onChange={(e) =>
                        updateNavLink(index, "isContact", e.target.checked)
                      }
                      className="h-4 w-4 text-[#7B6E9E] border-[#D4B483]/35 rounded focus:ring-[#7B6E9E]/30"
                    />
                    <span className="text-xs text-[#3B5249]/80 whitespace-nowrap">
                      contact link
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeNavLink(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "footer" ? (
        <div className="space-y-6" data-admin-section-key="footer">
          {/* Brand Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#3B5249]">Brand</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Brand Name"
                placeholder="Advanced English"
                value={footerData.brandName}
                onChange={(e) => {
                  setFooterData({ ...footerData, brandName: e.target.value });
                  setFooterHasChanges(true);
                }}
                error={footerErrors.brandName}
              />

              <RichTextEditor
                label="Tagline"
                editorKey="footer-tagline"
                value={footerData.tagline}
                onChange={(value) => {
                  setFooterData({ ...footerData, tagline: value });
                  setFooterHasChanges(true);
                }}
                placeholder="Online private English tutoring for advanced learners."
                tools={["bold", "link", "italic"]}
                error={footerErrors.tagline}
              />
            </div>
          </div>

          {/* Column Titles */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-[#3B5249]">
              Column Titles
            </h2>
            <p className="text-sm text-[#3B5249]/55">
              Customize the titles for the footer columns
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <GeneralInput
                label="Contact Column Title"
                placeholder="Contact"
                value={footerData.contactColumnTitle}
                onChange={(e) => {
                  setFooterData({
                    ...footerData,
                    contactColumnTitle: e.target.value,
                  });
                  setFooterHasChanges(true);
                }}
                error={footerErrors.contactColumnTitle}
              />
              <GeneralInput
                label="Legal Column Title"
                placeholder="Legal"
                value={footerData.legalColumnTitle}
                onChange={(e) => {
                  setFooterData({
                    ...footerData,
                    legalColumnTitle: e.target.value,
                  });
                  setFooterHasChanges(true);
                }}
                error={footerErrors.legalColumnTitle}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-[#3B5249]">Contact</h2>

            <GeneralInput
              label="Email Address"
              placeholder="info@linguanna.com"
              value={footerData.email}
              onChange={(e) => {
                setFooterData({ ...footerData, email: e.target.value });
                setFooterHasChanges(true);
              }}
              type="email"
              error={footerErrors.email}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-[#3B5249]">
              Social Media
            </h2>
            <p className="text-sm text-[#3B5249]/55">
              Enable and add URLs for your social media profiles
            </p>

            <div className="space-y-3">
              {footerData.socialLinks.map((social, index) => (
                <div
                  key={social.platform}
                  draggable
                  onDragStart={() => handleSocialDragStart(index)}
                  onDragOver={(e) => handleSocialDragOver(e, index)}
                  onDragEnd={handleSocialDragEnd}
                  className={`flex items-center gap-3 bg-[#FAF6F0] border border-[#D4B483]/20 p-3 rounded-lg transition-all ${draggedSocialIndex === index
                    ? "opacity-50 scale-[0.98] shadow-lg"
                    : ""
                    }`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing p-1 text-[#3B5249]/35 hover:text-[#3B5249] transition-colors"
                    title="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </div>
                  <div className="flex items-center gap-2 w-32">
                    <input
                      type="checkbox"
                      checked={social.enabled}
                      onChange={(e) =>
                        updateSocialLink(
                          social.platform,
                          "enabled",
                          e.target.checked,
                        )
                      }
                      aria-invalid={Boolean(
                        social.enabled &&
                        footerErrors.socialLinks?.[index]?.url,
                      )}
                      className="w-4 h-4 text-[#7B6E9E] border-[#D4B483]/35 rounded focus:ring-[#7B6E9E]/30"
                    />
                    <span className="text-[#3B5249]/70">
                      {getSocialIcon(social.platform)}
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {social.platform}
                    </span>
                  </div>
                  <div className="flex-1">
                    <GeneralInput
                      label={undefined}
                      placeholder={`https://${social.platform}.com/...`}
                      value={social.url}
                      onChange={(e) =>
                        updateSocialLink(social.platform, "url", e.target.value)
                      }
                      type="url"
                      disabled={!social.enabled}
                      error={
                        social.enabled
                          ? footerErrors.socialLinks?.[index]?.url
                          : undefined
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#3B5249]">
                Legal Links
              </h2>
              <button
                type="button"
                onClick={addLegalLink}
                className="flex items-center gap-1 text-sm text-[#7B6E9E] hover:text-[#3B5249] transition-colors"
              >
                <Plus size={16} />
                Add Link
              </button>
            </div>

            <div className="space-y-3">
              {footerErrors.legalLinksGeneral ? (
                <p className="text-xs text-red-600">
                  {footerErrors.legalLinksGeneral}
                </p>
              ) : null}
              {footerData.legalLinks.map((link, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleLegalDragStart(index)}
                  onDragOver={(e) => handleLegalDragOver(e, index)}
                  onDragEnd={handleLegalDragEnd}
                  className={`flex items-center gap-3 bg-[#FAF6F0] border border-[#D4B483]/20 p-3 rounded-lg transition-all ${draggedLegalIndex === index
                    ? "opacity-50 scale-[0.98] shadow-lg"
                    : ""
                    }`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing p-1 text-[#3B5249]/35 hover:text-[#3B5249] transition-colors"
                    title="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1">
                    <GeneralInput
                      label={undefined}
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) =>
                        updateLegalLink(index, "label", e.target.value)
                      }
                      error={footerErrors.legalLinks?.[index]?.label}
                    />
                  </div>
                  <div className="flex-1">
                    <GeneralInput
                      label={undefined}
                      placeholder="/privacy or https://..."
                      value={link.url}
                      onChange={(e) =>
                        updateLegalLink(index, "url", e.target.value)
                      }
                      error={footerErrors.legalLinks?.[index]?.url}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLegalLink(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-[#3B5249]">Copyright</h2>
            <div className="flex-1">
              <GeneralInput
                label="Copyright Text"
                placeholder="2026 Advanced English. All rights reserved."
                value={footerData.copyrightText}
                onChange={(e) => {
                  setFooterData({
                    ...footerData,
                    copyrightText: e.target.value,
                  });
                  setFooterHasChanges(true);
                }}
                error={footerErrors.copyrightText}
              />
              <p className="text-xs mt-2 text-[#3B5249]/55 flex gap-1 items-center">
                <span>The</span> <Copyright size={14} />
                <span>
                  symbol will be automatically added before your text.
                </span>
                <span>
                  Write {"{year}"} anywhere in the title to insert the current
                  year.
                </span>
              </p>
              <p className="text-xs mt-2 text-[#3B5249]/55 flex gap-1 items-center"></p>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}
