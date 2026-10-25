"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/app", labelKey: "discover" },
  { href: "/app/tracker", labelKey: "tracker" },
] as const;

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-border bg-canvas/90 shadow-lg shadow-black/25"
          : "border-border/70 bg-canvas/70"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/app"
          aria-label="WatchStash home"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <Image
            src="/512×512_icon.png"
            alt=""
            width={32}
            height={32}
            className="rounded-lg ring-1 ring-white/10 transition-[filter,box-shadow] duration-200 group-hover:brightness-110 group-hover:ring-white/20"
            priority
          />
          <span className="hidden text-[17px] font-bold tracking-tight text-primary sm:inline">
            WatchStash<span className="text-accent">.</span>
          </span>
        </Link>

        <nav
          aria-label={t("primary")}
          className="flex items-center gap-1 sm:ml-2"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:px-3 sm:text-sm ${
                  isActive
                    ? "bg-white/[0.06] text-primary after:absolute after:inset-x-3 after:-bottom-2.5 after:h-0.5 after:rounded-full after:bg-accent"
                    : "text-secondary hover:bg-white/[0.04] hover:text-primary"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center">
          <AccountMenu user={user} onLogout={logout} />
        </div>
      </div>
    </header>
  );
}
