import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (setupAction === "install" && installationId) {
    // Redirect to the app — user can now select repos from this installation
    const url = new URL("/invitations", request.url);
    url.searchParams.set("github_installed", "true");
    url.searchParams.set("installation_id", installationId);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
