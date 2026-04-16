import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeNextPath(candidate: string | null): string {
  if (!candidate) {
    return "/";
  }

  // Only allow internal absolute paths to prevent external redirects.
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[^\x20-\x7E]/.test(candidate)
  ) {
    return "/";
  }

  return candidate;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=Could not verify sign-in link.", requestUrl.origin));
}
