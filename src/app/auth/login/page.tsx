import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signInWithEmail, signUpWithEmail } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const [{ data }, params] = await Promise.all([supabase.auth.getUser(), searchParams]);

  if (data.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center p-4">
      <Card className="w-full border border-[#4f4120] bg-[#111111]/90 text-[#ead9a4]">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome Back</CardTitle>
          <CardDescription className="text-[#c7b274]">
            Sign in with email to load your personal workout data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <p className="rounded-md border border-red-600/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {params.error}
            </p>
          ) : null}

          {params.message ? (
            <p className="rounded-md border border-emerald-600/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              {params.message}
            </p>
          ) : null}

          <form action={signInWithEmail} className="space-y-3">
            <input name="next" type="hidden" value={params.next ?? "/"} />
            <Input name="email" type="email" placeholder="Email" required className="h-11" />
            <Input name="password" type="password" placeholder="Password" required className="h-11" />
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#d4af37] font-semibold text-[#171717] hover:bg-[#bf9b29]">
              Sign In
            </Button>
          </form>

          <form action={signUpWithEmail} className="space-y-3 border-t border-[#4f4120] pt-4">
            <p className="text-sm text-[#c7b274]">New here? Create an account.</p>
            <Input name="email" type="email" placeholder="Email" required className="h-11" />
            <Input name="password" type="password" placeholder="Password (min 6 chars)" minLength={6} required className="h-11" />
            <Button type="submit" variant="outline" className="h-11 w-full rounded-xl border-[#4f4120] bg-[#1a1710] text-[#ead9a4] hover:bg-[#241d0f]">
              Create Account
            </Button>
          </form>

          <div className="pt-2 text-center text-sm text-[#c7b274]">
            <Link href="/" className="underline underline-offset-4 hover:text-[#ead9a4]">
              Back to app
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
