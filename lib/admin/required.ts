export const REQUIRED_MESSAGE = "Please fill out this field";

export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isBlankHtml(value: unknown): boolean {
  if (typeof value !== "string") return true;

  // Remove tags + whitespace + non-breaking spaces.
  const text = value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length === 0;
}

export function requiredError(value: unknown, html = false): string | undefined {
  const empty = html ? isBlankHtml(value) : isBlank(value);
  return empty ? REQUIRED_MESSAGE : undefined;
}
