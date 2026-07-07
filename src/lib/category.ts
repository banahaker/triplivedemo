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
