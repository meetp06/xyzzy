import "./globals.css";

import { Barlow, Instrument_Serif, Space_Mono } from "next/font/google";

import type { Metadata } from "next";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Scripted | AI-Powered Talk Shows",
  description: "Generate personalized AI talk show segments. Pick a show style, give it a topic, and watch your custom episode come to life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${barlow.variable} ${spaceMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
