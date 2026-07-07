# showtrip — 行程展示 webapp 設計文件

**日期**：2026-07-07
**狀態**：設計確認，待實作規劃

## 目標

把一趟已排好的三天旅行（基隆 → 宜蘭 → 蘇澳一帶）做成一個展示用 webapp。核心：

1. 底部可收合面板，分天顯示行程順序，每個景點能寫 Note。
2. 全螢幕地圖背景，用 marker 與路徑呈現景點相對位置與移動順序。
3. Note 以 JSON 儲存，之後可部署上線。

## 技術棧

- **前端**：Vite + React + TypeScript
- **樣式**：Tailwind CSS + shadcn/ui
- **地圖**：mapcn（基於 MapLibre GL，使用 CARTO 免費圖磚，**免 API key**）
  - 元件：`Map`、`MapMarker`、`MapPopup`、`MapRoute`、`MapControls`
- **建置產物**：純靜態 SPA
- **部署**：Cloudflare Pages（靜態託管，零後端）
- **測試**：Vitest + React Testing Library

不使用 3D 地圖、不使用 Mapbox、不使用後端資料庫。

## 畫面佈局

```
┌─────────────────────────────────────────┐
│                                          │
│                                          │
│            全螢幕地圖背景                 │
│         (marker + 每日路徑)               │
│                                          │
│                         [MapControls] →  │
│                                          │
├─────────────────────────────────────────┤
│  [Day1] [Day2] [Day3]      [匯出 JSON]   │ ← 底部面板 header
│  1. 台北車站集合                          │
│  2. 正濱漁港彩色街屋   ▸ Note...          │ ← 可收合 bottom sheet
│  3. 望海巷跨海景觀橋                       │
└─────────────────────────────────────────┘
```

- 地圖鋪滿整個視窗，作為 app 背景。
- 底部面板疊在地圖上方，可收合（展開時佔畫面下半部，收合成一條 bar）。

## 元件架構

各單元職責單一、以明確介面溝通、可獨立理解與測試。

### `App`
- 持有共享狀態 `selectedSpotId`（被地圖與面板共用）。
- 組裝 `TripMap` 與 `ItineraryPanel`，透過 `useTripData` 提供資料。

### `useTripData()`（資料 hook）
- **職責**：載入種子資料、合併 localStorage 覆寫、提供查詢與更新介面。
- **輸入**：`src/data/trip.json`（種子）＋ localStorage。
- **輸出**：
  - `days`：依天分組、依 order 排序的景點清單。
  - `updateNote(spotId, note)`：更新 note，即時寫入 localStorage。
  - `exportJson()`：把目前狀態序列化成新的 `trip.json` 內容供下載。
  - `importJson(text)`（可選）：載入外部 JSON。
- **合併規則**：載入時以 spot `id` 為 key，把 localStorage 的 note 蓋在種子 note 之上。
- **降級**：localStorage 不可用時退回記憶體暫存（重整會消失，但不崩潰）。

### `TripMap`（地圖層）
- **職責**：全螢幕地圖，畫 marker、每日路徑、控制項。
- 每個有座標的景點一個 `MapMarker`，顏色依 `day` 區分（三色）。
- 每天一條 `MapRoute`，依 `order` 連接當天景點（**直線 polyline**，用來表達順序與相對位置；非真實道路導航路線）。
- `MapControls`：縮放、指北、定位、全螢幕。
- 點 marker → 設定 `selectedSpotId`：地圖 `flyTo` 該點、開 `MapPopup`。
- 監看 `selectedSpotId`：外部（面板）選取時，地圖同步 fly 過去。
- 缺座標的項目不畫 marker。

### `ItineraryPanel`（底部面板）
- **職責**：分天列出行程，處理選取與 Note 編輯。
- 三天分段（Day1/2/3 tabs 或 sections）。
- 每個景點一列，依 order 顯示。點某列 → 設定 `selectedSpotId` 並展開該景點的 `SpotNote`。
- `selectedSpotId` 改變時（例如由地圖 marker 觸發）→ 高亮並捲動到對應列。
- header 有「匯出 JSON」按鈕（呼叫 `exportJson` 並觸發下載）與可選匯入。
- 「路段說明」型項目（無座標）以純文字列顯示，不可選取到地圖。

### `SpotNote`（Note 編輯）
- **職責**：單一景點的 note 編輯框。
- `textarea`，變更經 debounce 後呼叫 `updateNote`。

## 資料流

```
trip.json (種子) ──┐
                   ├─► useTripData ──► days ──► TripMap + ItineraryPanel
localStorage ──────┘         ▲                      │
                             │                      │ 使用者選取 marker / 面板列
        updateNote ◄─────────┼──────────────────────┘  → setSelectedSpotId (lifted to App)
        (寫 localStorage)     │
                             └── exportJson → 下載新的 trip.json
```

