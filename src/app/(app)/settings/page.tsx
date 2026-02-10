"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useToast } from "@/components/ui/toast";

const levels = [
  { value: "non_technical", label: "Non-technical" },
  { value: "semi_technical", label: "Semi-technical" },
  { value: "technical", label: "Technical" },
] as const;

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const [name, setName] = useState("");
  const [technicalLevel, setTechnicalLevel] = useState("");
  const [saving, setSaving] = useState(false);

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

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, technicalLevel }),
      });

      if (!res.ok) {
        toast.error("Failed to save settings. Please try again.");
        return;
      }

      toast.success("Settings saved!");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile Settings" }]} />
      <h1 className="text-xl font-bold mb-6">Profile Settings</h1>

      <Card>
        <CardContent className="pt-6 space-y-6">
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

          <Button onClick={handleSave} loading={saving}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
