import type { Metadata } from "next";
import "./globals.css";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";
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
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
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
      className={cn("font-sans", spaceGrotesk.variable, instrumentSerif.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
