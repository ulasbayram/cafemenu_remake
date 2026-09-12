import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fincan · QR Menü & Kafe Yönetimi",
  description: "Kafeniz için güzel menüler, kolay yönetim.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
