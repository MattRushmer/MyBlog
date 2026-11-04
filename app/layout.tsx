import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/config/types";
import "./globals.css";

const uiSans = Manrope({
  variable: "--font-ui-sans",
  subsets: ["latin"],
  display: "swap",
});

const storySerif = Source_Serif_4({
  variable: "--font-story-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${uiSans.variable} ${storySerif.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
