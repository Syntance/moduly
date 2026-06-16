import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "../components/providers/providers";
import { initModuly } from "../lib/init";
import "./globals.css";

initModuly();

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
