"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="heading-1">Assessio Photobooth</h1>
        <p className="lead">
          Have fun taking photos and instantly compose them into a printable
          strip. Snap three photos, then pick a template.
        </p>
        <Link
          href="/photobooth"
          className="btn btn-primary text-base px-6 py-3"
        >
          Start Photobooth
        </Link>
      </div>
    </main>
  );
}
