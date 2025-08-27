"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="sr-only">Assessio Photobooth</h1>
        <div className="flex items-center justify-center">
          <Image
            src="/Assessio.png"
            alt="Assessio"
            width={160}
            height={160}
            className="h-20 w-auto"
            priority
          />
        </div>
        <p className="text-sm opacity-80">
          Have fun taking photos and instantly compose them into a printable
          strip. Snap three photos, then pick a template.
        </p>
        <Link
          href="/photobooth"
          className="inline-flex items-center justify-center rounded-md bg-[#4062CB] text-white px-6 py-3 text-base font-medium hover:opacity-90 transition"
        >
          Start
        </Link>
      </div>
    </main>
  );
}
