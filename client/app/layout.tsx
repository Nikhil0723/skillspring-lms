import "./globals.css";
import Providers from "./Providers";
import { Meta } from "./utils/metadata";
import { Geist_Mono, Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import { Suspense } from "react";
import AuthToast from "./customHooks/AuthToast";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const udemySans = Plus_Jakarta_Sans({
  variable: "--font-udemy-sans",
  subsets: ["latin"],
  display: "swap",
});

const vazirmatn = Vazirmatn({
  variable: "--font-udemy-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata = {
  ...Meta({
    title: "SkillSpring | Learn, grow, and go further",
    description: "Build practical skills with expert-led courses, progress tracking, and certificates on SkillSpring.",
    keywords: ["programming", "Full stack", "courses"],
  }),
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistMono.variable} ${udemySans.variable} ${vazirmatn.variable} h-full antialiased`}>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <AuthToast />
          </Suspense>

          {children}
        </Providers>
      </body>
    </html>
  );
}
