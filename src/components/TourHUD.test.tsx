import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TourHUD } from "@/components/TourHUD";
import type { Spot } from "@/lib/types";

const mk = (id: string, name: string, type: Spot["type"] = "spot"): Spot => ({
  id, day: 1, order: 1, name, type, note: "",
  ...(type === "spot" ? { lat: 25, lng: 121 } : {}),
});

const stops = [mk("a", "Alpha"), mk("t", "移動路段", "transit"), mk("b", "Bravo")];

const noop = () => {};
const baseProps = {
  stops, autoPlay: false,
  onPrev: noop, onNext: noop, onToggleAutoPlay: noop, onExit: noop, onGoto: noop,
};

describe("TourHUD", () => {
  it("shows the current stop card", () => {
    render(<TourHUD {...baseProps} index={0} />);
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
  });

  it("shows a transit interstitial for transit stops", () => {
    render(<TourHUD {...baseProps} index={1} />);
    expect(screen.getByText("移動中")).toBeInTheDocument();
    expect(screen.getByText("移動路段")).toBeInTheDocument();
  });

  it("disables prev at the start and next at the end", () => {
    const { rerender } = render(<TourHUD {...baseProps} index={0} />);
    expect(screen.getByRole("button", { name: "上一站" })).toBeDisabled();
    rerender(<TourHUD {...baseProps} index={2} />);
    expect(screen.getByRole("button", { name: "下一站" })).toBeDisabled();
  });

  it("fires navigation and exit callbacks", async () => {
    const onNext = vi.fn();
    const onExit = vi.fn();
    const onGoto = vi.fn();
    render(<TourHUD {...baseProps} index={0} onNext={onNext} onExit={onExit} onGoto={onGoto} />);
    await userEvent.click(screen.getByRole("button", { name: "下一站" }));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "結束導覽" }));
    expect(onExit).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "第 3 站" }));
    expect(onGoto).toHaveBeenCalledWith(2);
  });

  it("labels the autoplay toggle by state", () => {
    const { rerender } = render(<TourHUD {...baseProps} index={0} autoPlay={true} />);
    expect(screen.getByRole("button", { name: "暫停" })).toBeInTheDocument();
    rerender(<TourHUD {...baseProps} index={0} autoPlay={false} />);
    expect(screen.getByRole("button", { name: "自動播放" })).toBeInTheDocument();
  });
});
