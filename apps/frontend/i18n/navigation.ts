import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Typed, locale-aware navigation helpers. Use these instead of
// `next/link` and `next/navigation` for all app-internal links/redirects.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);