# Showtrip UI/UX 升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 showtrip 升級為深色沉浸感的行程展示體驗:intro → explore → tour 場景狀態機、電影感鏡頭、路線繪製動畫、玻璃擬態 UI、資料欄位擴充與預填。

**Architecture:** App 層持有場景狀態(`useTripScene`),透過 map ref + `useCameraController` 直接呼叫原生 MapLibre `flyTo`/`fitBounds`(取代現有 controlled-viewport 的 `jumpTo`)。路線動畫由純函式 `partialPath` + rAF hook `useRouteProgress` 驅動。UI 拆為 `IntroOverlay` / `ItinerarySheet` / `TourHUD` / `SpotCard`,舊 `ItineraryPanel` 刪除。

**Tech Stack:** React 19 + TypeScript、Vite、Tailwind 3.4 + tailwindcss-animate、maplibre-gl(經 `src/components/ui/map.tsx` 封裝)、Radix Tabs、lucide-react、vitest + testing-library。

**Spec:** `docs/superpowers/specs/2026-07-07-ui-ux-upgrade-design.md`

## Global Constraints

- 強制深色:`<html class="dark">`,底圖用 `ui/map.tsx` 內建的 Carto dark-matter(`theme="dark"`)。
- Day 色:Day 1 = `#22d3ee`(cyan)、Day 2 = `#34d399`(emerald)、Day 3 = `#a78bfa`(violet)。
- 自動播放停留:spot 5000ms、transit 3000ms,最後一站自動停止。
- 尊重 `prefers-reduced-motion`:鏡頭降級 `jumpTo`、路線動畫直接畫滿。
- 不新增任何 npm dependency;動效只用 CSS/Tailwind + rAF。
- `src/components/ui/map.tsx` 不修改。
- 新資料欄位皆 optional,舊格式 JSON 匯入相容;`trip.json` 維持 20 筆(19 spot + 1 transit)。
- 每個 task 結束:`npm test` 綠燈、`npm run lint` 無錯誤,然後 commit。
- 測試環境 jsdom 無 `window.matchMedia`,測試涉及時要 stub(見 Task 6 的 setup 寫法)。

---

### Task 1: 深色主題基礎(index.html / index.css)

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: 無
- Produces: `.glass` CSS 工具 class(玻璃擬態卡片)、`.marker-pulse` 動畫 class(吃 `--pulse-color` CSS 變數)、全域 Noto Sans TC 字體、`<html class="dark">`(讓現有 `.dark` token 生效)

- [ ] **Step 1: 改寫 index.html**

把整個檔案換成:

```html
<!doctype html>
<html lang="zh-Hant" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#020617" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap"
      rel="stylesheet"
    />
    <title>基隆宜蘭三日遊</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 擴充 index.css**

保留現有 `@tailwind` 三行、token 兩大段與 `html, body, #root` 行,在檔案**末尾**加上:

```css
@layer base {
  html {
    font-family: "Noto Sans TC", ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
}

@layer components {
  .glass {
    @apply rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-md;
  }
}

@keyframes marker-pulse {
  0% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(34, 211, 238, 0.55)); }
  70% { box-shadow: 0 0 0 14px rgba(0, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
}
.marker-pulse {
  animation: marker-pulse 1.8s ease-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .marker-pulse { animation: none; }
}
```

- [ ] **Step 3: 驗證 build 與測試**

Run: `npm run build && npm test`
Expected: build 成功,現有測試全數 PASS(這步只動 HTML/CSS,不應壞任何測試)。

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: force dark theme, add Noto Sans TC, glass/pulse utilities"
```

---

### Task 2: 資料 schema 擴充與內容預填

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/data/trip.json`
- Test: `src/data/trip.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `SpotCategory` 型別(`"sight" | "food" | "stay" | "trail" | "spring" | "harbor" | "museum" | "transit"`)、`Spot` 新增 optional 欄位 `category?: SpotCategory; time?: string; duration?: string; description?: string`。後續 task 依賴這些欄位名。

- [ ] **Step 1: 在 trip.test.ts 加上新欄位的失敗測試**

在現有 `describe("trip.json", ...)` 內追加:

```ts
const CATEGORIES = ["sight", "food", "stay", "trail", "spring", "harbor", "museum", "transit"];

