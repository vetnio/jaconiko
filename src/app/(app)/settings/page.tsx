"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const levels = [
  { value: "non_technical", label: "Non-technical" },
  { value: "semi_technical", label: "Semi-technical" },
  { value: "technical", label: "Technical" },
] as const;

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [technicalLevel, setTechnicalLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      const userRecord = session.user as Record<string, unknown>;
      const level = typeof userRecord.technicalLevel === "string" ? userRecord.technicalLevel : "";
      setTechnicalLevel(level);
    }
  }, [session]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, technicalLevel }),
      });

      if (!res.ok) {
        setError("Failed to save settings. Please try again.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Profile Settings</h1>

      <div className="space-y-6">
        <Input
          id="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Email</p>
          <p className="text-sm">{session?.user?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Technical level
          </label>
          <div className="space-y-2">
            {levels.map((level) => (
              <button
                key={level.value}
                onClick={() => setTechnicalLevel(level.value)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                  technicalLevel === level.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">Saved!</span>
          )}
          {error && (
            <span className="text-sm text-[var(--destructive)]">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
