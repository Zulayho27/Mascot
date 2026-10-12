import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-display", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Shaxsiy rivojlanish tizimi · AI Fasilitator",
  description: "Ishtirokchining ish daftari: 10 bo‘lim, 54 ta interaktiv karta va AI Maslahatchi.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