it("gives every entry a valid category, time, duration, and description", () => {
  for (const s of data.spots) {
    expect(CATEGORIES, `${s.id} category`).toContain(s.category);
    expect(s.time, `${s.id} time`).toMatch(/^\d{2}:\d{2}$/);
    expect(s.duration, `${s.id} duration`).toBeTruthy();
    expect(s.description, `${s.id} description`).toBeTruthy();
  }
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/data/trip.test.ts`
Expected: FAIL(category undefined)

- [ ] **Step 3: 擴充 types.ts**

```ts
export type SpotType = "spot" | "transit";

export type SpotCategory =
  | "sight"
  | "food"
  | "stay"
  | "trail"
  | "spring"
  | "harbor"
  | "museum"
  | "transit";

export interface Spot {
  id: string;
  day: number;
  order: number;
  name: string;
  type: SpotType;
  lat?: number;
  lng?: number;
  note: string;
  category?: SpotCategory;
  /** 預計時段,HH:mm */
  time?: string;
  /** 停留時間,如「1.5 小時」 */
  duration?: string;
  /** 一兩句景點簡介 */
  description?: string;
}

export interface TripData {
  title: string;
  spots: Spot[];
}

export interface DayGroup {
  day: number;
  spots: Spot[];
}
```

- [ ] **Step 4: 改寫 trip.json(完整預填)**

整檔替換為(id/day/order/name/type/座標維持原值,只新增欄位):

```json
{
  "title": "基隆宜蘭三日遊",
  "spots": [
    { "id": "d1-taipei-station", "day": 1, "order": 1, "name": "台北車站集合", "type": "spot", "lat": 25.0478, "lng": 121.5170, "note": "", "category": "transit", "time": "08:30", "duration": "30 分鐘", "description": "旅程起點,東三門集合,出發前先買杯咖啡。" },
    { "id": "d1-zhengbin", "day": 1, "order": 2, "name": "正濱漁港彩色街屋", "type": "spot", "lat": 25.1533, "lng": 121.7756, "note": "", "category": "harbor", "time": "10:00", "duration": "1 小時", "description": "基隆版威尼斯,一排彩色街屋倒映在漁港水面,拍照打卡熱點。" },
    { "id": "d1-wanghaixiang", "day": 1, "order": 3, "name": "望海巷跨海景觀橋", "type": "spot", "lat": 25.1389, "lng": 121.7961, "note": "", "category": "sight", "time": "11:30", "duration": "40 分鐘", "description": "跨越海灣的景觀橋,步行其上可眺望基隆嶼與湛藍海面。" },
    { "id": "d1-chaojing", "day": 1, "order": 4, "name": "潮境公園", "type": "spot", "lat": 25.1408, "lng": 121.8033, "note": "", "category": "sight", "time": "13:30", "duration": "1.5 小時", "description": "海科館旁的海濱公園,飛天掃帚裝置藝術與面海大草坪。" },
    { "id": "d1-badouzi", "day": 1, "order": 5, "name": "八斗子", "type": "spot", "lat": 25.1370, "lng": 121.7997, "note": "", "category": "harbor", "time": "15:30", "duration": "1 小時", "description": "漁村風情與海岸步道,黃昏時分的海景尤其動人。" },
    { "id": "d1-miaokou", "day": 1, "order": 6, "name": "基隆廟口夜市", "type": "spot", "lat": 25.1286, "lng": 121.7419, "note": "", "category": "food", "time": "18:00", "duration": "2 小時", "description": "奠濟宮周邊的百年夜市,鼎邊趖、營養三明治、泡泡冰必吃。" },
    { "id": "d1-keelung-stay", "day": 1, "order": 7, "name": "基隆住宿", "type": "spot", "lat": 25.1276, "lng": 121.7392, "note": "", "category": "stay", "time": "20:30", "duration": "過夜", "description": "夜宿基隆市區,步行可回廟口續攤。" },
    { "id": "d2-transit", "day": 2, "order": 1, "name": "基隆前往宜蘭(走國五 or 台2 海岸線,取決於要快還是要看風景)", "type": "transit", "note": "", "category": "transit", "time": "08:30", "duration": "約 1 小時", "description": "國五雪隧最快,台2 濱海公路最美——看當天心情決定。" },
    { "id": "d2-yilan-memorial", "day": 2, "order": 2, "name": "宜蘭設治紀念館", "type": "spot", "lat": 24.7522, "lng": 121.7539, "note": "", "category": "museum", "time": "09:45", "duration": "1 小時", "description": "百年日式官邸與老樟樹庭園,鬧中取靜的歷史角落。" },
    { "id": "d2-lanyang", "day": 2, "order": 3, "name": "蘭陽博物館", "type": "spot", "lat": 24.8697, "lng": 121.8306, "note": "", "category": "museum", "time": "11:15", "duration": "1.5 小時", "description": "單面山造型的地標建築,一館看懂蘭陽平原的山海與人文。" },
    { "id": "d2-jiaoxi", "day": 2, "order": 4, "name": "礁溪溫泉區", "type": "spot", "lat": 24.8275, "lng": 121.7708, "note": "", "category": "spring", "time": "13:30", "duration": "1.5 小時", "description": "平地湧出的碳酸氫鈉泉,泡湯泡腳都舒服。" },
    { "id": "d2-luodong-forestry", "day": 2, "order": 5, "name": "羅東林業文化園區", "type": "spot", "lat": 24.6786, "lng": 121.7681, "note": "", "category": "sight", "time": "15:30", "duration": "1 小時", "description": "昔日太平山林場的貯木池與鐵道遺跡,黃昏散步好去處。" },
    { "id": "d2-brown-ave", "day": 2, "order": 6, "name": "冬山伯朗大道", "type": "spot", "lat": 24.6317, "lng": 121.7936, "note": "", "category": "sight", "time": "16:45", "duration": "45 分鐘", "description": "田中央的筆直大道,稻浪間散步騎車,宜蘭版伯朗大道。" },
    { "id": "d2-zhongshan-trail", "day": 2, "order": 7, "name": "中山亭步道", "type": "spot", "lat": 24.6533, "lng": 121.7644, "note": "", "category": "trail", "time": "17:45", "duration": "45 分鐘", "description": "輕鬆的森林小徑,置高點可眺望冬山河與蘭陽平原。" },
    { "id": "d2-dongmen", "day": 2, "order": 8, "name": "東門夜市", "type": "spot", "lat": 24.7561, "lng": 121.7597, "note": "", "category": "food", "time": "19:00", "duration": "1.5 小時", "description": "宜蘭市最熱鬧的夜市,蔥油餅、一串心、龍鳳腿齊聚。" },
    { "id": "d3-suao-cold-spring", "day": 3, "order": 1, "name": "蘇澳冷泉", "type": "spot", "lat": 24.5942, "lng": 121.8497, "note": "", "category": "spring", "time": "09:00", "duration": "1 小時", "description": "全球少見的低溫碳酸泉,22 度泉水冰涼暢快。" },
    { "id": "d3-qixingling", "day": 3, "order": 2, "name": "七星嶺步道", "type": "spot", "lat": 24.5983, "lng": 121.8556, "note": "", "category": "trail", "time": "10:30", "duration": "1.5 小時", "description": "蘇澳後山的稜線步道,回望蘇澳港與太平洋的絕佳視角。" },
    { "id": "d3-nanfangao-deck", "day": 3, "order": 3, "name": "南方澳觀景台", "type": "spot", "lat": 24.5847, "lng": 121.8600, "note": "", "category": "sight", "time": "13:00", "duration": "40 分鐘", "description": "俯瞰南方澳漁港、豆腐岬與筆架山的經典展望點。" },
    { "id": "d3-fenniaolin", "day": 3, "order": 4, "name": "粉鳥林", "type": "spot", "lat": 24.5211, "lng": 121.8497, "note": "", "category": "sight", "time": "14:30", "duration": "1.5 小時", "description": "東澳灣旁的秘境漁港,消波塊後藏著碧綠色的夢幻海灣。" },
    { "id": "d3-back-taipei", "day": 3, "order": 5, "name": "回台北", "type": "spot", "lat": 25.0478, "lng": 121.5170, "note": "", "category": "transit", "time": "17:00", "duration": "約 1.5 小時", "description": "沿蘇花改與國五返程,為三天旅程畫下句點。" }
  ]
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS(含既有的 20 筆數量、唯一 id、座標規則測試)。

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/data/trip.json src/data/trip.test.ts
git commit -m "feat: extend spot schema with category/time/duration/description and prefill trip data"
```

---

### Task 3: map-utils 新色票與幾何 helpers

**Files:**
- Modify: `src/lib/map-utils.ts`
- Test: `src/lib/map-utils.test.ts`

**Interfaces:**
- Consumes: `DayGroup`, `Spot`(Task 2 型別)
- Produces:
  - `dayColor(day: number): string`(新色票:1→`#22d3ee`、2→`#34d399`、3→`#a78bfa`、fallback `#94a3b8`)
  - `markerSpots(days: DayGroup[]): Spot[]`(既有,不變)
  - `routeCoordinates(group: DayGroup): [number, number][]`(既有,不變)
  - `allCoordinates(days: DayGroup[]): [number, number][]` — 全部可繪座標
  - `tourStops(days: DayGroup[]): Spot[]` — 依 day/order 攤平的導覽站點(含 transit)
  - `coordsBounds(coords: [number, number][]): [[number, number], [number, number]]` — `[[minLng, minLat], [maxLng, maxLat]]`;空陣列丟 Error
  - `transitContext(stops: Spot[], index: number): [number, number][]` — index 前後最近可繪站點的座標(0–2 個)

- [ ] **Step 1: 在 map-utils.test.ts 追加失敗測試**

在現有測試檔追加(檔頭已有 `DayGroup`/`Spot` import 與測試資料的話沿用,否則自建):

```ts
import { allCoordinates, coordsBounds, dayColor, tourStops, transitContext } from "@/lib/map-utils";
import type { DayGroup, Spot } from "@/lib/types";

const mk = (over: Partial<Spot>): Spot => ({
  id: "x", day: 1, order: 1, name: "X", type: "spot", lat: 25, lng: 121, note: "", ...over,
});

const twoDays: DayGroup[] = [
  { day: 1, spots: [mk({ id: "a", order: 1, lat: 25, lng: 121 }), mk({ id: "t", order: 2, type: "transit", lat: undefined, lng: undefined })] },
  { day: 2, spots: [mk({ id: "b", day: 2, order: 1, lat: 24, lng: 122 })] },
];

describe("neon day colors", () => {
  it("maps days to the neon palette", () => {
    expect(dayColor(1)).toBe("#22d3ee");
    expect(dayColor(2)).toBe("#34d399");
    expect(dayColor(3)).toBe("#a78bfa");
    expect(dayColor(9)).toBe("#94a3b8");
  });
});

describe("allCoordinates", () => {
  it("returns coords of plottable spots only, in day/order sequence", () => {
    expect(allCoordinates(twoDays)).toEqual([[121, 25], [122, 24]]);
  });
});

describe("tourStops", () => {
  it("flattens all stops including transit, in order", () => {
    expect(tourStops(twoDays).map((s) => s.id)).toEqual(["a", "t", "b"]);
  });
});

describe("coordsBounds", () => {
  it("computes [[minLng,minLat],[maxLng,maxLat]]", () => {
    expect(coordsBounds([[121, 25], [122, 24]])).toEqual([[121, 24], [122, 25]]);
  });
  it("throws on empty input", () => {
    expect(() => coordsBounds([])).toThrow();
  });
});

describe("transitContext", () => {
  it("returns coords of nearest plottable neighbours around a transit stop", () => {
    const stops = tourStops(twoDays);
    expect(transitContext(stops, 1)).toEqual([[121, 25], [122, 24]]);
  });
  it("skips missing sides at the edges", () => {
    const stops = tourStops(twoDays);
    expect(transitContext(stops, 0)).toEqual([[122, 24]]);
  });
});
```

註:`transitContext(stops, 0)` 的站點 "a" 本身可繪,但函式定義為「往前、往後找最近的**其他**可繪站點」;index 0 往前無資料,往後最近是 "t"(不可繪)之後的 "b" → `[[122,24]]`。等等——"a" 後面第一個是 "t"(跳過)再來 "b"。正確。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/map-utils.test.ts`
Expected: FAIL(dayColor 回傳舊色 `#ef4444`;新函式不存在)

- [ ] **Step 3: 實作**

`src/lib/map-utils.ts` 全檔改為:

```ts
import type { DayGroup, Spot } from "@/lib/types";

const DAY_COLORS: Record<number, string> = {
  1: "#22d3ee",
  2: "#34d399",
  3: "#a78bfa",
};

export function dayColor(day: number): string {
  return DAY_COLORS[day] ?? "#94a3b8";
}

function isPlottable(s: Spot): s is Spot & { lat: number; lng: number } {
  return s.type === "spot" && typeof s.lat === "number" && typeof s.lng === "number";
}

export function markerSpots(days: DayGroup[]): Spot[] {
  return days.flatMap((d) => d.spots).filter(isPlottable);
}

export function routeCoordinates(group: DayGroup): [number, number][] {
  return group.spots.filter(isPlottable).map((s) => [s.lng, s.lat]);
}

export function allCoordinates(days: DayGroup[]): [number, number][] {
  return markerSpots(days).map((s) => [s.lng!, s.lat!]);
}

export function tourStops(days: DayGroup[]): Spot[] {
  return days.flatMap((d) => d.spots);
}

export function coordsBounds(
  coords: [number, number][]
): [[number, number], [number, number]] {
  if (coords.length === 0) throw new Error("coordsBounds: empty coordinates");
  let minLng = coords[0][0], minLat = coords[0][1];
  let maxLng = coords[0][0], maxLat = coords[0][1];
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function transitContext(stops: Spot[], index: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = index - 1; i >= 0; i--) {
    const s = stops[i];
    if (isPlottable(s)) { coords.push([s.lng, s.lat]); break; }
  }
  for (let i = index + 1; i < stops.length; i++) {
    const s = stops[i];
    if (isPlottable(s)) { coords.push([s.lng, s.lat]); break; }
  }
  return coords;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map-utils.ts src/lib/map-utils.test.ts
git commit -m "feat: neon day palette and geometry helpers for camera/tour"
```

---

### Task 4: 路線繪製的純函式(route-animation)

**Files:**
- Create: `src/lib/route-animation.ts`
- Test: `src/lib/route-animation.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `pathLength(coords: [number, number][]): number` — 平面折線長
  - `partialPath(coords: [number, number][], t: number): [number, number][]` — 取 0–1 進度的前段路徑,末點線性內插;t≥1 回傳完整路徑,t≤0 回傳 `[first]`
  - `clamp01(t: number): number`
  - `easeInOutCubic(t: number): number`

- [ ] **Step 1: 寫失敗測試**

`src/lib/route-animation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clamp01, easeInOutCubic, partialPath, pathLength } from "@/lib/route-animation";

const line: [number, number][] = [[0, 0], [1, 0], [1, 1]];

describe("pathLength", () => {
  it("sums segment lengths", () => {
    expect(pathLength(line)).toBeCloseTo(2);
    expect(pathLength([[3, 4]])).toBe(0);
  });
});

describe("partialPath", () => {
  it("returns full path at t=1 and clamps above", () => {
    expect(partialPath(line, 1)).toEqual(line);
    expect(partialPath(line, 1.5)).toEqual(line);
  });
  it("returns only the start point at t=0", () => {
    expect(partialPath(line, 0)).toEqual([[0, 0]]);
  });
  it("interpolates the final point mid-segment", () => {
    expect(partialPath(line, 0.25)).toEqual([[0, 0], [0.5, 0]]);
    expect(partialPath(line, 0.75)).toEqual([[0, 0], [1, 0], [1, 0.5]]);
  });
  it("passes through single-point and empty inputs", () => {
    expect(partialPath([], 0.5)).toEqual([]);
    expect(partialPath([[2, 2]], 0.5)).toEqual([[2, 2]]);
  });
});

describe("clamp01 / easeInOutCubic", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
  });
  it("eases monotonically from 0 to 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/route-animation.test.ts`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/lib/route-animation.ts`:

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/route-animation.ts src/lib/route-animation.test.ts
git commit -m "feat: partial-path interpolation utilities for route draw animation"
```

---

### Task 5: useRouteProgress hook(rAF 驅動進度)

**Files:**
- Create: `src/hooks/useRouteProgress.ts`
- Test: `src/hooks/useRouteProgress.test.ts`

**Interfaces:**
- Consumes: `easeInOutCubic`(Task 4)
- Produces: `useRouteProgress(key: unknown, durationMs: number, enabled?: boolean): number` — 回傳 0–1 進度;`key` 改變時重新從 0 播放;`enabled === false` 時恆為 1(reduced-motion 降級)。

- [ ] **Step 1: 寫失敗測試**

`src/hooks/useRouteProgress.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteProgress } from "@/hooks/useRouteProgress";

let now = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  now = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

function advance(ms: number) {
  now += ms;
  const pending = frames.splice(0);
  act(() => pending.forEach((cb) => cb(now)));
}

describe("useRouteProgress", () => {
  it("starts at 0 and reaches 1 after the duration", () => {
    const { result } = renderHook(() => useRouteProgress("a", 1000));
    expect(result.current).toBe(0);
    advance(500);
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1);
    advance(600);
    expect(result.current).toBe(1);
  });

  it("returns 1 immediately when disabled", () => {
    const { result } = renderHook(() => useRouteProgress("a", 1000, false));
    expect(result.current).toBe(1);
  });

  it("restarts from 0 when the key changes", () => {
    const { result, rerender } = renderHook(({ k }) => useRouteProgress(k, 1000), {
      initialProps: { k: "a" },
    });
    advance(1100);
    expect(result.current).toBe(1);
    rerender({ k: "b" });
    expect(result.current).toBe(0);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/hooks/useRouteProgress.test.ts`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/hooks/useRouteProgress.ts`:

```ts
import { useEffect, useState } from "react";
import { easeInOutCubic } from "@/lib/route-animation";

/**
 * Animates 0→1 over durationMs using requestAnimationFrame.
 * Restarts whenever `key` changes. When `enabled` is false the
 * progress is pinned at 1 (reduced-motion fallback).
 */
export function useRouteProgress(key: unknown, durationMs: number, enabled = true): number {
  const [progress, setProgress] = useState(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      setProgress(1);
      return;
    }
    setProgress(0);
    let raf = 0;
    const start = performance.now();
    const tick = (nowMs: number) => {
      const t = Math.min(1, (nowMs - start) / durationMs);
      setProgress(easeInOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, durationMs, enabled]);

  return progress;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRouteProgress.ts src/hooks/useRouteProgress.test.ts
git commit -m "feat: rAF-driven route draw progress hook"
```

---

### Task 6: useCameraController(flyTo / fitBounds / reduced-motion)

**Files:**
- Create: `src/hooks/useCameraController.ts`
- Test: `src/hooks/useCameraController.test.ts`
- Modify: `src/test/setup.ts`(補 matchMedia stub)

**Interfaces:**
- Consumes: `coordsBounds`(Task 3)、`MapRef` type(`@/components/ui/map`)
- Produces:
  - `prefersReducedMotion(): boolean`
  - `useCameraController(mapRef: RefObject<MapRef | null>)` 回傳:
    - `flyToSpot(lng: number, lat: number, opts?: { zoom?: number; pitch?: number; bearing?: number }): void` — 預設 zoom 14 / pitch 45 / bearing 0,duration 2200;reduced-motion 時改 `jumpTo`
    - `fitCoords(coords: [number, number][], opts?: { padding?: { top: number; bottom: number; left: number; right: number }; pitch?: number }): void` — 預設 padding `{ top: 80, bottom: 320, left: 48, right: 48 }`、pitch 30、duration 1800(reduced-motion 時 0);空座標陣列直接 return

- [ ] **Step 1: 在 src/test/setup.ts 加 matchMedia stub**

```ts
import "@testing-library/jest-dom/vitest";

// jsdom lacks matchMedia; components query prefers-reduced-motion.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

- [ ] **Step 2: 寫失敗測試**

`src/hooks/useCameraController.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCameraController } from "@/hooks/useCameraController";
import type { MapRef } from "@/components/ui/map";

function makeMap() {
  return { flyTo: vi.fn(), jumpTo: vi.fn(), fitBounds: vi.fn() } as unknown as MapRef;
}

let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) => ({ matches: reduced, media: query }) as MediaQueryList
  );
});

