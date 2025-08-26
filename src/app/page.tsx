"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl font-semibold">Photobooth</h1>
        <p className="text-sm opacity-80">
          Have fun taking photos and instantly compose them into a printable
          layout. Choose your layout and a countdown timer to get started.
        </p>
        <Link
          href="/photo-layout"
          className="inline-flex items-center justify-center rounded-md bg-black text-white px-6 py-3 text-base font-medium hover:opacity-90 transition"
        >
          Start
        </Link>
      </div>
    </main>
  );
}
