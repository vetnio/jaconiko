import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "neutral";
    text?: string;
  };
}

export function StatCard({ label, value, trend }: StatCardProps) {
  if (value == null) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">
        No data
      </div>
    );
  }

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trend?.direction === "up"
      ? "text-[var(--success)]"
      : trend?.direction === "down"
        ? "text-[var(--destructive)]"
        : "text-[var(--muted-foreground)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-4xl font-bold text-[var(--card-foreground)]">
        {value}
      </p>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          {trend.text && <span>{trend.text}</span>}
        </div>
      )}
    </div>
  );
}
