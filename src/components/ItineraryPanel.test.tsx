import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import type { DayGroup } from "@/lib/types";

const days: DayGroup[] = [
  {
    day: 1,
    spots: [
      { id: "a", day: 1, order: 1, name: "Alpha", type: "spot", lat: 25, lng: 121, note: "" },
      { id: "t", day: 1, order: 2, name: "Transit note", type: "transit", note: "" },
    ],
  },
  {
    day: 2,
    spots: [{ id: "b", day: 2, order: 1, name: "Bravo", type: "spot", lat: 24, lng: 121, note: "" }],
  },
];

describe("ItineraryPanel", () => {
  it("renders a tab per day and clicking a spot calls onSelect", async () => {
    const onSelect = vi.fn();
    render(
      <ItineraryPanel days={days} selectedSpotId={null} onSelect={onSelect}
        onNoteChange={() => {}} onExport={() => {}} />
    );
    expect(screen.getByRole("tab", { name: /Day1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Day2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("renders transit items as non-interactive text", () => {
    render(
      <ItineraryPanel days={days} selectedSpotId={null} onSelect={() => {}}
        onNoteChange={() => {}} onExport={() => {}} />
    );
    expect(screen.queryByRole("button", { name: /Transit note/ })).toBeNull();
    expect(screen.getByText(/Transit note/)).toBeInTheDocument();
  });

  it("shows a note editor for the selected spot", () => {
    render(
      <ItineraryPanel days={days} selectedSpotId="a" onSelect={() => {}}
        onNoteChange={() => {}} onExport={() => {}} />
    );
    expect(screen.getByLabelText("note-a")).toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", async () => {
    const onExport = vi.fn();
    render(
      <ItineraryPanel days={days} selectedSpotId={null} onSelect={() => {}}
        onNoteChange={() => {}} onExport={onExport} />
    );
    await userEvent.click(screen.getByRole("button", { name: /匯出/ }));
    expect(onExport).toHaveBeenCalled();
  });
});
