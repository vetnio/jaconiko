"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const levels = [
  {
    value: "non_technical",
    label: "Non-technical",
    description:
      "I'm in product, design, or management. Explain things in plain English — no code!",
  },
  {
    value: "semi_technical",
    label: "Semi-technical",
    description:
      "I can follow high-level architecture and file names, but don't show me raw code.",
  },
  {
    value: "technical",
    label: "Technical",
    description:
      "I'm a developer. Show me file paths, function names, and code snippets.",
  },
] as const;

export default function TechnicalLevelPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError("");

    try {
      const patchRes = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicalLevel: selected,
          onboardingCompleted: true,
        }),
      });

      if (!patchRes.ok) {
        setError("Failed to save preferences. Please try again.");
        setLoading(false);
        return;
      }

      // Find the user's first workspace and redirect
      const res = await fetch("/api/workspaces");
      if (!res.ok) {
        setError("Failed to load workspaces. Please try again.");
        setLoading(false);
        return;
      }

      const workspaces = await res.json();

      if (Array.isArray(workspaces) && workspaces.length > 0) {
        router.push(`/workspace/${workspaces[0].id}`);
      } else {
        router.push("/create-workspace");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-blue-400 bg-clip-text text-transparent tracking-tight mb-4">
            Jakoniko
          </p>
          <h1 className="text-2xl font-bold mb-2">How technical are you?</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            This helps us tailor how the AI explains your codebase.
          </p>

          <div className="space-y-3 mb-6">
            {levels.map((level) => (
              <button
                key={level.value}
                onClick={() => setSelected(level.value)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selected === level.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                <p className="font-medium">{level.label}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {level.description}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-[var(--destructive)] mb-4">{error}</p>
          )}

          <Button
            className="w-full"
            disabled={!selected}
            loading={loading}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
