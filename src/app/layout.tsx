import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { strings } from "@/lib/strings";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileGate } from "@/components/ProfileGate";

const kakaoBigSans = localFont({
  src: [
    { path: "./fonts/KakaoBigSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/KakaoBigSans-Bold.ttf", weight: "700", style: "normal" },
    {
      path: "./fonts/KakaoBigSans-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-kakao-big-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: strings.brand.name,
  description: strings.brand.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${kakaoBigSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ProfileGate>{children}</ProfileGate>
        </AuthProvider>
      </body>
    </html>
  );
}