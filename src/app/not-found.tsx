import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <p className="text-xl text-[var(--muted-foreground)] mb-6">
          Page not found
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
