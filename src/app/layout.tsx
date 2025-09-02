import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

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
      <body className="antialiased page">
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
