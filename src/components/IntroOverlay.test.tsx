import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntroOverlay } from "@/components/IntroOverlay";

describe("IntroOverlay", () => {
  const setup = () => {
    const onExplore = vi.fn();
    const onTour = vi.fn();
    render(
      <IntroOverlay title="基隆宜蘭三日遊" dayCount={3} spotCount={19}
        onExplore={onExplore} onTour={onTour} />
    );
    return { onExplore, onTour };
  };

  it("shows the trip title and stats", () => {
    setup();
    expect(screen.getByRole("heading", { name: "基隆宜蘭三日遊" })).toBeInTheDocument();
    expect(screen.getByText(/3 天/)).toBeInTheDocument();
    expect(screen.getByText(/19 個地點/)).toBeInTheDocument();
  });

  it("fires callbacks from the two entry buttons", async () => {
    const { onExplore, onTour } = setup();
    await userEvent.click(screen.getByRole("button", { name: /播放導覽/ }));
    expect(onTour).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /自由探索/ }));
    expect(onExplore).toHaveBeenCalled();
  });
});
