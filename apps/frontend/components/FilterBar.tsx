"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@watchstash/ui";
import type { SortOption } from "@watchstash/types";

const SORT_OPTIONS = ["recent", "rating"] as const;

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function FilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  const t = useTranslations("filterBar");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="bg-surface pl-10 pr-4 text-primary!"
        />
      </div>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-secondary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {SORT_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {t(`sort.${value}`)}
          </option>
        ))}
      </select>
    </div>
  );
}