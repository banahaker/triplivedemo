import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface SpotNoteProps {
  spotId: string;
  value: string;
  onChange: (spotId: string, note: string) => void;
  debounceMs?: number;
}

export function SpotNote({ spotId, value, onChange, debounceMs = 400 }: SpotNoteProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value, spotId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(spotId, next), debounceMs);
  };

  return (
    <Textarea
      aria-label={`note-${spotId}`}
      placeholder="寫點筆記…"
      value={draft}
      onChange={handleChange}
      className="mt-2"
    />
  );
}
