import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_ATTEMPTS = 10;

const globalRateLimitStore = globalThis as typeof globalThis & {
  __authRateLimitStore?: Map<string, RateLimitEntry>;
};

const authRateLimitStore = globalRateLimitStore.__authRateLimitStore ?? new Map<string, RateLimitEntry>();
globalRateLimitStore.__authRateLimitStore = authRateLimitStore;

function getClientKey(request: NextRequest): string {
  // Prefer platform-populated IP headers and bind to user-agent for extra entropy.
  const platformIp = request.headers.get("x-vercel-ip") ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return `${platformIp}:${userAgent}`;
}

function shouldRateLimit(request: NextRequest): boolean {
  if (request.method !== "POST") {
    return false;
  }

  return request.nextUrl.pathname.startsWith("/auth");
}

function applyAuthRateLimit(request: NextRequest): NextResponse | null {
  if (!shouldRateLimit(request)) {
    return null;
  }

  const now = Date.now();
  const ip = getClientKey(request);
  const path = request.nextUrl.pathname;
  const key = `${ip}:${path}`;
  const current = authRateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    authRateLimitStore.set(key, {
      count: 1,
      resetAt: now + AUTH_WINDOW_MS,
    });
    return null;
  }

  if (current.count >= AUTH_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "Too many authentication attempts. Please try again shortly.");
    const response = NextResponse.redirect(redirectUrl, { status: 303 });
    response.headers.set("Retry-After", String(retryAfterSeconds));
    return response;
  }

  authRateLimitStore.set(key, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });

  return null;
}

export async function middleware(request: NextRequest) {
  const rateLimitedResponse = applyAuthRateLimit(request);
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
