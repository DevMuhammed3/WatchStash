"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LogOut, ChevronDown, Film, Settings } from "lucide-react";
import type { UserProfile } from "@watchstash/types";

const DEFAULT_AVATAR_SRC: string | null = null;

function initialsFor(user: UserProfile): string {
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const displayName = user?.displayName || user?.username || "Account";
  const avatarUrl = user?.avatarUrl || DEFAULT_AVATAR_SRC;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1 transition-colors hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {initialsFor(user as UserProfile)}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-primary sm:inline">
          {displayName}
        </span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-primary">{displayName}</p>
            <p className="truncate text-xs text-muted">{user?.username}</p>
          </div>
          <div className="border-t border-border py-1">
            <Link
              href="/app/tracker"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-10 items-center gap-3 px-3 text-sm text-secondary transition-colors hover:bg-canvas hover:text-primary focus-visible:bg-canvas focus-visible:outline-none"
            >
              <Film className="h-4 w-4" />
              My Tracker
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled
              aria-disabled="true"
              className="flex h-10 w-full cursor-not-allowed items-center justify-between gap-3 px-3 text-sm text-muted/70"
            >
              <span className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                Settings
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                Coming soon
              </span>
            </button>
          </div>
          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-red-400 transition-colors hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}