"use client";

import Link from "next/link";
import {
  Home,
  User,
  BookOpen,
  HelpCircle,
  Mail,
  ArrowRight,
  PenTool,
  FileText,
  TriangleAlert,
} from "lucide-react";

export default function PagesAdminPage() {
  const pages = [
    {
      title: "Home",
      description:
        "Hero section, credentials, values, services preview, testimonials, and contact form",
      icon: Home,
      href: "/admin/pages/home",
      sections: [
        "Intoduction",
        "Credentials",
        "Values",
        "Services",
        "Testimonials",
        "Contact Form",
      ],
    },
    {
      title: "About",
      description: "Your story, qualifications, values, and testimonials",
      icon: User,
      href: "/admin/pages/about",
      sections: ["Hero", "Story Sections", "Values", "Testimonials", "CTA"],
    },
    {
      title: "Services",
      description: "Service overview and detailed descriptions",
      icon: BookOpen,
      href: "/admin/pages/services",
      sections: ["Hero", "CTA", "Others"],
    },
    {
      title: "Hungarian Coaching",
      description: "Step-by-step guide for new students",
      icon: HelpCircle,
      href: "/admin/pages/hungarian-coaching",
      sections: ["Hero", "Steps", "CTA"],
    },
    {
      title: "Contact",
      description: "Contact page hero section",
      icon: Mail,
      href: "/admin/pages/contact",
      sections: ["Hero"],
    },
    {
      title: "Blog",
      description: "Edit the Blog page (hero, categories, CTA)",
      icon: PenTool,
      href: "/admin/pages/blog",
      sections: ["Hero", "Categories", "CTA"],
    },
    {
      title: "Article",
      description: "Edit the blog article page (banner + CTA)",
      icon: FileText,
      href: "/admin/pages/article",
      sections: ["Banner", "CTA"],
    },
    {
      title: "Not found",
      description: "Edit the 404 page (CTA + explore links)",
      icon: TriangleAlert,
      href: "/admin/pages/not-found",
      sections: ["CTA", "Explore more", "Links"],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-[1.5px] bg-[#D4B483]" />
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#D4B483]">
            Content Map
          </span>
        </div>
        <h1 className="text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
          Pages
        </h1>
        <p className="text-[#3B5249]/65 mt-2">
          Edit content for each page of your website. Click on a page to edit
          its sections.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {pages.map((page) => {
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 hover:shadow-[0_10px_26px_rgba(59,82,73,0.1)] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
            >
              <div className="flex items-start gap-4">
                <div className="bg-[#7B6E9E]/10 p-3 rounded-xl border border-[#7B6E9E]/20">
                  <Icon className="text-[#7B6E9E]" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#3B5249] group-hover:text-[#7B6E9E] transition-colors">
                      {page.title}
                    </h2>
                    <ArrowRight
                      className="text-[#3B5249]/35 group-hover:text-[#7B6E9E] transition-colors"
                      size={20}
                    />
                  </div>
                  <p className="text-[#3B5249]/65 text-sm mt-1">
                    {page.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {page.sections?.map((section) => (
                      <span
                        key={section}
                        className="text-xs bg-[#FAF6F0] text-[#68582E]/80 px-2 py-1 rounded-md border border-[#D4B483]/20"
                      >
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-[#7B6E9E]/8 border border-[#7B6E9E]/25 rounded-2xl p-6">
        <h3 className="font-semibold text-[#7B6E9E] mb-2">
          💡 About page editing
        </h3>
        <p className="text-[#3B5249]/85 text-sm leading-relaxed">
          Each page has multiple sections you can edit. Some sections use shared
          content (like Services, Testimonials, and Values) which you can manage
          in the{" "}
          <Link
            href="/admin/shared"
            className="underline hover:no-underline text-[#7B6E9E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45 rounded-sm"
          >
            Shared Content
          </Link>{" "}
          section. Changes to shared content will automatically appear on all
          pages that use it.
        </p>
      </div>
    </div>
  );
}
