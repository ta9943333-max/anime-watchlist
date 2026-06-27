import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anime suchen …"
        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-11 pr-4 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
      />
    </div>
  );
}
