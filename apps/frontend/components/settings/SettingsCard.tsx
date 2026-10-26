import type { ReactNode } from "react";

interface SettingsCardProps {
  title: string;
  description: string;
  children: ReactNode;
  danger?: boolean;
}

export function SettingsCard({
  title,
  description,
  children,
  danger = false,
}: SettingsCardProps) {
  return (
    <section
      className={`rounded-2xl border bg-surface/40 p-5 sm:p-6 ${
        danger ? "border-red-500/20" : "border-white/[0.07]"
      }`}
    >
      <header>
        <h2
          className={`text-base font-semibold ${
            danger ? "text-red-400" : "text-primary"
          }`}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
