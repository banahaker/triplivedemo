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
