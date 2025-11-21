import type { Metadata } from "next";
import { Inter, Noto_Color_Emoji } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const notoColorEmoji = Noto_Color_Emoji({ 
  weight: ["400"], 
  subsets: ["emoji"],
  variable: '--font-noto-emoji'
});

export const metadata: Metadata = {
  title: "TikGen Studio",
  description: "A specialized tool for clothing brands to generate 10-second slideshow TikToks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${notoColorEmoji.variable}`}>{children}</body>
    </html>
  );
}