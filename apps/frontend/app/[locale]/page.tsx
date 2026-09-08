"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Film, Plus, Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@watchstash/ui";
import { FilterBar } from "@/components/FilterBar";
import { StatusSection } from "@/components/StatusSection";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import type { MediaItem, SortOption, MediaStatus } from "@watchstash/types";
import { STATUS_ORDER } from "@watchstash/types";

const AddMediaModal = dynamic(() =>
  import("@/components/AddMediaModal").then((m) => m.AddMediaModal),
);
const MediaDetailModal = dynamic(() =>
  import("@/components/MediaDetailModal").then((m) => m.MediaDetailModal),
);

interface StashResponse {
  status: string;
  items: MediaItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function Home() {
  const { user, status, logout, apiFetch } = useAuth();
  const router = useRouter();
  const tHome = useTranslations("home");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const loadStash = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/stash?page=1&limit=100`);
      if (!res.ok) throw new Error(tErrors("loadStash"));
      const data = (await res.json()) as StashResponse;
      setItems(data.items);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : tErrors("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tErrors]);

  useEffect(() => {
    if (status === "authenticated") {
      loadStash();
    }
  }, [status, loadStash]);

  const patchStash = useCallback(
    async (id: string, fields: Partial<Pick<MediaItem, "status" | "rating" | "review">>) => {
      const res = await apiFetch(`${API_BASE_URL}/api/stash/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? tErrors("updateFailed"));
      }
      return (await res.json()) as { item: MediaItem };
    },
    [apiFetch, tErrors],
  );

  const handleStatusChange = useCallback(
    async (id: string, nextStatus: MediaStatus) => {
      const previous = items;
      const prevItem = items.find((i) => i._id === id);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: nextStatus } : item)),
      );
      try {
        await patchStash(id, { status: nextStatus });
      } catch {
        setItems(previous);
        setSelectedItem(prevItem ?? null);
      }
    },
    [items, patchStash],
  );

  const handleRatingChange = useCallback(
    async (id: string, rating: number) => {
      const previous = items;
      const prevItem = items.find((i) => i._id === id);
      const apply = () => {
        setItems((prev) =>
          prev.map((item) => (item._id === id ? { ...item, rating } : item)),
        );
        setSelectedItem((prev) => (prev?._id === id ? { ...prev, rating } : prev));
      };
      apply();
      try {
        await patchStash(id, { rating });
      } catch {
        setItems(previous);
        setSelectedItem(prevItem ?? null);
      }
    },
    [items, patchStash],
  );

  const handleNotesChange = useCallback(
    async (id: string, review: string) => {
      const previous = items;
      const prevItem = items.find((i) => i._id === id);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, review } : item)),
      );
      setSelectedItem((prev) => (prev?._id === id ? { ...prev, review } : prev));
      try {
        await patchStash(id, { review });
      } catch {
        setItems(previous);
        setSelectedItem(prevItem ?? null);
      }
    },
    [items, patchStash],
  );

  const handleAdded = useCallback((item: MediaItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const filtered = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }

    switch (sort) {
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "rating":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }

    return result;
  }, [items, search, sort]);

  const grouped = useMemo(() => {
    const map = new Map<MediaStatus, MediaItem[]>();
    for (const s of STATUS_ORDER) map.set(s, []);
    for (const item of filtered) {
      map.get(item.status)?.push(item);
    }
    return map;
  }, [filtered]);

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">{tHome("loading")}</p>
      </main>
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const item = items.find((i) => i._id === id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleStatusChange(active.id as string, over.id as MediaStatus);
    }
    setActiveItem(null);
  }

  function handleDragCancel() {
    setActiveItem(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                WatchStash
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="hidden text-sm text-secondary sm:inline">
                  {user.displayName}
                </span>
              )}
              <Button variant="primary" className="cursor-pointer" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                {tCommon("addMedia")}
              </Button>
              <Button
                onClick={() => logout()}
                className="cursor-pointer  rounded-md border border-border px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-border-hover hover:text-primary"
              >
                {tCommon("signOut")}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            {tHome("tagline")}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">{tHome("loading")}</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{loadError}</p>
            <Button onClick={loadStash}>{tCommon("tryAgain")}</Button>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
              />
            </div>

            <div className="space-y-12">
              {STATUS_ORDER.map((statusKey) => {
                const sectionItems = grouped.get(statusKey) ?? [];
                return (
                  <StatusSection
                    key={statusKey}
                    status={statusKey}
                    items={sectionItems}
                    onItemClick={setSelectedItem}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <p className="text-lg font-medium text-muted">
                  {items.length === 0 ? tHome("emptyStash") : tHome("noMatches")}
                </p>
                <p className="text-sm text-subtle">
                  {items.length === 0
                    ? tHome("emptyStashHint")
                    : tHome("noMatchesHint")}
                </p>
                {items.length === 0 && (
                  <Button variant="primary" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {tCommon("addMedia")}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        <MediaDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRatingChange={handleRatingChange}
          onNotesChange={handleNotesChange}
        />

        <AddMediaModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdded={handleAdded}
        />
      </main>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-44 opacity-95">
            <div className="relative aspect-[2/3] rounded-xl border border-accent/40 bg-surface shadow-2xl shadow-black/60">
              {activeItem.posterUrl ? (
                <Image
                  src={activeItem.posterUrl}
                  alt={activeItem.title}
                  fill
                  sizes="176px"
                  className="rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film className="h-12 w-12 text-subtle" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface to-transparent p-3 pt-8">
                <p className="text-sm font-medium text-primary line-clamp-2">
                  {activeItem.title}
                </p>
              </div>
              {activeItem.rating != null && (
                <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
                  <span className="text-xs font-semibold text-rating">
                    {activeItem.rating}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
