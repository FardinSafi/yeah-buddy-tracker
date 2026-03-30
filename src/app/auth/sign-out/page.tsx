import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "./actions";

export default function SignOutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center p-4">
      <Card className="w-full border border-[#4f4120] bg-[#111111]/90 text-[#ead9a4]">
        <CardHeader>
          <CardTitle className="text-3xl">Sign Out</CardTitle>
          <CardDescription className="text-[#c7b274]">
            End your current session on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#d4af37] font-semibold text-[#171717] hover:bg-[#bf9b29]">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
