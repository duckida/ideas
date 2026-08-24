import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { strings } from "@/lib/strings";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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

// Runs before paint: applies the persisted theme (or the OS preference for
// "system") to <html data-theme> so the first frame already has the right
// colours. Mirrors the logic in ThemeContext; kept inline and dependency-free.
const themeBootstrap = `(function(){try{var t=localStorage.getItem("ideas-theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${kakaoBigSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ProfileGate>{children}</ProfileGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}