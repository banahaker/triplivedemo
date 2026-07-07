export type SpotType = "spot" | "transit";

export interface Spot {
  id: string;
  day: number;
  order: number;
  name: string;
  type: SpotType;
  lat?: number;
  lng?: number;
  note: string;
}

export interface TripData {
  title: string;
  spots: Spot[];
}

export interface DayGroup {
  day: number;
  spots: Spot[];
}
