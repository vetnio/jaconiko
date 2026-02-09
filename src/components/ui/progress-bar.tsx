export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
