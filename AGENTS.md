# LinguAnna – Admin Panel

CMS/admin panel for managing all website content.
**Related project**: `../final-linguanna` (public-facing site sharing the same Convex deployment).

## Dev Commands

```bash
pnpm dev          # webpack dev server → http://localhost:3004
pnpm dev:turbo    # turbopack (faster)
pnpm build        # production build
pnpm lint         # ESLint
```

> **Package manager: pnpm only.** Do not use npm or yarn.

## Tech Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js 16 (App Router)                                      |
| UI        | React 18, Tailwind CSS 3, Radix UI, Lucide React             |
| Backend   | Convex 1.31 (same deployment as frontend)                    |
| Auth      | Convex Auth – OTP via email (admin only: `role === "admin"`) |

## Architecture Overview

```
app/
  admin/            All admin routes (protected)
    layout.tsx      Auth guard + sidebar navigation
    page.tsx        Login page
    blog/           Blog post management
    language/       Language-specific content editing
    messages/       Contact form submissions inbox
    pages/          Page content editors
    shared/         Shared content editors (services, testimonials, values, credentials)
components/admin/   Reusable admin UI components
lib/admin/          Admin utility functions
```

## Auth & Authorization

The admin layout (`app/admin/layout.tsx`) checks `api.users.currentLoggedInUser`. If `user === null`, it renders the login form or a redirect message. If `user` is logged in but not an admin, content is blocked.

All Convex mutations that modify data call `requireAdmin()` internally — no client-side role check is sufficient on its own.

**The only admin user is Anna** (role `"admin"` set directly in the Convex `users` table).

## Key Components

| Component                | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `AdminConfirmProvider`   | Global confirmation modal context                  |
| `UnsavedChangesProvider` | Tracks unsaved edits; shows corner hint            |
| `AdminLanguageProvider`  | Active editing language context (`"en"` \| `"hu"`) |
| `AdminLanguageGate`      | Guards content sections by language                |
| `AdminSectionNav`        | In-page section navigation                         |
| `AdminPageLayout`        | Standard page layout wrapper with save button      |
| `CTA`                    | Reusable save/cancel action buttons                |

## Convex Usage in Admin

The admin **does NOT use** the `useCachedConvexQuery` hook from the frontend.  
It uses `useQuery` directly from `convex/react` for real-time reactive data.

```ts
import { useQuery, useMutation } from "convex/react";
const data = useQuery(api.module.functionName, { args });
const save = useMutation(api.module.mutationName);
```

## Content Editing Conventions

- All content tables support `lang: "en" | "hu"`. The `AdminLanguageProvider` tracks which language is being edited.
- When saving multilingual content, always include `lang` in the mutation args.
- `order` fields use numeric ordering; reorder helpers exist in admin components.
- Blog posts use markdown (`content` field).

## Admin Sections

| Route             | Manages                                                     |
| ----------------- | ----------------------------------------------------------- |
| `/admin/pages`    | Homepage, About, Services, How-to-work-with-me page content |
| `/admin/blog`     | Blog posts and categories                                   |
| `/admin/shared`   | Services, testimonials, values, credentials                 |
| `/admin/messages` | Contact form inbox (read/archive)                           |
| `/admin/language` | Language-specific content                                   |

## Required Environment Variables

```
NEXT_PUBLIC_CONVEX_URL=       # Same Convex deployment as frontend
NEXT_PUBLIC_SITE_URL=http://localhost:3003   # Frontend URL (for links)
```

## Gotchas

- The admin and frontend share **the same Convex deployment** — schema changes affect both.
- Admin uses `useQuery` (not `useCachedConvexQuery`); the cache hook is frontend-only.
- `typescript.ignoreBuildErrors` is not set here — TypeScript errors **will** fail builds.
- Adding a new admin user requires setting `role: "admin"` directly in the Convex dashboard or via a one-time mutation.
- The `UnsavedChangesProvider` prevents accidental navigation away — always resolve pending saves before redirecting.
