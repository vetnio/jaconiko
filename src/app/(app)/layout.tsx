"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { User, Settings, LogOut } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header className="border-b border-[var(--border)] px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg bg-gradient-to-r from-[var(--primary)] to-blue-400 bg-clip-text text-transparent tracking-tight">
            Jakoniko
          </Link>
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-sm">
                <span className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                </span>
                {session?.user?.name || "User"}
              </button>
            }
          >
            <DropdownItem onClick={() => router.push("/settings")}>
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Settings
              </span>
            </DropdownItem>
            <DropdownItem
              destructive
              onClick={async () => {
                try {
                  await signOut();
                } catch {
                  // Redirect regardless of server response
                }
                window.location.href = "/login";
              }}
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </span>
            </DropdownItem>
          </Dropdown>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
