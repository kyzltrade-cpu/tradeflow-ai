import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
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

// Display face for the landing page: a warm, high-contrast serif with an
// optical-size axis, set light rather than bold so it reads editorial.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#faf7f2",
};

export const metadata: Metadata = {
  title: "Sailwise — Inquiry to Quote, End to End",
  description: "AI copilot for trading companies. Extract specs from email, clarify gaps, and draft cited quotes from your own pricing — in hours, not days.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sailwise",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
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
