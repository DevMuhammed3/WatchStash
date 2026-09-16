"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@watchstash/ui";
import { MediaCard } from "@/components/MediaCard";
import type { MediaItem, MediaStatus } from "@watchstash/types";

interface StatusSectionProps {
  status: MediaStatus;
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onStatusChange: (id: string, status: MediaStatus) => void;
}

export function StatusSection({
  status,
  items,
  onItemClick,
  onStatusChange,
}: StatusSectionProps) {
  const tStatus = useTranslations("status");
  const t = useTranslations("statusSection");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const label = tStatus(status);

  const { isOver, setNodeRef } = useDroppable({ id: status });

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  function scrollBy(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.querySelector("[data-card]");
    const cardWidth = first?.clientWidth ?? 200;
    const gap = 16;
    const amount = (cardWidth + gap) * 2;
    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  return (
    <section ref={setNodeRef}>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {label}
        </h2>
        {items.length > 0 && (
          <span className="text-sm text-muted">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className={`flex items-center justify-center rounded-2xl border-2 border-dashed py-12 transition-all duration-200 ${
            isOver
              ? "border-accent bg-accent/5"
              : "border-border"
          }`}
        >
          <p
            className={`text-sm transition-colors duration-200 ${
              isOver ? "text-accent-hover" : "text-muted"
            }`}
          >
            {t("dropHere")}
          </p>
        </div>
      ) : (
        <div
          className={`relative transition-all duration-200 ${
            isOver ? "rounded-2xl ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""
          }`}
        >
          {canScrollLeft && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-canvas to-transparent" />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => scrollBy("left")}
                className="absolute left-1 top-1/2 z-20 -translate-y-1/2 bg-surface/90 text-secondary shadow-lg backdrop-blur-sm hover:bg-surface!"
                aria-label={t("scrollLeft")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scroll-smooth pt-2 pb-6"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((item) => (
              <div
                key={item._id}
                data-card
                className="w-full flex-none md:w-[340px]"
              >
                <MediaCard
                  itemId={item._id}
                  compact
                  title={item.title}
                  type={item.type}
                  posterUrl={item.posterUrl}
                  rating={item.rating}
                  status={item.status}
                  onClick={() => onItemClick(item)}
                  onStatusChange={(newStatus) =>
                    onStatusChange(item._id, newStatus)
                  }
                />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-canvas to-transparent" />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => scrollBy("right")}
                className="absolute right-1 top-1/2 z-20 -translate-y-1/2 bg-surface/90 text-secondary shadow-lg backdrop-blur-sm hover:bg-surface!"
                aria-label={t("scrollRight")}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
