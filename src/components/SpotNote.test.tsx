import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotNote } from "@/components/SpotNote";

afterEach(() => vi.useRealTimers());

describe("SpotNote", () => {
  it("debounces changes before calling onChange", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SpotNote spotId="s1" value="" onChange={onChange} debounceMs={300} />);
    const box = screen.getByLabelText("note-s1");
    fireEvent.change(box, { target: { value: "hello" } });
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledWith("s1", "hello");
  });

  it("shows the incoming value", () => {
    render(<SpotNote spotId="s1" value="existing" onChange={() => {}} />);
    expect(screen.getByLabelText("note-s1")).toHaveValue("existing");
  });
});
