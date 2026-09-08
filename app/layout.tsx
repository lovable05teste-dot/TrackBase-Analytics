import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackBase Analytics",
  description: "Rastreamento de eventos, vendas e performance para Meta Ads.",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
