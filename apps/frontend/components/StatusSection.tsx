"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { MediaCard } from "@/components/MediaCard";
import type { MediaItem, MediaStatus } from "@watchstash/types";

const statusDisplay: Record<MediaStatus, { label: string }> = {
  plan_to_watch: { label: "Plan to Watch" },
  watching: { label: "Watching" },
  on_hold: { label: "On Hold" },
  completed: { label: "Completed" },
};

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { label } = statusDisplay[status];

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
            Drop here
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
              <button
                type="button"
                onClick={() => scrollBy("left")}
                className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-surface/90 p-2 text-secondary shadow-lg backdrop-blur-sm transition-colors hover:bg-surface hover:text-primary"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((item) => (
              <div
                key={item._id}
                data-card
                className="min-w-[160px] flex-none sm:min-w-[180px] md:min-w-[200px]"
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
              <button
                type="button"
                onClick={() => scrollBy("right")}
                className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-surface/90 p-2 text-secondary shadow-lg backdrop-blur-sm transition-colors hover:bg-surface hover:text-primary"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
