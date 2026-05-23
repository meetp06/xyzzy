import "./globals.css";

import { Space_Mono, Syne } from "next/font/google";

import type { Metadata } from "next";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Interdimensional Cable | AI-Powered Talk Shows",
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
        className={`${syne.variable} ${spaceMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
