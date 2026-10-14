"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/app" className="flex items-center gap-3" aria-label="WatchStash home">
          <Image
            src="/512×512_icon.png"
            alt="WatchStash"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-primary">WatchStash</span>
        </Link>
        <AccountMenu user={user} onLogout={logout} />
      </div>
    </header>
  );
}