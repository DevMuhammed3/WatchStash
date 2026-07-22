"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Film } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { StatusSection } from "@/components/StatusSection";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import type { MediaItem, SortOption, MediaStatus } from "@watchstash/types";

const MOCK_ITEMS: MediaItem[] = [
  { _id: "1", title: "Inception", type: "movie", status: "completed", rating: 9, review: "A mind-bending masterpiece.", progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-15T10:00:00Z", updatedAt: "2024-03-15T10:00:00Z" },
  { _id: "2", title: "Arcane", type: "series", status: "watching", rating: 8, progress: { currentEpisode: 6, totalEpisodes: 9, currentSeason: 1 }, createdAt: "2024-03-14T10:00:00Z", updatedAt: "2024-03-14T10:00:00Z" },
  { _id: "3", title: "Attack on Titan", type: "anime", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 75, currentSeason: 1 }, createdAt: "2024-03-13T10:00:00Z", updatedAt: "2024-03-13T10:00:00Z" },
  { _id: "4", title: "Interstellar", type: "movie", status: "completed", rating: 10, progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-12T10:00:00Z", updatedAt: "2024-03-12T10:00:00Z" },
  { _id: "5", title: "Dark", type: "series", status: "on_hold", rating: 7, progress: { currentEpisode: 8, totalEpisodes: 26, currentSeason: 2 }, createdAt: "2024-03-11T10:00:00Z", updatedAt: "2024-03-11T10:00:00Z" },
  { _id: "6", title: "The Matrix", type: "movie", status: "completed", rating: 9, progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-10T10:00:00Z", updatedAt: "2024-03-10T10:00:00Z" },
  { _id: "7", title: "Cowboy Bebop", type: "anime", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 26, currentSeason: 1 }, createdAt: "2024-03-09T10:00:00Z", updatedAt: "2024-03-09T10:00:00Z" },
  { _id: "8", title: "Breaking Bad", type: "series", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 62, currentSeason: 1 }, createdAt: "2024-03-08T10:00:00Z", updatedAt: "2024-03-08T10:00:00Z" },
  { _id: "9", title: "Parasite", type: "movie", status: "completed", rating: 8, progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-07T10:00:00Z", updatedAt: "2024-03-07T10:00:00Z" },
  { _id: "10", title: "One Punch Man", type: "anime", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 24, currentSeason: 1 }, createdAt: "2024-03-06T10:00:00Z", updatedAt: "2024-03-06T10:00:00Z" },
  { _id: "11", title: "The Shawshank Redemption", type: "movie", status: "completed", rating: 10, progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-05T10:00:00Z", updatedAt: "2024-03-05T10:00:00Z" },
  { _id: "12", title: "Fullmetal Alchemist", type: "anime", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 64, currentSeason: 1 }, createdAt: "2024-03-04T10:00:00Z", updatedAt: "2024-03-04T10:00:00Z" },
  { _id: "13", title: "Stranger Things", type: "series", status: "watching", rating: 7, progress: { currentEpisode: 5, totalEpisodes: 8, currentSeason: 4 }, createdAt: "2024-03-03T10:00:00Z", updatedAt: "2024-03-03T10:00:00Z" },
  { _id: "14", title: "Ghost in the Shell", type: "anime", status: "plan_to_watch", progress: { currentEpisode: 0, totalEpisodes: 1, currentSeason: 1 }, createdAt: "2024-03-02T10:00:00Z", updatedAt: "2024-03-02T10:00:00Z" },
  { _id: "15", title: "Pulp Fiction", type: "movie", status: "completed", rating: 9, progress: { currentEpisode: 0, currentSeason: 1 }, createdAt: "2024-03-01T10:00:00Z", updatedAt: "2024-03-01T10:00:00Z" },
  { _id: "16", title: "Steins;Gate", type: "anime", status: "watching", rating: 9, progress: { currentEpisode: 12, totalEpisodes: 24, currentSeason: 1 }, createdAt: "2024-02-28T10:00:00Z", updatedAt: "2024-02-28T10:00:00Z" },
];

const STATUS_ORDER: MediaStatus[] = [
  "plan_to_watch",
  "watching",
  "on_hold",
  "completed",
];

export default function Home() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filtered = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(q),
      );
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

  function handleStatusChange(id: string, status: MediaStatus) {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, status } : item,
      ),
    );
  }

  function handleRatingChange(id: string, rating: number) {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, rating } : item,
      ),
    );
    setSelectedItem((prev) =>
      prev?._id === id ? { ...prev, rating } : prev,
    );
  }

  function handleNotesChange(id: string, review: string) {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, review } : item,
      ),
    );
    setSelectedItem((prev) =>
      prev?._id === id ? { ...prev, review } : prev,
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              WatchStash
            </h1>
            <span className="h-1 w-10 rounded-full bg-accent" />
          </div>
          <p className="mt-2 text-sm text-muted">
            Your personal media collection
          </p>
        </div>

        <div className="mb-10">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <div className="space-y-12">
          {STATUS_ORDER.map((status) => {
            const sectionItems = grouped.get(status) ?? [];
            return (
              <StatusSection
                key={status}
                status={status}
                items={sectionItems}
                onItemClick={setSelectedItem}
                onStatusChange={handleStatusChange}
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted">Nothing in your stash yet</p>
            <p className="mt-1 text-sm text-subtle">
              Add some movies or shows to get started
            </p>
          </div>
        )}

        <MediaDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRatingChange={handleRatingChange}
          onNotesChange={handleNotesChange}
        />
      </main>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-44 opacity-95">
            <div className="relative aspect-[2/3] rounded-xl border border-accent/40 bg-surface shadow-2xl shadow-black/60">
              <div className="flex h-full w-full items-center justify-center">
                <Film className="h-12 w-12 text-subtle" />
              </div>
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
