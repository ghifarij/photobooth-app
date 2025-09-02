"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { loadSession, type SessionPayload } from "../../lib/session";
import { composeStrip } from "../../lib/compose";
import Link from "next/link";
import { FaCamera } from "react-icons/fa";

// Session type and async loader moved to shared helper

// Composition now shared via ../../lib/compose

export default function PhotoResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center">Loading…</main>
      }
    >
      <PhotoResultInner />
    </Suspense>
  );
}

function PhotoResultInner() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const presetUrl = params.get("url");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(presetUrl || null);
  const [bg, setBg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (presetUrl) return; // If URL provided, skip local session
    if (!id) return;
    (async () => {
      const s = await loadSession(id);
      if (!s) {
        setError(
          "No session found. The link may be invalid or data is not available on this device."
        );
        return;
      }
      setSession(s);
    })();
  }, [id, presetUrl]);

  // Preload photostrip background once we know the session/layout
  useEffect(() => {
    if (!session) return; // wait for session so we pick the right asset
    if (typeof session.layout === "string") {
      const bi = new Image();
      bi.onload = () => setBg(bi);
      bi.src = `/${session.layout}.png`;
    } else {
      setBg(null);
    }
  }, [session]);

  // Load images and compose (no compression)
  useEffect(() => {
    (async () => {
      if (presetUrl) return; // pre-set URL, nothing to compose
      if (!session) return;
      // Ensure background is loaded
      if (!bg) return;
      const images: HTMLImageElement[] = await Promise.all(
        session.photos.map(
          (src) =>
            new Promise<HTMLImageElement>((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.src = src;
            })
        )
      );
      const canvas = canvasRef.current!;
      composeStrip(canvas, session.layout, images, {
        width: 1575,
        height: 4725,
        background: bg,
      });
      // Export explicitly as PNG (lossless)
      setFinalUrl(canvas.toDataURL("image/png"));
    })();
  }, [session, presetUrl, bg]);

  const download = () => {
    if (!finalUrl) return;
    const a = document.createElement("a");
    a.href = finalUrl;
    a.download = `photobooth-${id}.png`;
    a.click();
  };

  const share = async () => {
    if (!finalUrl) return;
    try {
      const res = await fetch(finalUrl);
      const blob = await res.blob();
      const file = new File([blob], `photobooth-${id}.png`, {
        type: "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Photobooth" });
      }
    } catch {
      // Sharing not supported; ignore
    }
  };

  // QR code removed for local-only usage

  return (
    <main className="flex flex-col items-center">
      <div className="w-full max-w-5xl 2xl:max-w-7xl space-y-5 2xl:space-y-8">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!error && (
          <div className="card overflow-hidden p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 flex items-center justify-center">
                {presetUrl ? (
                  <NextImage
                    src={presetUrl}
                    alt="Result"
                    width={1575}
                    height={4725}
                    className="h-[75dvh] 2xl:h-[82dvh] w-auto max-w-full media"
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="h-[75dvh] 2xl:h-[82dvh] w-auto max-w-full media"
                  />
                )}
              </div>

              <div className="w-full md:w-80 2xl:w-96 shrink-0 flex flex-col gap-3">
                <div className="flex flex-col gap-4">
                  <button
                    onClick={download}
                    disabled={!finalUrl}
                    className="btn btn-primary px-4 py-3 2xl:px-6 2xl:py-4 hover:-translate-y-px"
                  >
                    Download
                  </button>
                  <button
                    onClick={share}
                    disabled={!finalUrl}
                    className="btn btn-ghost px-4 py-3 2xl:px-6 2xl:py-4 hover:-translate-y-px"
                  >
                    Share
                  </button>
                </div>

                {null}

                {/* Desktop-only: Take another photo card centered in remaining space */}
                <div className="hidden md:flex flex-1 items-center pt-2">
                  <Link
                    href="/photobooth"
                    className="group card w-full p-4 md:p-5 2xl:p-6 border border-[var(--border)] hover:-translate-y-px transition-transform duration-150 ease-out"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shadow-sm transition-colors">
                        <FaCamera
                          className="text-[var(--foreground)] opacity-80"
                          size={22}
                        />
                      </div>
                      <div className="font-semibold">Take another photo</div>
                      <div className="text-xs muted">
                        Open the photobooth on this device
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
