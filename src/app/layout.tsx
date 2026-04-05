import type { Metadata } from "next";
import { Barlow_Condensed, Bebas_Neue } from "next/font/google";
import { AppProvider } from "@/components/providers/app-provider";
import "./globals.css";

const bodyFont = Barlow_Condensed({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const headingFont = Bebas_Neue({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Yeah Buddy Tracker",
  description: "Minimalist offline-first gym workout tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preload" as="audio" href="/sounds/yeah-buddy.mp3" type="audio/mpeg" />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-[#0a0a0a] text-[#f4f4f4]">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
