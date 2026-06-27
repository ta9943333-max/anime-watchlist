import type { FilterOption } from "@/lib/types";

type FilterTabsProps = {
  active: FilterOption;
  onChange: (filter: FilterOption) => void;
};

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "watched-by-me", label: "Von mir gesehen" },
  { value: "unwatched", label: "Ungesehen" },
];

export function FilterTabs({ active, onChange }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = active === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
