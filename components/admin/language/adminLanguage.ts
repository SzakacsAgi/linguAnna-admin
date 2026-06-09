export type AdminLanguage = "en" | "hu";

export const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = "en";

export const ADMIN_LANGUAGES: Array<{ code: AdminLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "hu", label: "Magyar" },
];

export const ADMIN_LANGUAGE_STORAGE_KEY = "adminLanguage";

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "en" || value === "hu";
}
