import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROXBJJ PLANALTO",
  description: "Sistema de gestão da academia ROXBJJ PLANALTO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
