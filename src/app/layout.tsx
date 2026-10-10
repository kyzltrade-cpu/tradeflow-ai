import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { rootMetadata } from "@/lib/site-metadata";
import { LangProvider } from "@/lib/lang";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/Toast";
import SupportChat from "@/components/landing/SupportChat";
import AnalyticsLoader from "@/components/AnalyticsLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* The marketing page is set in a geometric grotesque, not a serif: tight
   negative tracking, weight 500, no italic. It is also the display face for
   the booking modal, which is the only other place `.display` appears. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#171b18",
};

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      style={{ background: '#171b18' }}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html { background: #171b18 !important; }
          body { background: #171b18 !important; }
          @supports (padding: env(safe-area-inset-top)) {
            body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#171b18' }}>
        <LangProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
            <SupportChat />
            <AnalyticsLoader />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
