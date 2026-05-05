"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { 
  Utensils, ShoppingCart, Home, Coffee, Grid, Bed, Scissors, Dumbbell, 
  Stethoscope, Car, Monitor, GraduationCap, MapPin, Beer, Store 
} from "lucide-react";
import React from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  restaurant: Utensils, food: Utensils,
  cafe: Coffee, coffee: Coffee,
  hotel: Bed, accommodation: Bed, home: Home,
  spa: Scissors, beauty: Scissors,
  gym: Dumbbell, fitness: Dumbbell,
  retail: Store, shop: Store,
  health: Stethoscope, medical: Stethoscope,
  automotive: Car, car: Car,
  tech: Monitor, technology: Monitor,
  education: GraduationCap, school: GraduationCap,
  entertainment: Beer, bar: Beer, pub: Beer, bakery: Coffee,
  supermarket: ShoppingCart, grocery: ShoppingCart, cart: ShoppingCart,
  all: Home,
  default: Grid,
};

function getCategoryIcon(iconName?: string, name?: string): React.ElementType {
  const query = (iconName || name || "default").toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (query.includes(key)) return Icon;
  }
  return ICON_MAP.default;
}

// Add optional color and icon fields if they aren't fully typed in the frontend yet
interface ExtendedCategory extends Category {
  color?: string;
}

interface CategoryFilterProps {
  categories: ExtendedCategory[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  loading?: boolean;
}

export function CategoryFilter({ categories, selected, onSelect, loading }: CategoryFilterProps) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-1.5 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="w-12 h-2.5 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const all = { _id: "all", name: "All", icon: "all", color: "#8B5CF6" } as ExtendedCategory;
  const items = [all, ...categories];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 px-1 no-scrollbar">
      {items.map((cat) => {
        const isSelected = cat._id === "all" ? !selected : selected === cat.name;
        const Icon = getCategoryIcon(cat.icon, cat.name);
        
        // Fallback to a default theme color if the backend doesn't provide one
        const catColor = cat.color || "#8B5CF6"; 

        return (
          <button
            key={cat._id}
            onClick={() => onSelect(cat._id === "all" ? null : cat.name)}
            className="shrink-0 flex flex-col items-center gap-2 group outline-none"
          >
            <div 
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border",
                isSelected
                  ? "scale-105 shadow-md"
                  : "bg-card group-hover:scale-105"
              )}
              style={{
                backgroundColor: isSelected ? catColor : "var(--card)",
                borderColor: isSelected ? catColor : "var(--border)",
                color: isSelected ? "#ffffff" : catColor,
              }}
            >
              <Icon className="w-7 h-7" strokeWidth={isSelected ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[12px] text-center leading-tight max-w-[64px] truncate transition-all duration-200",
              isSelected ? "text-foreground font-bold" : "text-muted-foreground font-medium group-hover:text-foreground"
            )}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
