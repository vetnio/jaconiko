import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jakoniko — Chat with your codebase",
  description:
    "Help non-technical people understand their team's codebase through conversational AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
