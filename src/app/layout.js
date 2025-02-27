import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Best YouTube Video Downloader | Fast & Free Download",
  description: "Download YouTube videos quickly and easily with our free online downloader. No registration required, high-quality formats available.",
  keywords: "YouTube downloader, download YouTube videos, free video downloader, high-quality YouTube download, fast YouTube downloader, online video downloader, yt to mp4, youtube download, youtube download no ads",
  author: "masbroamat",
  openGraph: {
    title: "Best YouTube Video Downloader | Fast & Free Download",
    description: "Download YouTube videos in high quality with ease. No software required, free and fast!",
    url: "https://youtube-video-downloader-masbro.vercel.app",
    siteName: "YouTube Downloader",
    type: "website",
    images: [
      {
        url: "/thumbnail.jpg",
        width: 1200,
        height: 630,
        alt: "YouTube Video Downloader",
      },
    ],
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/png" href="/download.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
