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

const ENABLE_APP_WALLPAPER = true;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#0a0a0a] text-[#f4f4f4]"
        style={
          ENABLE_APP_WALLPAPER
            ? {
                backgroundImage:
                  "linear-gradient(rgba(10, 10, 10, 0.88), rgba(10, 10, 10, 0.88)), url('/images/ronnie-header.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
              }
            : undefined
        }
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
