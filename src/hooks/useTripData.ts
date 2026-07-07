import { useCallback, useMemo, useState } from "react";
import seed from "@/data/trip.json";
import type { DayGroup, Spot, TripData } from "@/lib/types";

const STORAGE_KEY = "showtrip:notes";
const seedData = seed as TripData;

function readStoredNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeStoredNotes(notes: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* localStorage unavailable — keep in-memory only */
  }
}

export function useTripData() {
  const [notes, setNotes] = useState<Record<string, string>>(() => readStoredNotes());

  const spots: Spot[] = useMemo(
    () => seedData.spots.map((s) => ({ ...s, note: notes[s.id] ?? s.note ?? "" })),
    [notes]
  );

  const days: DayGroup[] = useMemo(() => {
    const byDay = new Map<number, Spot[]>();
    for (const s of spots) {
      const list = byDay.get(s.day) ?? [];
      list.push(s);
      byDay.set(s.day, list);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, list]) => ({ day, spots: [...list].sort((a, b) => a.order - b.order) }));
  }, [spots]);

  const updateNote = useCallback((spotId: string, note: string) => {
    setNotes((prev) => {
      const next = { ...prev, [spotId]: note };
      writeStoredNotes(next);
      return next;
    });
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify({ title: seedData.title, spots }, null, 2),
    [spots]
  );

  return { title: seedData.title, days, spots, updateNote, exportJson };
}
