"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const MOBILE_QUERY = "(max-width: 639px)";

/**
 * Mobile gate for the authenticated tracker.
 *
 * Mounted from `app/[locale]/app/layout.tsx`, so it only ever covers `/app/*`.
 * Public pages (landing, login, privacy, terms) render normally on phones.
 *
 * - Renders null until mounted (hydration-safe, no SSR flash on desktop).
 * - Listens to viewport changes (rotation/resize) via matchMedia, so a
 *   phone rotated to a wide enough viewport (or resized) unlocks the tracker.
 * - Always offers a link back to the landing page.
 * - CSS `sm:hidden` is a defensive guard on top of the JS check.
 */
export function MobileGate() {
  const t = useTranslations("mobileGate");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia(MOBILE_QUERY);
    } catch {
      return; // No matchMedia support — never block.
    }

    const update = () => setIsMobile(mq?.matches ?? false);
    const onChange = () => update();

    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onChange); // Safari < 14 fallback
    }

    return () => {
      if (typeof mq?.removeEventListener === "function") {
        mq.removeEventListener("change", onChange);
      } else if (typeof mq?.removeListener === "function") {
        mq.removeListener(onChange);
      }
    };
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-canvas sm:hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="animate-drift absolute -top-40 left-0 right-0 mx-auto h-[420px] w-[640px] max-w-full glow-amber blur-3xl" />
        <div
          className="animate-drift absolute -right-24 bottom-[-12%] h-[400px] w-[520px] glow-violet blur-3xl"
          style={{ animationDelay: "-9s", animationDuration: "28s" }}
        />
      </div>

      <main className="relative flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
          <Smartphone className="h-8 w-8 text-accent" />
        </span>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-primary">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-secondary">
          {t("body")}
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-canvas shadow-[0_0_30px_rgba(245,158,11,0.22)] transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backHome")}
        </Link>
      </main>
    </div>
  );
}