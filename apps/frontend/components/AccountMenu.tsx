"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogOut, ChevronDown, Film, Settings } from "lucide-react";
import type { UserProfile } from "@watchstash/types";

const DEFAULT_AVATAR_SRC: string | null = null;

function initialsFor(user: UserProfile | null): string {
  if (!user) return "?";
  const source = user.displayName || user.username || "?";
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || source.slice(0, 1).toUpperCase()
  );
}

export function AccountMenu({
  user,
  onLogout,
}: {
  user: UserProfile | null;
  onLogout: () => void;
}) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFirstOnOpen = useRef(false);
  const menuId = useId();

  const displayName = user?.displayName || user?.username || "Account";
  const avatarUrl = user?.avatarUrl || DEFAULT_AVATAR_SRC;

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;

    if (focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      getMenuItems()[0]?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function getMenuItems(): HTMLElement[] {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
      ),
    );
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    focusFirstOnOpen.current = true;
    setOpen(true);
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      // Let focus move before the menu unmounts.
      window.setTimeout(() => setOpen(false), 0);
      return;
    }

    const items = getMenuItems();
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        break;
      case "ArrowUp":
        nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={tNav("accountMenu")}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className={`group flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          open
            ? "border-accent/40 bg-white/[0.06]"
            : "border-border/80 bg-white/[0.03] hover:border-border-hover hover:bg-white/[0.06]"
        }`}
      >
        {avatarUrl && !avatarFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className={`h-8 w-8 rounded-full object-cover ring-2 transition-shadow ${
              open ? "ring-accent/40" : "ring-transparent group-hover:ring-white/10"
            }`}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span
            aria-hidden
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent ring-2 transition-shadow ${
              open ? "ring-accent/40" : "ring-transparent group-hover:ring-white/10"
            }`}
          >
            {initialsFor(user)}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-primary md:inline">
          {displayName}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "rotate-180 text-secondary" : "text-muted"
          }`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={tNav("accountMenu")}
          onKeyDown={handleMenuKeyDown}
          className="animate-menu-in absolute right-0 z-30 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40"
        >
          <div className="bg-gradient-to-b from-white/[0.06] to-transparent px-3.5 py-3">
            <p className="truncate text-sm font-medium text-primary">{displayName}</p>
            {user?.username && (
              <p className="truncate text-xs text-muted">@{user.username}</p>
            )}
          </div>

          <div role="separator" className="border-t border-border/70" />

          <div className="p-1">
            <Link
              href="/app/tracker"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-secondary transition-colors hover:bg-white/[0.06] hover:text-primary focus-visible:bg-white/[0.06] focus-visible:text-primary focus-visible:outline-none"
            >
              <Film aria-hidden className="h-4 w-4" />
              {tNav("tracker")}
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled
              aria-disabled="true"
              className="flex h-9 w-full cursor-not-allowed items-center justify-between gap-3 rounded-lg px-2.5 text-sm text-muted/60"
            >
              <span className="flex items-center gap-2.5">
                <Settings aria-hidden className="h-4 w-4" />
                {tNav("settings")}
              </span>
              <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted/70">
                {tCommon("comingSoon")}
              </span>
            </button>
          </div>

          <div role="separator" className="border-t border-border/70" />

          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              {tCommon("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
