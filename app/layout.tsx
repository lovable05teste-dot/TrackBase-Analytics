import type { Metadata,Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
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
      <body className="antialiased">
        <PwaRegister/><SoundNotifications/><Toaster position="bottom-right" richColors/>{children}
      </body>
      <GoogleAnalytics gaId="G-YV71CM9ETF" />
      <Script id="ghostscale-google-ads" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('config','AW-11244930106');`}
      </Script>
      <Script id="ghostscale-meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','2154942472068771');fbq('track','PageView');`}
      </Script>
    </html>
  );
}
