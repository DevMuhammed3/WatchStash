"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@watchstash/ui";
import { useTranslations } from "next-intl";

export type RoutePolicy = "protected" | "guest";

interface RouteGuardProps {
  policy: RoutePolicy;
  children: React.ReactNode;
}

export function RouteGuard({ policy, children }: RouteGuardProps) {
  const { status, retrySession } = useAuth();
  const router = useRouter();
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (policy === "protected" && status === "unauthenticated") {
      router.replace("/login");
    }
    if (policy === "guest" && status === "authenticated") {
      router.replace("/app");
    }
  }, [policy, status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">{tCommon("loading")}</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted">Session verification is unavailable.</p>
        <Button variant="primary" onClick={retrySession}>
          {tCommon("tryAgain")}
        </Button>
      </main>
    );
  }

  if (policy === "protected" && status !== "authenticated") {
    return null;
  }

  if (policy === "guest" && status !== "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}