describe("useCameraController", () => {
  it("flies to a spot with cinematic defaults", () => {
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.flyToSpot(121.5, 25.0, { bearing: 15 });
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [121.5, 25.0],
        zoom: 14,
        pitch: 45,
        bearing: 15,
        duration: 2200,
        essential: true,
      })
    );
  });

  it("falls back to jumpTo under reduced motion", () => {
    reduced = true;
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.flyToSpot(121.5, 25.0);
    expect(map.jumpTo).toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("fits bounds around coordinates", () => {
    const map = makeMap();
    const { result } = renderHook(() => useCameraController({ current: map }));
    result.current.fitCoords([[121, 24], [122, 25]]);
    expect(map.fitBounds).toHaveBeenCalledWith(
      [[121, 24], [122, 25]],
      expect.objectContaining({ pitch: 30, duration: 1800 })
    );
  });

  it("does nothing without a map or coordinates", () => {
    const map = makeMap();
    const { result, rerender } = renderHook(({ m }) => useCameraController({ current: m }), {
      initialProps: { m: null as MapRef | null },
    });
    result.current.flyToSpot(121, 24);
    result.current.fitCoords([[121, 24]]);
    rerender({ m: map });
    result.current.fitCoords([]);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx vitest run src/hooks/useCameraController.test.ts`
Expected: FAIL(模組不存在)

- [ ] **Step 4: 實作**

`src/hooks/useCameraController.ts`:

```ts
import { useCallback, useMemo, type RefObject } from "react";
import type { MapRef } from "@/components/ui/map";
import { coordsBounds } from "@/lib/map-utils";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}

export interface FlyOptions {
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

export interface FitOptions {
  padding?: { top: number; bottom: number; left: number; right: number };
  pitch?: number;
}

const DEFAULT_FIT_PADDING = { top: 80, bottom: 320, left: 48, right: 48 };

export function useCameraController(mapRef: RefObject<MapRef | null>) {
  const flyToSpot = useCallback(
    (lng: number, lat: number, opts: FlyOptions = {}) => {
      const map = mapRef.current;
      if (!map) return;
      const target = {
        center: [lng, lat] as [number, number],
        zoom: opts.zoom ?? 14,
        pitch: opts.pitch ?? 45,
        bearing: opts.bearing ?? 0,
      };
      if (prefersReducedMotion()) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 2200, essential: true });
    },
    [mapRef]
  );

  const fitCoords = useCallback(
    (coords: [number, number][], opts: FitOptions = {}) => {
      const map = mapRef.current;
      if (!map || coords.length === 0) return;
      map.fitBounds(coordsBounds(coords), {
        padding: opts.padding ?? DEFAULT_FIT_PADDING,
        pitch: opts.pitch ?? 30,
        duration: prefersReducedMotion() ? 0 : 1800,
      });
    },
    [mapRef]
  );

  return useMemo(() => ({ flyToSpot, fitCoords }), [flyToSpot, fitCoords]);
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCameraController.ts src/hooks/useCameraController.test.ts src/test/setup.ts
git commit -m "feat: imperative camera controller with reduced-motion fallback"
```

---

### Task 7: useTripScene 場景狀態機

**Files:**
- Create: `src/hooks/useTripScene.ts`
- Test: `src/hooks/useTripScene.test.ts`

**Interfaces:**
- Consumes: `Spot`(Task 2)
- Produces:
  - `type Scene = "intro" | "explore" | "tour"`
  - `useTripScene(stops: Spot[])` 回傳 `{ scene: Scene; tourIndex: number; currentStop: Spot | undefined; autoPlay: boolean; startExplore(): void; startTour(): void; exitTour(): void; next(): void; prev(): void; gotoStop(i: number): void; toggleAutoPlay(): void }`
  - 行為:初始 scene `"intro"`;`startTour()` → scene `"tour"`、tourIndex 0、autoPlay true;autoplay 停留 spot 5000ms / transit 3000ms 後自動 next;到最後一站 autoPlay 自動關;`exitTour()` → `"explore"` 並停 autoplay;next/prev/gotoStop 邊界 clamp。

- [ ] **Step 1: 寫失敗測試**

`src/hooks/useTripScene.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTripScene } from "@/hooks/useTripScene";
import type { Spot } from "@/lib/types";

const mk = (id: string, type: Spot["type"] = "spot"): Spot => ({
  id, day: 1, order: 1, name: id, type, note: "",
  ...(type === "spot" ? { lat: 25, lng: 121 } : {}),
});

const stops = [mk("a"), mk("t", "transit"), mk("b")];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTripScene", () => {
  it("starts at intro and can enter explore", () => {
    const { result } = renderHook(() => useTripScene(stops));
    expect(result.current.scene).toBe("intro");
    act(() => result.current.startExplore());
    expect(result.current.scene).toBe("explore");
  });

  it("startTour enters tour at index 0 with autoplay on", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    expect(result.current.scene).toBe("tour");
    expect(result.current.tourIndex).toBe(0);
    expect(result.current.autoPlay).toBe(true);
    expect(result.current.currentStop?.id).toBe("a");
  });

  it("autoplay dwells 5s on spots and 3s on transit, stopping at the end", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => vi.advanceTimersByTime(4999));
    expect(result.current.tourIndex).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.tourIndex).toBe(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.tourIndex).toBe(2);
    expect(result.current.autoPlay).toBe(false);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.tourIndex).toBe(2);
  });

  it("toggleAutoPlay pauses the timer", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.toggleAutoPlay());
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.tourIndex).toBe(0);
  });

  it("next/prev/gotoStop clamp to bounds", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.prev());
    expect(result.current.tourIndex).toBe(0);
    act(() => result.current.gotoStop(99));
    expect(result.current.tourIndex).toBe(2);
    act(() => result.current.next());
    expect(result.current.tourIndex).toBe(2);
  });

  it("exitTour returns to explore and stops autoplay", () => {
    const { result } = renderHook(() => useTripScene(stops));
    act(() => result.current.startTour());
    act(() => result.current.exitTour());
    expect(result.current.scene).toBe("explore");
    expect(result.current.autoPlay).toBe(false);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/hooks/useTripScene.test.ts`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/hooks/useTripScene.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import type { Spot } from "@/lib/types";

export type Scene = "intro" | "explore" | "tour";

const SPOT_DWELL_MS = 5000;
const TRANSIT_DWELL_MS = 3000;

export function useTripScene(stops: Spot[]) {
  const [scene, setScene] = useState<Scene>("intro");
  const [tourIndex, setTourIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const lastIndex = stops.length - 1;
  const currentStop = scene === "tour" ? stops[tourIndex] : undefined;

  const startExplore = useCallback(() => {
    setScene("explore");
    setAutoPlay(false);
  }, []);

  const startTour = useCallback(() => {
    setScene("tour");
    setTourIndex(0);
    setAutoPlay(true);
  }, []);

  const exitTour = useCallback(() => {
    setScene("explore");
    setAutoPlay(false);
  }, []);

  const next = useCallback(
    () => setTourIndex((i) => Math.min(i + 1, lastIndex)),
    [lastIndex]
  );
  const prev = useCallback(() => setTourIndex((i) => Math.max(i - 1, 0)), []);
  const gotoStop = useCallback(
    (i: number) => setTourIndex(Math.min(Math.max(i, 0), lastIndex)),
    [lastIndex]
  );
  const toggleAutoPlay = useCallback(() => setAutoPlay((a) => !a), []);

  useEffect(() => {
    if (scene !== "tour" || !autoPlay) return;
    if (tourIndex >= lastIndex) {
      setAutoPlay(false);
      return;
    }
    const dwell = stops[tourIndex]?.type === "transit" ? TRANSIT_DWELL_MS : SPOT_DWELL_MS;
    const timer = setTimeout(
      () => setTourIndex((i) => Math.min(i + 1, lastIndex)),
      dwell
    );
    return () => clearTimeout(timer);
  }, [scene, autoPlay, tourIndex, lastIndex, stops]);

  return {
    scene,
    tourIndex,
    currentStop,
    autoPlay,
    startExplore,
    startTour,
    exitTour,
    next,
    prev,
    gotoStop,
    toggleAutoPlay,
  };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTripScene.ts src/hooks/useTripScene.test.ts
git commit -m "feat: intro/explore/tour scene state machine with autoplay"
```

---

### Task 8: category 圖示對照與 SpotCard

**Files:**
- Create: `src/lib/category.ts`
- Create: `src/components/SpotCard.tsx`
- Test: `src/components/SpotCard.test.tsx`

**Interfaces:**
- Consumes: `SpotCategory`、`Spot`(Task 2)、`dayColor`(Task 3)、`SpotNote`(既有)、`cn`(`@/lib/utils`)
- Produces:
  - `categoryIcon(category?: SpotCategory): LucideIcon`
  - `<SpotCard spot={Spot} onNoteChange?={(spotId, note) => void} className?={string} />` — 玻璃卡片:類別圖示、time/duration、名稱、description;`onNoteChange` 有給且 `spot.type === "spot"` 時渲染 SpotNote(aria-label `note-{id}`)。

- [ ] **Step 1: 寫失敗測試**

`src/components/SpotCard.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/SpotCard.test.tsx`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作 category.ts**

`src/lib/category.ts`:

```ts
import {
  Anchor,
  Bed,
  Car,
  Footprints,
  Landmark,
  MapPin,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { SpotCategory } from "@/lib/types";

const ICONS: Record<SpotCategory, LucideIcon> = {
  sight: MapPin,
  food: Utensils,
  stay: Bed,
  trail: Footprints,
  spring: Waves,
  harbor: Anchor,
  museum: Landmark,
  transit: Car,
};

export function categoryIcon(category?: SpotCategory): LucideIcon {
  return (category && ICONS[category]) || MapPin;
}
```

(若 lucide-react 這個版本缺少其中某個 icon 名,以編譯錯誤為準換成同義 icon,例如 `Bed` → `BedDouble`、`Footprints` → `Mountain`。)

- [ ] **Step 4: 實作 SpotCard.tsx**

```tsx
import { SpotNote } from "@/components/SpotNote";
import { categoryIcon } from "@/lib/category";
import { dayColor } from "@/lib/map-utils";
import type { Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpotCardProps {
  spot: Spot;
  onNoteChange?: (spotId: string, note: string) => void;
  className?: string;
}

export function SpotCard({ spot, onNoteChange, className }: SpotCardProps) {
  const Icon = categoryIcon(spot.category);
  const color = dayColor(spot.day);

  return (
    <div className={cn("glass p-4 text-slate-100", className)}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-xs text-slate-400">
            {spot.time && <span className="font-mono tracking-wide">{spot.time}</span>}
            {spot.duration && <span>· {spot.duration}</span>}
          </div>
          <h3 className="truncate text-base font-bold">{spot.name}</h3>
          {spot.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{spot.description}</p>
          )}
        </div>
      </div>
      {onNoteChange && spot.type === "spot" && (
        <SpotNote spotId={spot.id} value={spot.note} onChange={onNoteChange} />
      )}
    </div>
  );
}
```

同時把 `src/components/SpotNote.tsx` 的 Textarea className 從 `"mt-2"` 改成 `"mt-3 border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"`(深色化,行為不變)。

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS(含既有 SpotNote 測試)。

- [ ] **Step 6: Commit**

```bash
git add src/lib/category.ts src/components/SpotCard.tsx src/components/SpotCard.test.tsx src/components/SpotNote.tsx
git commit -m "feat: category icons and glass SpotCard with inline note editing"
```

---

### Task 9: IntroOverlay 開場卡

**Files:**
- Create: `src/components/IntroOverlay.tsx`
- Test: `src/components/IntroOverlay.test.tsx`

**Interfaces:**
- Consumes: `Button`(`@/components/ui/button`)、lucide `Play` / `Compass`
- Produces: `<IntroOverlay title dayCount spotCount onExplore onTour />`,props 型別:`{ title: string; dayCount: number; spotCount: number; onExplore: () => void; onTour: () => void }`

- [ ] **Step 1: 寫失敗測試**

`src/components/IntroOverlay.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/IntroOverlay.test.tsx`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/components/IntroOverlay.tsx`:

```tsx
import { Compass, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntroOverlayProps {
  title: string;
  dayCount: number;
  spotCount: number;
  onExplore: () => void;
  onTour: () => void;
}

export function IntroOverlay({ title, dayCount, spotCount, onExplore, onTour }: IntroOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-slate-950/80 p-6">
      <div className="max-w-md text-center text-slate-100 duration-700 animate-in fade-in slide-in-from-bottom-4">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
          Keelung — Yilan
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-wide sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-slate-300">
          {dayCount} 天 · {spotCount} 個地點 · 山海之間的小旅行
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={onTour}
            className="bg-cyan-400 font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:bg-cyan-300"
          >
            <Play className="size-4" /> 播放導覽
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onExplore}
            className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Compass className="size-4" /> 自由探索
          </Button>
        </div>
      </div>
    </div>
  );
}
```

(若 Button 元件不自帶 icon gap,將 icon 與文字包在 `<span className="flex items-center gap-2">` 內。)

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/IntroOverlay.tsx src/components/IntroOverlay.test.tsx
git commit -m "feat: intro overlay with tour/explore entry points"
```

---

### Task 10: TourHUD 導覽控制

**Files:**
- Create: `src/components/TourHUD.tsx`
- Test: `src/components/TourHUD.test.tsx`

**Interfaces:**
- Consumes: `Spot`(Task 2)、`SpotCard`(Task 8)、`dayColor`(Task 3)、`Button`、lucide `ChevronLeft` / `ChevronRight` / `Pause` / `Play` / `X` / `Car`
- Produces: `<TourHUD stops index autoPlay onPrev onNext onToggleAutoPlay onExit onGoto />`,props 型別:
  ```ts
  interface TourHUDProps {
    stops: Spot[];
    index: number;
    autoPlay: boolean;
    onPrev: () => void;
    onNext: () => void;
    onToggleAutoPlay: () => void;
    onExit: () => void;
    onGoto: (index: number) => void;
  }
  ```
  控制按鈕 aria-label:「上一站」「下一站」「暫停」/「自動播放」「結束導覽」;進度點 aria-label:「第 N 站」。

- [ ] **Step 1: 寫失敗測試**

`src/components/TourHUD.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/TourHUD.test.tsx`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/components/TourHUD.tsx`:

```tsx
import { Car, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotCard } from "@/components/SpotCard";
import { dayColor } from "@/lib/map-utils";
import type { Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TourHUDProps {
  stops: Spot[];
  index: number;
  autoPlay: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoPlay: () => void;
  onExit: () => void;
  onGoto: (index: number) => void;
}

function TransitCard({ stop }: { stop: Spot }) {
  return (
    <div className="glass p-4 text-slate-100">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300">
          <Car className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-slate-400">移動中</p>
          <h3 className="text-base font-bold">{stop.name}</h3>
          {stop.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{stop.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TourHUD({
  stops,
  index,
  autoPlay,
  onPrev,
  onNext,
  onToggleAutoPlay,
  onExit,
  onGoto,
}: TourHUDProps) {
  const stop = stops[index];
  if (!stop) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3">
        <div key={stop.id} className="duration-500 animate-in fade-in slide-in-from-bottom-2">
          {stop.type === "transit" ? <TransitCard stop={stop} /> : <SpotCard spot={stop} />}
        </div>

        <div className="glass flex items-center justify-between gap-2 px-3 py-2">
          <Button variant="ghost" size="sm" aria-label="上一站" disabled={index === 0} onClick={onPrev}
            className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {stops.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`第 ${i + 1} 站`}
                onClick={() => onGoto(i)}
                className={cn(
                  "size-2 rounded-full transition-all",
                  i === index && "size-2.5 shadow-[0_0_8px_currentColor]"
                )}
                style={{ backgroundColor: dayColor(s.day), opacity: i === index ? 1 : 0.4 }}
              />
            ))}
          </div>

          <Button variant="ghost" size="sm" aria-label={autoPlay ? "暫停" : "自動播放"}
            onClick={onToggleAutoPlay} className="text-slate-200 hover:bg-white/10 hover:text-white">
            {autoPlay ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button variant="ghost" size="sm" aria-label="下一站" disabled={index === stops.length - 1}
            onClick={onNext} className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="結束導覽" onClick={onExit}
            className="text-slate-200 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/TourHUD.tsx src/components/TourHUD.test.tsx
git commit -m "feat: tour HUD with stop card, progress dots, and autoplay controls"
```

---

### Task 11: ItinerarySheet(取代 ItineraryPanel)

**Files:**
- Create: `src/components/ItinerarySheet.tsx`
- Test: `src/components/ItinerarySheet.test.tsx`
- Delete: `src/components/ItineraryPanel.tsx`, `src/components/ItineraryPanel.test.tsx`

**Interfaces:**
- Consumes: `DayGroup`(Task 2)、`SpotCard`(Task 8)、`dayColor`(Task 3)、`categoryIcon`(Task 8)、Radix `Tabs`、`Button`、lucide `Download` / `Play`、`cn`
- Produces: `<ItinerarySheet ... />`,props 型別:
  ```ts
  interface ItinerarySheetProps {
    title: string;
    days: DayGroup[];
    activeDay: number;
    onDayChange: (day: number) => void;
    selectedSpotId: string | null;
    onSelect: (spotId: string) => void;
    onNoteChange: (spotId: string, note: string) => void;
    onExport: () => void;
    onStartTour: () => void;
  }
  ```
  行為:手機底部抽屜三段 snap(peek/half/full,swipe ≥40px 換段,tap 把手 peek↔half),桌面 `lg:` 固定左側面板;Day 分頁(role=tab,名稱 `Day 1` 格式);spot 按鈕點擊呼叫 `onSelect`;transit 為非互動文字;選中 spot 展開 SpotCard(含 note 編輯);「匯出 JSON」按鈕(aria-label 含 匯出)與「播放導覽」按鈕。外部選中 spot 時若在 peek 自動升到 half。

- [ ] **Step 1: 寫失敗測試(移植並擴充 ItineraryPanel 測試)**

`src/components/ItinerarySheet.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/ItinerarySheet.test.tsx`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

`src/components/ItinerarySheet.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotCard } from "@/components/SpotCard";
import { categoryIcon } from "@/lib/category";
import { dayColor } from "@/lib/map-utils";
import type { DayGroup, Spot } from "@/lib/types";
import { cn } from "@/lib/utils";

type SnapState = "peek" | "half" | "full";
const SNAP_ORDER: SnapState[] = ["peek", "half", "full"];
const SWIPE_THRESHOLD_PX = 40;

function nextSnap(current: SnapState, direction: 1 | -1): SnapState {
  const i = SNAP_ORDER.indexOf(current) + direction;
  return SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, Math.max(0, i))];
}

interface ItinerarySheetProps {
  title: string;
  days: DayGroup[];
  activeDay: number;
  onDayChange: (day: number) => void;
  selectedSpotId: string | null;
  onSelect: (spotId: string) => void;
  onNoteChange: (spotId: string, note: string) => void;
  onExport: () => void;
  onStartTour: () => void;
}

function TimelineItem({
  spot,
  selected,
  onSelect,
  onNoteChange,
}: {
  spot: Spot;
  selected: boolean;
  onSelect: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const color = dayColor(spot.day);
  const Icon = categoryIcon(spot.category);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (spot.type === "transit") {
    return (
      <li ref={ref} className="relative py-1 pl-7">
        <span className="absolute bottom-0 left-[5px] top-0 w-px bg-white/10" aria-hidden />
        <span className="block px-2 py-1 text-sm italic text-slate-400">{spot.name}</span>
      </li>
    );
  }

  return (
    <li ref={ref} className="relative pl-7">
      <span className="absolute bottom-0 left-[5px] top-0 w-px bg-white/10" aria-hidden />
      <span
        className="absolute left-0 top-3.5 size-[11px] rounded-full border-2 border-slate-950"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => onSelect(spot.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/5",
          selected && "bg-white/10 font-medium text-white"
        )}
      >
        {spot.time && (
          <span className="w-11 shrink-0 font-mono text-xs text-slate-400">{spot.time}</span>
        )}
        <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate">{spot.name}</span>
      </button>
      {selected && (
        <div className="pb-2 pr-2 pt-1 duration-300 animate-in fade-in slide-in-from-top-1">
          <SpotCard spot={spot} onNoteChange={onNoteChange} className="border-white/5 bg-slate-950/60 shadow-none" />
        </div>
      )}
    </li>
  );
}

export function ItinerarySheet({
  title,
  days,
  activeDay,
  onDayChange,
  selectedSpotId,
  onSelect,
  onNoteChange,
  onExport,
  onStartTour,
}: ItinerarySheetProps) {
  const [snap, setSnap] = useState<SnapState>("half");
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (selectedSpotId) setSnap((s) => (s === "peek" ? "half" : s));
  }, [selectedSpotId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom */
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // >0 means swiped up
    dragStartY.current = null;
    if (delta > SWIPE_THRESHOLD_PX) setSnap((s) => nextSnap(s, 1));
    else if (delta < -SWIPE_THRESHOLD_PX) setSnap((s) => nextSnap(s, -1));
    else setSnap((s) => (s === "peek" ? "half" : "peek"));
  };

  return (
    <section
      aria-label="行程列表"
      className={cn(
        "glass fixed inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-b-none border-b-0 transition-[height] duration-300 ease-out",
        snap === "peek" && "h-20",
        snap === "half" && "h-[45dvh]",
        snap === "full" && "h-[85dvh]",
        "lg:inset-auto lg:bottom-4 lg:left-4 lg:top-4 lg:h-auto lg:w-96 lg:rounded-2xl lg:border-b"
      )}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center py-2 lg:hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        role="presentation"
      >
        <span className="h-1 w-10 rounded-full bg-white/20" />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 lg:pt-4">
        <h2 className="truncate text-sm font-bold text-slate-100">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onStartTour}
            className="text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200">
            <Play className="size-4" /> 播放導覽
          </Button>
          <Button variant="ghost" size="sm" aria-label="匯出 JSON" onClick={onExport}
            className="text-slate-300 hover:bg-white/10 hover:text-white">
            <Download className="size-4" />
          </Button>
        </div>
      </header>

      <Tabs
        value={String(activeDay)}
        onValueChange={(v) => onDayChange(Number(v))}
        className="flex min-h-0 flex-1 flex-col px-4 pb-4"
      >
        <TabsList className="shrink-0 bg-white/5">
          {days.map((d) => (
            <TabsTrigger
              key={d.day}
              value={String(d.day)}
              style={activeDay === d.day ? { backgroundColor: `${dayColor(d.day)}26`, color: dayColor(d.day) } : undefined}
            >
              Day {d.day}
            </TabsTrigger>
          ))}
        </TabsList>

        {days.map((d) => (
          <TabsContent key={d.day} value={String(d.day)} className="min-h-0 flex-1 overflow-y-auto">
            <ol className="space-y-0.5 py-2">
              {d.spots.map((s) => (
                <TimelineItem
                  key={s.id}
                  spot={s}
                  selected={s.id === selectedSpotId}
                  onSelect={onSelect}
                  onNoteChange={onNoteChange}
                />
              ))}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
```

- [ ] **Step 4: 刪除舊元件與測試**

```bash
git rm src/components/ItineraryPanel.tsx src/components/ItineraryPanel.test.tsx
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test && npm run lint`
Expected: 全部 PASS;此時 `App.tsx` 仍 import ItineraryPanel 會使 `npm run build`(tsc)失敗——**允許**,Task 13 會改 App;先確認 vitest 與 lint 乾淨即可。若 lint 對 App.tsx 的壞 import 報錯,將 App.tsx 的修改提前到此 task 一併最小化處理(暫時改 import 成 ItinerarySheet 並補齊必要 props,詳見 Task 13 的 App 程式碼)。

- [ ] **Step 6: Commit**

```bash
git add src/components/ItinerarySheet.tsx src/components/ItinerarySheet.test.tsx
git commit -m "feat: draggable itinerary sheet with timeline list, replacing ItineraryPanel"
```

---

### Task 12: TripMap 重寫(霓虹路線動畫 + 編號徽章 marker)

**Files:**
- Modify: `src/components/TripMap.tsx`

**Interfaces:**
- Consumes: `Map` / `MapMarker` / `MarkerContent` / `MarkerLabel` / `MapRoute` / `MapControls` / `MapRef`(`@/components/ui/map`)、`dayColor` / `markerSpots` / `routeCoordinates`(Task 3)、`partialPath` / `clamp01`(Task 4)、`useRouteProgress`(Task 5)、`prefersReducedMotion`(Task 6)、`Scene`(Task 7)
- Produces:
  ```ts
  interface TripMapProps {
    days: DayGroup[];
    activeDay: number;
    selectedSpotId: string | null;
    scene: Scene;
    onSelectSpot: (spotId: string) => void;
    mapRef: RefObject<MapRef | null>;
  }
  ```
  行為:intro 場景三天路線接續繪出(單一進度 × 3 分段);explore/tour 場景切換 activeDay 時該日重繪,非 active 日路線降為細線 40%/光暈 6%;marker 為 day 色編號徽章,選中放大 + `marker-pulse` + `MarkerLabel` 顯示名稱。

- [ ] **Step 1: 改寫 TripMap.tsx**

```tsx
import { Fragment, type CSSProperties, type RefObject } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  type MapRef,
} from "@/components/ui/map";
import { prefersReducedMotion } from "@/hooks/useCameraController";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import type { Scene } from "@/hooks/useTripScene";
import { dayColor, markerSpots, routeCoordinates } from "@/lib/map-utils";
import { clamp01, partialPath } from "@/lib/route-animation";
import type { DayGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TripMapProps {
  days: DayGroup[];
  activeDay: number;
  selectedSpotId: string | null;
  scene: Scene;
  onSelectSpot: (spotId: string) => void;
  mapRef: RefObject<MapRef | null>;
}

// Frames the whole Keelung–Yilan trip on first paint (before any camera call).
const INITIAL_VIEW = { center: [121.72, 24.86] as [number, number], zoom: 8.6, pitch: 30 };

export function TripMap({
  days,
  activeDay,
  selectedSpotId,
  scene,
  onSelectSpot,
  mapRef,
}: TripMapProps) {
  const markers = markerSpots(days);
  const reduced = prefersReducedMotion();
  const introProgress = useRouteProgress("intro", 2600, scene === "intro" && !reduced);
  const dayProgress = useRouteProgress(activeDay, 1400, scene !== "intro" && !reduced);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        theme="dark"
        className="h-full w-full"
        center={INITIAL_VIEW.center}
        zoom={INITIAL_VIEW.zoom}
        pitch={INITIAL_VIEW.pitch}
      >
        {days.map((d) => {
          const coords = routeCoordinates(d);
          const isActive = d.day === activeDay;
          const progress =
            scene === "intro"
              ? clamp01(introProgress * days.length - (d.day - 1))
              : isActive
                ? dayProgress
                : 1;
          const drawn = partialPath(coords, progress);
          const color = dayColor(d.day);
          const dim = scene !== "intro" && !isActive;
          return (
            <Fragment key={d.day}>
              <MapRoute
                id={`glow-${d.day}`}
                coordinates={drawn}
                color={color}
                width={10}
                opacity={dim ? 0.06 : 0.25}
                interactive={false}
              />
              <MapRoute
                id={`line-${d.day}`}
                coordinates={drawn}
                color={color}
                width={dim ? 2 : 3.5}
                opacity={dim ? 0.4 : 0.95}
                interactive={false}
              />
            </Fragment>
          );
        })}

        {markers.map((s) => {
          const selected = s.id === selectedSpotId;
          const color = dayColor(s.day);
          return (
            <MapMarker key={s.id} longitude={s.lng!} latitude={s.lat!} onClick={() => onSelectSpot(s.id)}>
              <MarkerContent>
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border border-white/70 text-[11px] font-bold text-slate-950 shadow-lg transition-transform duration-300",
                    selected && "marker-pulse scale-125"
                  )}
                  style={{ backgroundColor: color, "--pulse-color": `${color}88` } as CSSProperties}
                  aria-label={s.name}
                >
                  {s.order}
                </div>
                {selected && (
                  <MarkerLabel className="text-xs font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                    {s.name}
                  </MarkerLabel>
                )}
              </MarkerContent>
            </MapMarker>
          );
        })}
        <MapControls position="bottom-right" />
      </Map>
    </div>
  );
}
```

- [ ] **Step 2: 型別檢查**

Run: `npx tsc -b --force`
Expected: TripMap 本身無錯;`App.tsx` 對 TripMap 的舊 props 會報錯——允許,Task 13 修。若希望此步全綠,可將 Task 13 的 App.tsx 改寫先行套用(兩個 task 一起 commit 亦可)。

- [ ] **Step 3: Commit**

```bash
git add src/components/TripMap.tsx
git commit -m "feat: neon glow routes with draw animation and numbered day markers"
```

---

### Task 13: App 組裝、鏡頭連動與收尾

**Files:**
- Modify: `src/App.tsx`
- Modify: `docs/superpowers/specs/2026-07-07-ui-ux-upgrade-design.md`(如實作偏差需同步,通常不用)

**Interfaces:**
- Consumes: 前面所有 task 的輸出:`useTripData`(既有)、`useTripScene`(Task 7)、`useCameraController`(Task 6)、`tourStops` / `allCoordinates` / `routeCoordinates` / `transitContext`(Task 3)、`TripMap`(Task 12)、`IntroOverlay`(Task 9)、`ItinerarySheet`(Task 11)、`TourHUD`(Task 10)、`MapRef`
- Produces: 完整可用的 App;鏡頭連動規則:
  - explore 點選景點 → `flyToSpot(lng, lat, { pitch: 35 })` 並把 activeDay 同步為該景點的 day
  - explore 切 Day 分頁 → `fitCoords(routeCoordinates(day))`
  - tour 換站:spot → `flyToSpot(lng, lat, { bearing: index % 2 ? 18 : -18 })`;transit → `fitCoords(transitContext(stops, index))`
  - tour 中 activeDay 跟隨 currentStop.day;marker 點擊在 tour 中改為 `gotoStop`
  - exitTour 後選中站點保留為離開時的站

- [ ] **Step 1: 改寫 App.tsx**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { IntroOverlay } from "@/components/IntroOverlay";
import { ItinerarySheet } from "@/components/ItinerarySheet";
import { TourHUD } from "@/components/TourHUD";
import { TripMap } from "@/components/TripMap";
import type { MapRef } from "@/components/ui/map";
import { useCameraController } from "@/hooks/useCameraController";
import { useTripData } from "@/hooks/useTripData";
import { useTripScene } from "@/hooks/useTripScene";
import { routeCoordinates, tourStops, transitContext } from "@/lib/map-utils";

export default function App() {
  const { title, days, spots, updateNote, exportJson } = useTripData();
  const stops = useMemo(() => tourStops(days), [days]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number>(days[0]?.day ?? 1);
  const mapRef = useRef<MapRef | null>(null);
  const camera = useCameraController(mapRef);
  const {
    scene, tourIndex, currentStop, autoPlay,
    startExplore, startTour, exitTour, next, prev, gotoStop, toggleAutoPlay,
  } = useTripScene(stops);

  const spotCount = useMemo(() => spots.filter((s) => s.type === "spot").length, [spots]);

  // Tour: camera follows the current stop; keep activeDay in sync for route dimming.
  useEffect(() => {
    if (scene !== "tour" || !currentStop) return;
    setActiveDay(currentStop.day);
    setSelectedSpotId(currentStop.id);
    if (typeof currentStop.lng === "number" && typeof currentStop.lat === "number") {
      camera.flyToSpot(currentStop.lng, currentStop.lat, { bearing: tourIndex % 2 ? 18 : -18 });
    } else {
      camera.fitCoords(transitContext(stops, tourIndex));
    }
  }, [scene, currentStop, tourIndex, stops, camera]);

  const handleSelectSpot = (spotId: string) => {
    if (scene === "tour") {
      gotoStop(stops.findIndex((s) => s.id === spotId));
      return;
    }
    setSelectedSpotId(spotId);
    const spot = stops.find((s) => s.id === spotId);
    if (!spot) return;
    setActiveDay(spot.day);
    if (typeof spot.lng === "number" && typeof spot.lat === "number") {
      camera.flyToSpot(spot.lng, spot.lat, { pitch: 35 });
    }
  };

  const handleDayChange = (day: number) => {
    setActiveDay(day);
    const group = days.find((d) => d.day === day);
    if (group) camera.fitCoords(routeCoordinates(group));
  };

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trip.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-950">
      <TripMap
        days={days}
        activeDay={activeDay}
        selectedSpotId={selectedSpotId}
        scene={scene}
        onSelectSpot={handleSelectSpot}
        mapRef={mapRef}
      />
      {scene === "intro" && (
        <IntroOverlay
          title={title}
          dayCount={days.length}
          spotCount={spotCount}
          onExplore={startExplore}
          onTour={startTour}
        />
      )}
      {scene === "explore" && (
        <ItinerarySheet
          title={title}
          days={days}
          activeDay={activeDay}
          onDayChange={handleDayChange}
          selectedSpotId={selectedSpotId}
          onSelect={handleSelectSpot}
          onNoteChange={updateNote}
          onExport={handleExport}
          onStartTour={startTour}
        />
      )}
      {scene === "tour" && (
        <TourHUD
          stops={stops}
          index={tourIndex}
          autoPlay={autoPlay}
          onPrev={prev}
          onNext={next}
          onToggleAutoPlay={toggleAutoPlay}
          onExit={exitTour}
          onGoto={gotoStop}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 全面驗證**

Run: `npm test && npm run lint && npm run build`
Expected: 測試全綠、lint 乾淨、build 成功。

- [ ] **Step 3: 手動驗證(必要)**

Run: `npm run dev`,用瀏覽器(建議手機視窗寬度 390px 與桌面寬度各驗一次)檢查:

1. 開場:深色地圖、標題卡浮現、三天路線依序畫出。
2. 「自由探索」:抽屜出現在底部(桌面為左側面板);拖把手上滑/下滑換段;切 Day 分頁鏡頭 fit 該日路線且路線重繪;點景點鏡頭飛過去、marker 放大發光、列表展開卡片、備註可編輯且重整後保留。
3. 「播放導覽」:自動逐站飛行,spot 停 5 秒、「移動中」卡停 3 秒;上一站/下一站/暫停/結束導覽都正常;transit 站鏡頭涵蓋前後兩站。
4. 匯出 JSON 下載檔案內含新欄位。
5. 系統開啟「減少動態效果」時(macOS: 系統設定 > 輔助使用 > 顯示器)重整頁面,鏡頭直接跳轉、路線直接畫滿。

發現問題就地修復後重跑 Step 2。

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: compose scene-driven app with cinematic camera wiring"
```

---

## Self-Review 紀錄

- **Spec coverage**:intro/explore/tour(Task 7、9、10、11、13)、鏡頭 flyTo/fitBounds + reduced-motion(Task 6)、路線光暈與繪製動畫(Task 4、5、12)、marker 編號徽章與脈衝(Task 1、12)、深色主題與字體(Task 1)、day 霓虹色(Task 3)、資料擴充與預填(Task 2)、transit 過場(Task 3、10、13)、自動播放 5s/3s(Task 7)、備註 localStorage 與匯出(既有 + Task 11、13)、錯誤處理(無座標跳過:Task 3/13;localStorage:既有;底圖失敗:列表仍可用,由 overlay 架構保證)——全數對應。
- **Placeholder scan**:無 TBD/TODO;所有程式碼步驟皆附完整程式碼。
- **Type consistency**:`Scene`、`SpotCategory`、`tourStops`、`transitContext`、`coordsBounds`、`partialPath`、`useRouteProgress(key, durationMs, enabled)`、`flyToSpot(lng, lat, opts)`、`fitCoords(coords, opts)`、各元件 props 名稱已跨 task 核對一致。
