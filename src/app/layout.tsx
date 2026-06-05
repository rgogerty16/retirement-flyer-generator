import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retirement Flyer Generator",
  description:
    "Generate one-page educational retirement plan flyers for wealth advisor prospecting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
