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
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "for(var p of [['theme','fincan-theme'],['menuTheme','fincan-menu-theme']]){var t;try{t=localStorage.getItem(p[1])}catch(e){t=null}document.documentElement.dataset[p[0]]=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}",
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
