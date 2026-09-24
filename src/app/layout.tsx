import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/lang";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/Toast";
import SupportChat from "@/components/landing/SupportChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Vectra — Inquiry to Quote, End to End",
  description: "AI copilot for trading companies. Extract specs, batch RFQ suppliers, compare landed costs, and draft cited quotes — in hours, not days.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vectra",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#FFFFFF' }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        <style dangerouslySetInnerHTML={{ __html: `
          html { background: #FFFFFF !important; }
          body { background: #FFFFFF !important; }
          @supports (padding: env(safe-area-inset-top)) {
            body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#FFFFFF' }}>
        <LangProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
            <SupportChat />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
