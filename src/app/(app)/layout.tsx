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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg">
            Jakoniko
          </Link>
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-sm">
                <User className="h-4 w-4" />
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
      <main className="flex-1">{children}</main>
    </div>
  );
}
