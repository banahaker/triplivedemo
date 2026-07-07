import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpotCard } from "@/components/SpotCard";
import type { Spot } from "@/lib/types";

const spot: Spot = {
  id: "s1", day: 1, order: 2, name: "正濱漁港", type: "spot",
  lat: 25.15, lng: 121.77, note: "",
  category: "harbor", time: "10:00", duration: "1 小時",
  description: "彩色街屋倒映水面。",
};

describe("SpotCard", () => {
  it("renders time, duration, name, and description", () => {
    render(<SpotCard spot={spot} />);
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText(/1 小時/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "正濱漁港" })).toBeInTheDocument();
    expect(screen.getByText("彩色街屋倒映水面。")).toBeInTheDocument();
  });

  it("shows a note editor only when onNoteChange is provided", () => {
    const { rerender } = render(<SpotCard spot={spot} />);
    expect(screen.queryByLabelText("note-s1")).toBeNull();
    rerender(<SpotCard spot={spot} onNoteChange={vi.fn()} />);
    expect(screen.getByLabelText("note-s1")).toBeInTheDocument();
  });

  it("never shows a note editor for transit entries", () => {
    render(
      <SpotCard
        spot={{ ...spot, id: "t1", type: "transit", lat: undefined, lng: undefined }}
        onNoteChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("note-t1")).toBeNull();
  });
});
