import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Only English for now — add more locales here later (e.g. "ar", "es").
  // With `localePrefix: "as-needed"` the default locale (en) keeps clean
  // unprefixed URLs ("/login"), while future locales get prefixed ones
  // ("/ar/login").
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});