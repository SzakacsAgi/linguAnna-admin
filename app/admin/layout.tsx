"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  LogOut,
  BookOpen,
  Menu,
  X,
  PenToolIcon,
  Languages,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { AdminConfirmProvider } from "@/components/admin/AdminConfirmProvider";
import {
  AdminLanguageProvider,
  useAdminLanguage,
} from "@/components/admin/language/AdminLanguageProvider";
import { AdminLanguageGate } from "@/components/admin/language/AdminLanguageGate";
import { ADMIN_LANGUAGES } from "@/components/admin/language/adminLanguage";
import { AdminFaviconAndTitleSync } from "@/components/admin/AdminFaviconAndTitleSync";
import { AdminTitleSync } from "@/components/admin/AdminTitleSync";
import { UnsavedChangesProvider } from "@/components/admin/UnsavedChangesProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useQuery(api.users.currentLoggedInUser);
  const unreadCount = useQuery(api.admin.getUnreadCount);
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B6E9E] mx-auto mb-4"></div>
          <p className="text-[#3B5249]/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login page on /admin, redirect message on other pages
  if (user === null) {
    // If we're on the main admin page, show the login form (children)
    if (pathname === "/admin") {
      return (
        <AdminLanguageProvider>
          <UnsavedChangesProvider>
            <AdminFaviconAndTitleSync />
            <AdminTitleSync />
            {children}
          </UnsavedChangesProvider>
        </AdminLanguageProvider>
      );
    }

    // Otherwise, show a message to go to login
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl border border-[#D4B483]/25 shadow-[0_12px_30px_rgba(59,82,73,0.1)] p-8">
            <div className="bg-[#7B6E9E]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-[#7B6E9E]" />
            </div>
            <h1 className="text-2xl font-bold text-[#3B5249] mb-2">
              Login Required
            </h1>
            <p className="text-[#3B5249]/70 mb-6">
              You need to log in to access the admin panel.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-[#3B5249] text-[#FAF6F0] px-6 py-3 rounded-full font-semibold hover:bg-[#7B6E9E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not admin - show access denied
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <div className="text-center max-w-md p-8">
          <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <X size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#3B5249] mb-2">
            Access Denied
          </h1>
          <p className="text-[#3B5249]/70 mb-6">
            You don&apos;t have permission to access the admin panel. Please contact
            the administrator.
          </p>
          <button
            onClick={() => signOut()}
            className="bg-[#3B5249] text-[#FAF6F0] px-6 py-2 rounded-full hover:bg-[#7B6E9E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLanguageProvider>
      <UnsavedChangesProvider>
        <AdminLayoutShell
          user={user}
          unreadCount={unreadCount}
          pathname={pathname}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          signOut={signOut}
        >
          {children}
        </AdminLayoutShell>
      </UnsavedChangesProvider>
    </AdminLanguageProvider>
  );
}

function AdminLayoutShell({
  user,
  unreadCount,
  pathname,
  sidebarOpen,
  setSidebarOpen,
  signOut,
  children,
}: {
  user: NonNullable<
    ReturnType<typeof useQuery<typeof api.users.currentLoggedInUser>>
  >;
  unreadCount: ReturnType<typeof useQuery<typeof api.admin.getUnreadCount>>;
  pathname: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  signOut: () => void;
  children: React.ReactNode;
}) {
  const { language } = useAdminLanguage();
  const router = useRouter();
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(
    null,
  );
  const hasNavigationSettled = (target: string, currentPath: string) => {
    if (target === "/admin") return currentPath === "/admin";
    return currentPath === target || currentPath.startsWith(`${target}/`);
  };

  const isNavigating = Boolean(
    navigatingTarget && !hasNavigationSettled(navigatingTarget, pathname),
  );

  const languageLabel =
    language &&
    (ADMIN_LANGUAGES.find((l) => l.code === language)?.label ??
      language.toUpperCase());

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/pages", label: "Pages", icon: FileText },
    { href: "/admin/shared", label: "Shared Content", icon: BookOpen },
    { href: "/admin/blog", label: "Posts", icon: PenToolIcon },
    { href: "/admin/language", label: "Language", icon: Languages },

    {
      href: "/admin/messages",
      label: "Messages",
      icon: MessageSquare,
      badge: unreadCount,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  if (pathname === "/admin/language") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <AdminFaviconAndTitleSync />
        <AdminTitleSync />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)_/_0.14),transparent_45%),radial-gradient(circle_at_80%_30%,hsl(var(--secondary)_/_0.12),transparent_50%),radial-gradient(circle_at_40%_85%,hsl(var(--accent)_/_0.12),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,hsl(var(--foreground)_/_0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)_/_0.35)_1px,transparent_1px)] [background-size:72px_72px]" />

        <main className="relative min-h-screen px-4 py-10 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <div className="bg-card/80 text-card-foreground backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8">
              <AdminConfirmProvider>{children}</AdminConfirmProvider>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <AdminFaviconAndTitleSync />
      <AdminTitleSync />
      <AdminLanguageGate>
        {isNavigating ? (
          <div className="fixed bottom-6 right-6 z-[60]">
            <div className="flex items-center gap-3 rounded-full bg-white shadow-lg px-4 py-2 border border-[#D4B483]/25">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4B483]/50 border-t-[#7B6E9E]" />
              <span className="text-sm text-[#3B5249]/80">Loading…</span>
            </div>
          </div>
        ) : null}
        {/* Mobile header */}
        <div className="lg:hidden bg-[#FAF6F0]/95 backdrop-blur border-b border-[#D4B483]/25 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <Link href="/admin" className="flex items-center">
            <Image
              src="/linguaAnna-logo.png"
              alt="Lingua Anna Logo"
              width={130}
              height={130}
              className="object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-[#3B5249] hover:bg-[#7B6E9E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-[#FAF6F0] border-r border-[#D4B483]/25 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="p-6 border-b border-[#D4B483]/25">
            <Link href="/admin" className="flex items-center gap-1.5">
              <Image
                src="/linguaAnna-logo.png"
                alt="Lingua Anna Logo"
                width={130}
                height={130}
                className="object-contain"
              />
              <span className="font-bold text-lg text-[#3B5249]">Admin</span>
            </Link>
            {languageLabel ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#7B6E9E]/10 text-[#3B5249] text-xs px-3 py-1 border border-[#7B6E9E]/20">
                <Languages size={14} />
                <span>{languageLabel}</span>
              </div>
            ) : null}
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => {
                    router.prefetch(item.href);
                  }}
                  onClick={() => {
                    setSidebarOpen(false);
                    if (!active) setNavigatingTarget(item.href);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45 ${active
                    ? "bg-[#3B5249] text-[#FAF6F0]"
                    : "text-[#3B5249]/80 hover:bg-white"
                    }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-auto text-xs px-2 py-0.5 rounded-full ${active ? "bg-white text-[#3B5249]" : "bg-[#7B6E9E] text-[#FAF6F0]"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#D4B483]/25 bg-[#FAF6F0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#7B6E9E]/10 rounded-full flex items-center justify-center">
                <span className="text-[#7B6E9E] font-semibold">
                  {user.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#3B5249] truncate">
                  {user.name || "Admin"}
                </p>
                <p className="text-sm text-[#3B5249]/60 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 w-full px-4 py-2 text-[#3B5249]/80 hover:bg-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:ml-64 min-h-screen">
          <div className="p-6 lg:p-8">
            <AdminConfirmProvider>{children}</AdminConfirmProvider>
          </div>
        </main>
      </AdminLanguageGate>
    </div>
  );
}
