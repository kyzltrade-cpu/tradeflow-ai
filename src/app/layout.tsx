import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/lang";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/Toast";
import { ConditionalChatWidget } from "@/components/ConditionalChatWidget";

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
  themeColor: "#0A6E5C",
};

export const metadata: Metadata = {
  title: "TradeFlow AI — WhatsApp + WeChat Sales Assistant for Trading Companies",
  description: "AI that answers customer inquiries on WhatsApp and WeChat instantly. Built for Hong Kong trading companies.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TradeFlow",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#FAF9F6' }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0A6E5C" />
        <style dangerouslySetInnerHTML={{ __html: `
          html { background: #FAF9F6 !important; }
          body { background: #FAF9F6 !important; }
          @supports (padding: env(safe-area-inset-top)) {
            body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#FAF9F6' }}>
        <LangProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <ConditionalChatWidget />
            </ToastProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
