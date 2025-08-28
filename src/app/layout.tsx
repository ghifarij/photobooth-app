import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Assessio",
  description: "Have fun taking photos and composing printable layouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased page`}
      >
        <Header />

        {/* Add padding to account for fixed header and grow to push footer */}
        <div className="pt-16 flex-1">
          <div className="container section">{children}</div>
        </div>

        <footer className="container section flex justify-center">
          <div className="text-xs muted">
            © {new Date().getFullYear()} Assessio
          </div>
        </footer>
      </body>
    </html>
  );
}
