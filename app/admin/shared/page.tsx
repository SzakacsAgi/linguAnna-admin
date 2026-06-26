"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import {
  Award,
  Heart,
  ArrowRight,
  MessageSquare,
  Layout,
  Star,
} from "lucide-react";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

export default function SharedContentPage() {
  const { language } = useAdminLanguage();

  const services = useQuery(api.admin.getServicesAdmin, {
    lang: language ?? undefined,
  });
  const testimonials = useQuery(api.admin.getTestimonialsAdmin, {
    lang: language ?? undefined,
  });
  const values = useQuery(api.admin.getValuesAdmin, {
    lang: language ?? undefined,
  });

  const contentTypes = [
    {
      title: "Services",
      description: "Service cards that appear on Home and Services pages",
      icon: Award,
      href: "/admin/shared/services",
      count: services?.length ?? 0,
      color: "bg-[#7B6E9E]/10",
      usedOn: ["Home", "Services"],
    },
    {
      title: "Testimonials",
      description: "Student reviews that appear on Home and About pages",
      icon: Star,
      href: "/admin/shared/testimonials",
      count: testimonials?.length ?? 0,
      color: "bg-[#7B6E9E]/10",
      usedOn: ["Home", "Hungarian coaching"],
    },
    {
      title: "Values",
      description: "Your values as a tutor, shown on Home and About pages",
      icon: Heart,
      href: "/admin/shared/values",
      count: values?.length ?? 0,
      color: "bg-[#3B5249]/12",
      usedOn: ["Home", "About"],
    },
    {
      title: "Contact Form",
      description:
        "Customize labels, placeholders, error messages, and options",
      icon: MessageSquare,
      href: "/admin/shared/contact-form",
      count: null,
      color: "bg-[#68582E]/12",
      usedOn: ["Home", "Contact"],
    },
    {
      title: "Header & Footer",
      description:
        "Edit navigation links, social media, contact info, and legal links",
      icon: Layout,
      href: "/admin/shared/layout-settings",
      count: null,
      color: "bg-[#7B6E9E]/14",
      usedOn: ["All"],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-[1.5px] bg-[#D4B483]" />
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#D4B483]">
            Shared Assets
          </span>
        </div>
        <h1 className="text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
          Shared Content
        </h1>
        <p className="text-[#3B5249]/65 mt-2">
          Edit content that appears on multiple pages. Changes here will
          automatically update everywhere.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {contentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Link
              key={type.href}
              href={type.href}
              className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6 hover:shadow-[0_10px_26px_rgba(59,82,73,0.1)] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${type.color} w-12 h-12 rounded-xl border border-[#7B6E9E]/15 flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="text-[#7B6E9E]" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#3B5249] group-hover:text-[#7B6E9E] transition-colors">
                      {type.title}
                    </h2>
                    <ArrowRight
                      className="text-[#3B5249]/35 group-hover:text-[#7B6E9E] transition-colors"
                      size={20}
                    />
                  </div>
                  <p className="text-[#3B5249]/65 text-sm mt-1">
                    {type.description}
                  </p>
                  {type.count !== null && (
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-2xl font-bold text-[#3B5249]">
                        {type.count}
                      </span>
                      <span className="text-[#3B5249]/55 text-sm">items</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {type.usedOn.map((page) => (
                      <span
                        key={page}
                        className="text-xs bg-[#FAF6F0] text-[#68582E]/80 px-2 py-1 rounded-md border border-[#D4B483]/20"
                      >
                        {page} page
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
          💡 How shared content works
        </h3>
        <p className="text-[#3B5249]/85 text-sm leading-relaxed">
          When you edit a service, testimonial, value, or credential here, it
          automatically updates everywhere that content appears on your website.
          For example, editing "General English Classes" will update both the
          preview card on the Home page and the detailed view on the Services
          page.
        </p>
      </div>
    </div>
  );
}
