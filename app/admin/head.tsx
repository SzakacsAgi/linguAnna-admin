import { cookies } from "next/headers";

async function getAdminLanguageFromCookie(): Promise<"en" | "hu"> {
  const store = await cookies();
  const raw = store.get("adminLanguage")?.value;
  return raw === "hu" ? "hu" : "en";
}

export default async function Head() {
  const lang = await getAdminLanguageFromCookie();
  const iconBase = lang === "hu" ? "/favicon-hu.svg" : "/favicon-en.svg";
  const iconHref = `${iconBase}?v=${lang}`;

  return (
    <>
      <link rel="icon" href={iconHref} type="image/svg+xml" />
      <link rel="shortcut icon" href={iconHref} type="image/svg+xml" />
      <link rel="apple-touch-icon" href={iconHref} type="image/svg+xml" />
    </>
  );
}
