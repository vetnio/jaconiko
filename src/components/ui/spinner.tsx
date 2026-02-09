export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--primary)] h-5 w-5 ${className}`}
    />
  );
}