- 選取狀態 `selectedSpotId` 提升到 `App`，地圖與面板雙向同步。
- 編輯 note → `updateNote` → localStorage + state。
- 匯出 → 序列化目前 spots + notes → 瀏覽器下載。

## 資料模型

`src/data/trip.json`：

```json
{
  "title": "基隆宜蘭三日遊",
  "spots": [
    {
      "id": "d1-taipei-station",
      "day": 1,
      "order": 1,
      "name": "台北車站集合",
      "type": "spot",
      "lat": 25.0478,
      "lng": 121.5170,
      "note": ""
    }
  ]
}
```

欄位：
- `id`：穩定唯一鍵（localStorage 與匯出合併用）。
- `day`：1/2/3。
- `order`：當天順序。
- `name`：顯示名稱（取自 `list.txt`）。
- `type`：`"spot"`（有 marker）或 `"transit"`（路段說明，無 marker）。
- `lat` / `lng`：經緯度；`transit` 型可省略。
- `note`：種子 note（預設空字串）。

### 景點座標（初版，實作時再校正）

座標為概略值，實作階段會逐一確認；缺座標不影響面板顯示。

| id | day | name | 處理 | lat | lng |
|----|-----|------|------|-----|-----|
| d1-taipei-station | 1 | 台北車站集合 | spot | 25.0478 | 121.5170 |
| d1-zhengbin | 1 | 正濱漁港彩色街屋 | spot | 25.1533 | 121.7756 |
| d1-wanghaixiang | 1 | 望海巷跨海景觀橋 | spot | 25.1389 | 121.7961 |
| d1-chaojing | 1 | 潮境公園 | spot | 25.1408 | 121.8033 |
| d1-badouzi | 1 | 八斗子 | spot | 25.1370 | 121.7997 |
| d1-miaokou | 1 | 基隆廟口夜市 | spot | 25.1286 | 121.7419 |
| d1-keelung-stay | 1 | 基隆住宿 | spot（基隆市區） | 25.1276 | 121.7392 |
| d2-transit | 2 | 基隆前往宜蘭（走國五 or 台2 海岸線） | transit | — | — |
| d2-yilan-memorial | 2 | 宜蘭設治紀念館 | spot | 24.7522 | 121.7539 |
| d2-lanyang | 2 | 蘭陽博物館 | spot | 24.8697 | 121.8306 |
| d2-jiaoxi | 2 | 礁溪溫泉區 | spot | 24.8275 | 121.7708 |
| d2-luodong-forestry | 2 | 羅東林業文化園區 | spot | 24.6786 | 121.7681 |
| d2-brown-ave | 2 | 冬山伯朗大道 | spot | 24.6317 | 121.7936 |
| d2-zhongshan-trail | 2 | 中山亭步道 | spot | 24.6533 | 121.7644 |
| d2-dongmen | 2 | 東門夜市 | spot | 24.7561 | 121.7597 |
| d3-suao-cold-spring | 3 | 蘇澳冷泉 | spot | 24.5942 | 121.8497 |
| d3-qixingling | 3 | 七星嶺步道 | spot | 24.5983 | 121.8556 |
| d3-nanfangao-deck | 3 | 南方澳觀景台 | spot | 24.5847 | 121.8600 |
| d3-fenniaolin | 3 | 粉鳥林 | spot | 24.5211 | 121.8497 |
| d3-back-taipei | 3 | 回台北 | spot（台北車站） | 25.0478 | 121.5170 |

> 註：`list.txt` 中「七星領步道」判定為「七星嶺步道」（蘇澳）。實作時一併確認。

## 錯誤處理

- **缺座標**：`transit` 或未填座標的項目不畫 marker，但仍列在面板。
- **localStorage 不可用**：退回記憶體暫存，app 不崩潰。
- **地圖圖磚載入失敗**：CARTO 免費圖磚，一般穩定；失敗時顯示簡單 fallback 訊息，面板功能不受影響。
- **匯入格式錯誤**：驗證失敗時提示並不套用，維持現有資料。

## 測試策略

- **`useTripData`**：種子＋localStorage 合併、`updateNote` 寫入與讀回、`exportJson` 產出正確結構、localStorage 降級。
- **`ItineraryPanel`**：分天渲染、點列設定 `selectedSpotId`、外部選取時高亮對應列、`transit` 列不可選。
- **`SpotNote`**：輸入 → debounce → 呼叫 `updateNote`。
- 地圖 canvas 互動不做單元測試（改以資料與選取邏輯覆蓋）。

## 明確不做（YAGNI）

- 3D 地圖、Mapbox。
- 真實道路導航路線（需路網 API）。
- 後端資料庫、多使用者同步、登入。
- 行程的線上新增／刪除／拖曳排序（本版行程固定於 `trip.json`，只編輯 Note）。
