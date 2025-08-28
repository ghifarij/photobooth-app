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
  const [cloudUrl, setCloudUrl] = useState<string | null>(presetUrl || null);
  const [uploading, setUploading] = useState(false);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);

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

  // Preload logo once (pick dark/light)
  useEffect(() => {
    const li = new Image();
    li.onload = () => setLogo(li);
    li.src = session?.layout === "template-phone-dark" ? "/AssessioDarkMode.png" : "/AssessioLightMode.png";
  }, [session?.layout]);

  // Load images and compose
  useEffect(() => {
    (async () => {
      if (presetUrl) return; // pre-set URL, nothing to compose
      if (!session) return;
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
        width: 1080,
        height: 1920,
        logo,
      });
      const url = canvas.toDataURL("image/png");
      setFinalUrl(url);
    })();
  }, [session, presetUrl, logo]);

  // Upload composed image to Cloudinary once available
  useEffect(() => {
    (async () => {
      if (presetUrl) return; // already have cloud URL
      if (!finalUrl || cloudUrl || uploading) return;
      try {
        setUploading(true);
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: finalUrl, folder: "photobooth" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Upload failed");
        setCloudUrl(data.secure_url as string);
      } catch (e: unknown) {
        // If upload fails, keep local-only option
        const message = e instanceof Error ? e.message : String(e);
        console.error("Cloud upload failed:", message);
      } finally {
        setUploading(false);
      }
    })();
  }, [finalUrl, cloudUrl, uploading, presetUrl]);

  const download = () => {
    if (!finalUrl) return;
    const a = document.createElement("a");
    a.href = finalUrl;
    a.download = `photobooth-${id}.png`;
    a.click();
  };

  const share = async () => {
    if (!finalUrl) return;
    // Try Web Share with file if supported
    try {
      if (cloudUrl) {
        await navigator.share({ url: cloudUrl, title: "Photobooth" });
        return;
      }
      const res = await fetch(finalUrl);
      const blob = await res.blob();
      const file = new File([blob], `photobooth-${id}.png`, {
        type: blob.type,
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Photobooth" });
        return;
      }
    } catch {}
    // Fallback: share the link to this page
    try {
      await navigator.share({
        url: cloudUrl || window.location.href,
        title: "Photobooth",
      });
    } catch {
      // ignore
    }
  };

  const [qrSrc, setQrSrc] = useState<string | null>(null);

  // Compute QR only on client to prevent SSR/client hydration mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    const link = cloudUrl
      ? `${base}/photo-result?url=${encodeURIComponent(cloudUrl)}`
      : id
      ? `${base}/photo-result?id=${encodeURIComponent(id)}`
      : null;
    if (!link) {
      setQrSrc(null);
      return;
    }
    const api = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      link
    )}`;
    setQrSrc(api);
  }, [id, cloudUrl]);

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
                    width={1080}
                    height={1920}
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
                <div className="flex flex-col gap-2">
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

                {/* QR card: centered content, consistent styling */}
                <div className="card w-full p-4 md:p-5 2xl:p-6 border border-[var(--border)] hover:-translate-y-px transition-transform duration-150 ease-out">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="text-sm muted">Scan to open this result</div>
                    <div className="w-40 h-40 2xl:w-48 2xl:h-48 bg-white border border-[var(--border)] rounded flex items-center justify-center overflow-hidden">
                      {!uploading && qrSrc ? (
                        <NextImage
                          src={qrSrc}
                          alt="QR code"
                          width={200}
                          height={200}
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="text-xs muted">
                      QR opens a cross‑device link. It appears once ready.
                    </div>
                  </div>
                </div>

                {/* Desktop-only: Take another photo card centered in remaining space */}
                <div className="hidden md:flex flex-1 items-center">
                  <Link
                    href="/photobooth"
                    className="group card w-full p-4 md:p-5 2xl:p-6 border border-[var(--border)] hover:-translate-y-px transition-transform duration-150 ease-out"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shadow-sm transition-colors">
                        <FaCamera className="text-[var(--foreground)] opacity-80" size={22} />
                      </div>
                      <div className="font-semibold">Take another photo</div>
                      <div className="text-xs muted">Open the photobooth on this device</div>
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
