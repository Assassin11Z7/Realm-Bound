import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Westmark",
  description:
    "A pocket medieval strategy game. Found a compact, share a hall, and provision the northern road before the twelfth dusk.",
};

export const viewport: Viewport = {
  themeColor: "#14110e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className={`${outfit.className} min-h-full`}>{children}</body>
    </html>
  );
}
