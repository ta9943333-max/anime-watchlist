import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";

type AnimeFormProps = {
  onAdd: (title: string) => void;
};

export function AnimeForm({ onAdd }: AnimeFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Neuen Anime hinzufügen …"
        className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        Hinzufügen
      </button>
    </form>
  );
}
