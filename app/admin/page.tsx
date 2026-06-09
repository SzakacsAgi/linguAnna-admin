"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  BookOpen,
  Star,
  Heart,
  Award,
  ArrowRight,
  Mail,
} from "lucide-react";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";
import AdminPageLoader from "@/components/admin/AdminPageLoader";

// Login component
function AdminLogin() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("resend-otp", formData);
      setEmail(formData.get("email") as string);
      setStep("code");
    } catch (err) {
      setError("Failed to send verification code. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("resend-otp", formData);
    } catch (err) {
      setError("Invalid verification code. Please try again.");
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FAF6F0] px-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#7B6E9E]/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#D4B483]/15" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/95 rounded-[1.75rem] border border-[#D4B483]/25 shadow-[0_16px_40px_rgba(59,82,73,0.12)] overflow-hidden">
          <div className="h-1.5 w-full bg-[#7B6E9E]" />

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="bg-[#7B6E9E]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-[#7B6E9E]" size={30} />
              </div>
              <h1 className="text-3xl font-medium text-[#3B5249] tracking-tight [font-family:Georgia,serif]">
                Admin Login
              </h1>
              <p className="text-[#3B5249]/65 mt-2 text-sm leading-relaxed">
                {step === "email"
                  ? "Enter your email to receive a verification code"
                  : "Enter the code sent to your email"}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-200">
                {error}
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#68582E]/75 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#FAF6F0] border border-[#D4B483]/30 rounded-xl text-[#3B5249] placeholder:text-[#3B5249]/35 focus:outline-none focus:ring-2 focus:ring-[#7B6E9E]/25 focus:border-[#7B6E9E]"
                    placeholder="email@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3B5249] text-[#FAF6F0] py-3.5 rounded-full font-semibold hover:bg-[#7B6E9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCodeSubmit} className="space-y-5">
                <input type="hidden" name="email" value={email} />
                <div>
                  <label
                    htmlFor="code"
                    className="block text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#68582E]/75 mb-2"
                  >
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#FAF6F0] border border-[#D4B483]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B6E9E]/25 focus:border-[#7B6E9E] text-center text-2xl tracking-widest text-[#3B5249]"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3B5249] text-[#FAF6F0] py-3.5 rounded-full font-semibold hover:bg-[#7B6E9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="w-full text-[#3B5249]/65 py-2 hover:text-[#3B5249] transition-colors"
                >
                  ← Back to email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard component
function AdminDashboard() {
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
  const blogPosts = useQuery(api.admin.getBlogPostsAdmin, {
    lang: language ?? undefined,
  });
  const unreadCount = useQuery(api.admin.getUnreadCount);

  const stats = [
    {
      label: "Services",
      value: services?.length ?? 0,
      icon: Award,
      href: "/admin/shared/services",
      iconBg: "bg-[#7B6E9E]/12",
      iconColor: "text-[#7B6E9E]",
    },
    {
      label: "Testimonials",
      value: testimonials?.length ?? 0,
      icon: Star,
      href: "/admin/pages/home?section=testimonial_section",
      iconBg: "bg-[#D4B483]/18",
      iconColor: "text-[#68582E]",
    },
    {
      label: "Values",
      value: values?.length ?? 0,
      icon: Heart,
      href: "/admin/shared/values",
      iconBg: "bg-[#3B5249]/12",
      iconColor: "text-[#3B5249]",
    },
    {
      label: "Blog Posts",
      value: blogPosts?.length ?? 0,
      icon: FileText,
      href: "/admin/blog",
      iconBg: "bg-[#68582E]/12",
      iconColor: "text-[#68582E]",
    },
    {
      label: "Unread Messages",
      value: unreadCount ?? 0,
      icon: MessageSquare,
      href: "/admin/messages",
      iconBg: "bg-[#7B6E9E]/16",
      iconColor: "text-[#7B6E9E]",
    },
  ];

  const quickLinks = [
    { label: "Edit Home Page", href: "/admin/pages/home", icon: FileText },
    { label: "Edit About Page", href: "/admin/pages/about", icon: FileText },
    {
      label: "Edit Services Page",
      href: "/admin/pages/services",
      icon: FileText,
    },
    { label: "Manage Blog Posts", href: "/admin/blog", icon: BookOpen },
    { label: "View Messages", href: "/admin/messages", icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-[1.5px] bg-[#D4B483]" />
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#D4B483]">
            Admin Home
          </span>
        </div>
        <h1 className="text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
          Dashboard
        </h1>
        <p className="text-[#3B5249]/65 mt-2">
          Welcome back! Here's an overview of your website content.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-white rounded-2xl p-6 border border-[#D4B483]/20 shadow-sm hover:shadow-[0_10px_26px_rgba(59,82,73,0.1)] hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}
              >
                <Icon className={stat.iconColor} size={22} />
              </div>
              <p className="text-3xl font-bold text-[#3B5249]">{stat.value}</p>
              <p className="text-[#3B5249]/65 text-sm mt-1 group-hover:text-[#3B5249] transition-colors">
                {stat.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6">
        <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249] mb-4">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-4 border border-[#D4B483]/20 rounded-xl hover:border-[#7B6E9E]/40 hover:bg-[#7B6E9E]/5 transition-colors group"
              >
                <Icon
                  className="text-[#3B5249]/45 group-hover:text-[#7B6E9E]"
                  size={20}
                />
                <span className="font-medium text-[#3B5249]/80 group-hover:text-[#7B6E9E]">
                  {link.label}
                </span>
                <ArrowRight
                  className="ml-auto text-[#3B5249]/40 group-hover:text-[#7B6E9E]"
                  size={16}
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Messages Preview */}
      {unreadCount !== undefined && unreadCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
              Unread Messages
            </h2>
            <Link
              href="/admin/messages"
              className="text-[#7B6E9E] hover:underline text-sm"
            >
              View all →
            </Link>
          </div>
          <p className="text-[#3B5249]/65">
            You have{" "}
            <span className="font-semibold text-[#7B6E9E]">{unreadCount}</span>{" "}
            unread message{unreadCount !== 1 ? "s" : ""}.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const user = useQuery(api.users.currentLoggedInUser);
  const { language } = useAdminLanguage();

  // Show login if not authenticated
  if (user === null) {
    return <AdminLogin />;
  } else if (language === null) {
    // window.location.href = "/admin/language";
    return null;
  } else if (language === undefined) {
    return <AdminPageLoader />;
  } else
    // Show dashboard if authenticated (layout handles admin check)
    return <AdminDashboard />;
}
