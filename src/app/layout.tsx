import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Книга на ночь",
  description: "Читаем перед сном и смотрим, какие мы молодцы",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Книга на ночь", statusBarStyle: "black-translucent" },
  // вкладка — SVG; экран «Домой» на iPhone берёт только PNG (scripts/make-icons.mjs)
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
export const viewport: Viewport = {
  themeColor: "#0B1220", width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@500;700;800&display=swap&subset=cyrillic"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
