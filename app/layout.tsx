import type { Metadata,Viewport } from "next";
import "./globals.css";
import {PwaRegister} from "./pwa-register";
import {Toaster} from "@/components/ui/sonner";
import {SoundNotifications} from "@/components/SoundNotifications";

export const metadata: Metadata = {
  title: "GhostScale",
  description: "Rastreamento de eventos, vendas e performance para Meta Ads.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/ghostscale-ghost.png",
    shortcut: "/ghostscale-ghost.png",
    apple: "/ghostscale-ghost.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GhostScale",
  },
};

export const viewport: Viewport = {
  themeColor: "#080b12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("tb_theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased"><PwaRegister/><SoundNotifications/><Toaster position="bottom-right" richColors/>{children}</body>
    </html>
  );
}