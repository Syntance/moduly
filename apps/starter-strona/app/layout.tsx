import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Przykładowa Strona",
    template: "%s | Przykładowa Strona",
  },
  description: "Starter CMS Moduly — treści, SEO i formularze kontaktowe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
