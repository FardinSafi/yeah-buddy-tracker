"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    return configured;
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/");

  if (!email || !password) {
    redirect("/auth/login?error=Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";
  redirect(safeNextPath);
}

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/auth/login?error=Email and password are required.");
  }

  const supabase = await createClient();
  const callbackUrl = `${await getSiteUrl()}/auth/callback`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/login?message=Account created. Check your email to confirm, then sign in.");
}
