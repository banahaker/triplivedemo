# Showtrip UI/UX 全面升級設計

日期:2026-07-07
狀態:已與使用者確認

## 目標與背景

現有 App 過於簡陋:全螢幕地圖 + 底部一個 shadcn 預設樣式的行程面板,難以流暢地展示行程。本次升級目標是把 showtrip 變成一個「漂亮地展示行程給同行友人看」的沉浸式體驗。

**確認的需求:**

- **用途**:展示/分享給同行友人看,視覺呈現優先於編輯功能。
- **裝置**:手機為主(傳連結到群組),桌面有對應的側欄佈局。
- **風格**:深色沉浸感——深色底圖、玻璃擬態卡片、霓虹色路線。
- **圖像**:不用照片,靠色彩、排版、圖示、地圖本身取勝。
- **資料**:擴充欄位(時段、簡介、停留時間、類別)並預填基隆宜蘭行程的合理內容。
- **功能**:逐站導覽模式、行程總覽/開場動畫、路線繪製動畫與微動效;保留備註編輯與匯出 JSON。

## 架構:場景狀態機

App 層持有場景狀態,驅動地圖鏡頭與 UI 覆蓋層:

```
scene: "intro" | "explore" | "tour"
activeDay: number
selectedSpotId: string | null
tourIndex: number          // tour 模式的當前站
autoPlay: boolean
```

### Intro(開場)

- 載入後鏡頭 `fitBounds` 總覽全部景點,微傾斜、緩慢 zoom。
- 三天路線逐段繪製出現(路線動畫)。
- 中央標題卡:旅程名稱、天數、景點數、英文副標(KEELUNG—YILAN)。
- 兩顆按鈕:「自由探索」→ explore,「播放導覽」→ tour。

### Explore(自由瀏覽)

- 手機:底部抽屜(bottom sheet),可拖曳三段——收合 peek / 半開 / 全開,有拖曳把手。
- 桌面(≥lg):左側浮動玻璃面板。
- 內容:Day 分頁(day 色)+ 時間軸式景點列表(時段、類別圖示、名稱)。
- 點景點 → 鏡頭平滑 flyTo + 展開 SpotCard(簡介、停留時間、備註編輯)。
- 匯出 JSON 收在面板選單;可隨時切回 tour 或重看 intro。

### Tour(逐站導覽)

- HUD:上一站/下一站按鈕、進度指示(每站一點,day 色)、自動播放開關、退出鈕。
- 每站鏡頭電影感 `flyTo`:zoom ~14、pitch 45°、輕微 bearing 旋轉。
- 底部顯示景點資訊卡(名稱、時段、簡介),換站時交叉淡出。
- 無座標的 transit 項目顯示「移動中」過場卡,鏡頭 `fitBounds` 涵蓋前後兩站。
- 自動播放:每站停留 5 秒後自動前進(transit 過場 3 秒),可暫停;到最後一站自動停止。

### 鏡頭控制

- **放棄 controlled viewport**(現有實作用 `jumpTo`,無法平滑飛行)。
- 改用 map ref 直接呼叫原生 `flyTo` / `fitBounds`,由 `useCameraController` hook 統一管理。
- 尊重 `prefers-reduced-motion`:降級為直接跳轉、跳過路線繪製動畫。

## 視覺系統

- **強制深色**:`<html class="dark">`,底圖用現成 Carto dark-matter(`ui/map.tsx` 已支援)。
- **卡片**:玻璃擬態——`bg-slate-900/70` + `backdrop-blur` + `border-white/10`,rounded-2xl。
- **Day 色彩**(貫穿路線、marker、分頁、進度指示):
  - Day 1(基隆海線)= cyan `#22d3ee`
  - Day 2(宜蘭平原)= emerald `#34d399`
  - Day 3(蘇澳南方澳)= violet `#a78bfa`
- **發光**:選中元素用同色 glow(`box-shadow` 光暈;路線加寬版低透明度底線模擬霓虹)。
- **字體**:標題 Noto Sans TC(Google Fonts,700/900),內文系統字體。Intro 大字級標題 + 小型英文副標。

## 地圖層次與動畫

- **路線**:每天兩層 line——寬 10px / 透明度 0.25 光暈底層 + 寬 3.5px 霓虹主線。非當前 Day 降為 40% 透明度細線。
- **路線繪製動畫**:進場與切換 Day 時以 `requestAnimationFrame` 逐段餵座標(含線段內插),1.2–1.8 秒畫完。
- **Marker**:一律為順序編號圓形徽章(day 色底、白字);選中時放大 + CSS 光暈脈衝 + 名稱標籤。類別 lucide 圖示只用在列表與 SpotCard,不上地圖。
- **UI 動效**:抽屜 spring 過渡、卡片 fade+slide、tour 換站交叉淡出。全部 CSS transition/animation(Tailwind + tailwindcss-animate),不引入動畫函式庫。

## 資料擴充

```ts
interface Spot {
  id: string; day: number; order: number; name: string;
  type: "spot" | "transit";
  lat?: number; lng?: number;
  note: string;
  // 新增(皆 optional,向後相容)
  category?: "sight" | "food" | "stay" | "trail" | "spring" | "harbor" | "museum" | "transit";
  time?: string;        // 預計時段,如 "09:00"
  duration?: string;    // 停留時間,如 "1.5 小時"
  description?: string; // 一兩句景點簡介
}
```

- 每個 category 對應一個 lucide 圖示。
- 全部 21 筆景點預填合理的時段、停留時間與一兩句簡介。
- `useTripData` 向後相容:舊格式 JSON 匯入仍可用,匯出帶完整欄位;備註沿用 localStorage。

## 元件與模組(單一職責)

| 模組 | 職責 |
|---|---|
| `App.tsx` | 場景狀態持有與組裝 |
| `hooks/useTripScene.ts` | scene/tour 狀態機(next/prev/goto/autoplay 計時、transit 過場判斷) |
| `hooks/useCameraController.ts` | flyTo / fitBounds / reduced-motion 降級 |
| `components/IntroOverlay.tsx` | 開場標題卡與入口按鈕 |
| `components/TourHUD.tsx` | 導覽控制列與進度指示 |
| `components/SpotCard.tsx` | 景點資訊卡(tour 與 explore 共用) |
| `components/ItinerarySheet.tsx` | 取代 ItineraryPanel:手機抽屜/桌面側欄 + Day 分頁 + 時間軸 |
| `components/TripMap.tsx` | 路線動畫層、marker 徽章 |
| `lib/route-animation.ts` | rAF 逐段繪製的純函式(可單元測試) |

`ui/map.tsx` 保留不動,必要時小幅擴充。舊 `ItineraryPanel`、`SpotNote` 由新元件取代(SpotNote 的 debounce/flush 邏輯併入 SpotCard)。

## 錯誤處理

- 底圖載入失敗:行程列表照常可用,地圖區顯示深色底。
- 無座標項目:地圖 marker 與 tour 相機邏輯安全跳過;tour 中以過場卡呈現。
- localStorage 不可用:備註僅存記憶體,不擋操作。

## 測試(vitest,沿用現有設定)

- `useTripScene`:換站邊界、autoplay 計時、transit 過場判斷。
- `route-animation`:內插與進度函式的純函式測試。
- 資料 schema 驗證:trip.json 全欄位合法、時間格式正確。
- `ItinerarySheet` 互動測試:選點、Day 切換、備註編輯(改寫現有 ItineraryPanel 測試)。
- 現有測試全數修至綠燈。
