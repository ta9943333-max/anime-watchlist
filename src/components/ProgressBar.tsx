type ProgressBarProps = {
  value: number;
  max: number;
  label?: string;
};

export function ProgressBar({
  value,
  max,
  label = "haben diesen Anime geschaut",
}: ProgressBarProps) {
  const safeMax = Math.max(max, 0);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent =
    safeMax > 0 ? Math.round((safeValue / safeMax) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {safeValue} von {safeMax} Freunden {label}
        </span>
        <span className="font-medium text-violet-400">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
