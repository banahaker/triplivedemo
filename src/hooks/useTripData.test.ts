import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTripData } from "@/hooks/useTripData";

afterEach(() => localStorage.clear());

describe("useTripData", () => {
  it("groups spots by day, sorted by order", () => {
    const { result } = renderHook(() => useTripData());
    expect(result.current.days.map((d) => d.day)).toEqual([1, 2, 3]);
    const day1 = result.current.days[0].spots;
    expect(day1[0].order).toBe(1);
    expect(day1.map((s) => s.order)).toEqual([...day1.map((s) => s.order)].sort((a, b) => a - b));
  });

  it("updateNote persists to localStorage and updates state", () => {
    const { result } = renderHook(() => useTripData());
    act(() => result.current.updateNote("d1-zhengbin", "彩色街屋很好拍"));
    const spot = result.current.spots.find((s) => s.id === "d1-zhengbin");
    expect(spot?.note).toBe("彩色街屋很好拍");
    expect(JSON.parse(localStorage.getItem("showtrip:notes")!)["d1-zhengbin"]).toBe("彩色街屋很好拍");
  });

  it("loads stored notes on init", () => {
    localStorage.setItem("showtrip:notes", JSON.stringify({ "d1-zhengbin": "已存筆記" }));
    const { result } = renderHook(() => useTripData());
    expect(result.current.spots.find((s) => s.id === "d1-zhengbin")?.note).toBe("已存筆記");
  });

  it("exportJson returns valid TripData with merged notes", () => {
    const { result } = renderHook(() => useTripData());
    act(() => result.current.updateNote("d1-zhengbin", "N"));
    const parsed = JSON.parse(result.current.exportJson());
    expect(parsed.title).toBeTruthy();
    expect(parsed.spots).toHaveLength(20);
    expect(parsed.spots.find((s: { id: string }) => s.id === "d1-zhengbin").note).toBe("N");
  });
});
