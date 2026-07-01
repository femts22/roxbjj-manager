import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROXBJJ PLANALTO",
  description: "Sistema de gestão da academia ROXBJJ PLANALTO",
  applicationName: "ROXBJJ PLANALTO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ROXBJJ PLANALTO",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className="bg-zinc-950 antialiased">
        {children}
      </body>
    </html>
  );
}
