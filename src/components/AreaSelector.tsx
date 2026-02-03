import { cn } from "../lib/utils";

// Hardcoded popular cities - the areas API uses geo-detection which isn't useful
export const POPULAR_AREAS = [
  { id: "13", name: "London", country: "UK" },
  { id: "34", name: "Berlin", country: "Germany" },
  { id: "23", name: "Amsterdam", country: "Netherlands" },
  { id: "44", name: "Paris", country: "France" },
  { id: "5", name: "New York", country: "USA" },
  { id: "8", name: "Los Angeles", country: "USA" },
  { id: "55", name: "Barcelona", country: "Spain" },
  { id: "20", name: "Ibiza", country: "Spain" },
  { id: "41", name: "Manchester", country: "UK" },
  { id: "38", name: "Bristol", country: "UK" },
];

interface AreaSelectorProps {
  selectedArea: string;
  onAreaChange: (areaId: string) => void;
}

export function AreaSelector({ selectedArea, onAreaChange }: AreaSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400">City</label>
      <div className="flex flex-wrap gap-2">
        {POPULAR_AREAS.map((area) => (
          <button
            key={area.id}
            onClick={() => onAreaChange(area.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors",
              selectedArea === area.id
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-zinc-900 border-zinc-700 hover:border-zinc-500"
            )}
          >
            {area.name}
          </button>
        ))}
      </div>
    </div>
  );
}
