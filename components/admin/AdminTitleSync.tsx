"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function toTitleCaseSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAdminTabTitle(pathname: string) {
  // Always English titles, derived from the current route.
  if (!pathname.startsWith("/admin")) return "Advanced English";

  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/messages")
    return "Messages";
  if (pathname === "/admin/language")
    return "Language";

  if (pathname === "/admin/blog") return "Posts";
  if (pathname === "/admin/blog/new")
    return "New Post";
  if (pathname.startsWith("/admin/blog/"))
    return "Edit Post";
  if (pathname === "/admin/pages") return "Pages";
  if (pathname.startsWith("/admin/pages/")) {
    const slug = pathname.replace("/admin/pages/", "").split("/")[0] ?? "";
    const label = slug ? toTitleCaseSlug(slug) : "Page";
    return `Pages: ${label}`;
  }

  if (pathname === "/admin/shared")
    return "Shared Content";
  if (pathname.startsWith("/admin/shared/")) {
    const slug = pathname.replace("/admin/shared/", "").split("/")[0] ?? "";
    const label = slug ? toTitleCaseSlug(slug) : "Shared";
    return `Shared: ${label}`;
  }

  return "Admin | Advanced English";
}

export function AdminTitleSync() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = getAdminTabTitle(pathname);
  }, [pathname]);

  return null;
}
