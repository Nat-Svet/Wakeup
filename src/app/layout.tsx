import type { Metadata, Viewport } from "next";
import { Literata, Nunito } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Просыпайся! — тёплый будильник к завтраку",
  description:
    "Разовые заказы тёплой выпечки с доставкой к пробуждению за 10–15 минут по микрорайону.",
  applicationName: "Просыпайся!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFDF9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${literata.variable} ${nunito.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
