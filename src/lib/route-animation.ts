export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function pathLength(coords: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
  }
  return len;
}

export function partialPath(coords: [number, number][], t: number): [number, number][] {
  if (coords.length < 2) return coords.slice();
  const progress = clamp01(t);
  if (progress === 1) return coords.slice();
  if (progress === 0) return [coords[0]];

  const target = pathLength(coords) * progress;
  const out: [number, number][] = [coords[0]];
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    if (acc + seg >= target) {
      const r = seg === 0 ? 0 : (target - acc) / seg;
      out.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * r,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * r,
      ]);
      return out;
    }
    acc += seg;
    out.push(coords[i]);
  }
  return out;
}
