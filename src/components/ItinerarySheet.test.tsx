import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItinerarySheet } from "@/components/ItinerarySheet";
import type { DayGroup } from "@/lib/types";

const days: DayGroup[] = [
  {
    day: 1,
    spots: [
      { id: "a", day: 1, order: 1, name: "Alpha", type: "spot", lat: 25, lng: 121, note: "", time: "09:00", category: "sight" },
      { id: "t", day: 1, order: 2, name: "Transit note", type: "transit", note: "" },
    ],
  },
  {
    day: 2,
    spots: [{ id: "b", day: 2, order: 1, name: "Bravo", type: "spot", lat: 24, lng: 121, note: "" }],
  },
];

const baseProps = {
  title: "基隆宜蘭三日遊",
  days,
  activeDay: 1,
  onDayChange: () => {},
  selectedSpotId: null as string | null,
  onSelect: () => {},
  onNoteChange: () => {},
  onExport: () => {},
  onStartTour: () => {},
};

describe("ItinerarySheet", () => {
  it("renders a tab per day and clicking a spot calls onSelect", async () => {
    const onSelect = vi.fn();
    render(<ItinerarySheet {...baseProps} onSelect={onSelect} />);
    expect(screen.getByRole("tab", { name: /Day 1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Day 2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("switching tabs calls onDayChange", async () => {
    const onDayChange = vi.fn();
    render(<ItinerarySheet {...baseProps} onDayChange={onDayChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /Day 2/ }));
    expect(onDayChange).toHaveBeenCalledWith(2);
  });

  it("renders transit items as non-interactive text", () => {
    render(<ItinerarySheet {...baseProps} />);
    expect(screen.queryByRole("button", { name: /Transit note/ })).toBeNull();
    expect(screen.getByText(/Transit note/)).toBeInTheDocument();
  });

  it("expands the selected spot with a note editor", () => {
    render(<ItinerarySheet {...baseProps} selectedSpotId="a" />);
    expect(screen.getByLabelText("note-a")).toBeInTheDocument();
  });

  it("fires export and tour callbacks", async () => {
    const onExport = vi.fn();
    const onStartTour = vi.fn();
    render(<ItinerarySheet {...baseProps} onExport={onExport} onStartTour={onStartTour} />);
    await userEvent.click(screen.getByRole("button", { name: /匯出 JSON/ }));
    expect(onExport).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /播放導覽/ }));
    expect(onStartTour).toHaveBeenCalled();
  });
});
