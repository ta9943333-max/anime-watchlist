import type { SortOption } from "@/lib/types";

type SortTabsProps = {
  active: SortOption;
  onChange: (sort: SortOption) => void;
};

const SORTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Neueste" },
  { value: "title-asc", label: "A → Z" },
  { value: "title-desc", label: "Z → A" },
];

export function SortTabs({ active, onChange }: SortTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="self-center text-xs text-slate-500">Sortierung:</span>
      {SORTS.map((sort) => {
        const isActive = active === sort.value;

        return (
          <button
            key={sort.value}
            type="button"
            onClick={() => onChange(sort.value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/80 hover:text-white"
            }`}
          >
            {sort.label}
          </button>
        );
      })}
    </div>
  );
}
