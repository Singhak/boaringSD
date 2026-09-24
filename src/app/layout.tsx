import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "System Design Quest | Learn System Design Visually",
  description:
    "Gamified interactive learning platform for System Design. Master Load Balancers, Caching, and Database Scaling through real-time visual simulations.",
  keywords: [
    "system design",
    "load balancer",
    "redis cache",
    "database scaling",
    "architecture builder",
    "software engineering interview",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100">{children}</body>
    </html>
  );
}
