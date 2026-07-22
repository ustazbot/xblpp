import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { ms } from "@/constants/ms";

// Self-host via next/font (build-time, tiada request luar setiap page load) —
// JANGAN guna @import url(fonts.googleapis.com) runtime macam draf design
// system asal, kurang selamat/laju untuk sistem kerajaan.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
// Display: Plus Jakarta Sans Bold (bukan Instrument Serif italic — ditukar
// atas maklum balas semakan pilot, "oldschool" rasa serif untuk tajuk).
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: ms.sistem.nama,
  description: ms.sistem.namaPendek,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className={cn("font-sans", spaceGrotesk.variable, plusJakartaSans.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
