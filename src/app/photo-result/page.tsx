"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { loadSession, type SessionPayload } from "../../lib/session";

// Session type and async loader moved to shared helper

// Compose the photos into a single canvas according to the chosen layout
function composeLayout(
  canvas: HTMLCanvasElement,
  layout: string,
  photos: HTMLImageElement[]
) {
  // Final print size: 2x6 (1:3) strip, fairly high-res
  const W = 800;
  const H = 2400;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Choose background by template
  const bg =
    layout === "template-green"
      ? "#BBF7D0"
      : layout === "template-rose"
      ? "#FBCFE8"
      : "#BFDBFE"; // template-blue default
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 40; // outer padding
  const gap = 24; // spacing between photos
  const captionH = 140; // space for caption text at bottom
  const framePad = 10; // white frame around each photo

  const drawImageCover = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    // Save the current context state
    ctx.save();

    // Create a clipping rectangle for the image area
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Cover logic similar to object-fit: cover
    const ir = img.width / img.height;
    const tr = w / h;
    let dw = w;
    let dh = h;
    if (ir > tr) {
      // image wider
      dh = h;
      dw = h * ir;
    } else {
      dw = w;
      dh = w / ir;
    }
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    // Restore the context state (removes clipping)
    ctx.restore();
  };

  // Area for photos (three vertical stack)
  const areaX = pad;
  const areaY = pad;
  const areaW = W - pad * 2;
  const areaH = H - pad * 2 - captionH;
  const rows = 3;
  const cellH = (areaH - gap * (rows - 1)) / rows;

  for (let r = 0; r < rows; r++) {
    const x = areaX;
    const y = areaY + r * (cellH + gap);

    // Draw white frame
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, areaW, cellH);

    // Draw image inside with inner padding (clipped to the inner area)
    const img = photos[r];
    if (img) {
      drawImageCover(
        img,
        x + framePad,
        y + framePad,
        areaW - framePad * 2,
        cellH - framePad * 2
      );
    }
  }

  // Caption text
  ctx.fillStyle = "#111827"; // neutral-900
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("Let's make a moment", W / 2, H - pad - captionH / 2);
}

export default function PhotoResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh p-6 flex items-center justify-center">
          Loading…
        </main>
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
      composeLayout(canvas, session.layout, images);
      const url = canvas.toDataURL("image/png");
      setFinalUrl(url);
    })();
  }, [session, presetUrl]);

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
    <main className="min-h-dvh p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <h1 className="text-xl font-semibold">Your Result</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!error && (
          <>
            <div className="border rounded-lg overflow-hidden bg-white flex items-center justify-center">
              {presetUrl ? (
                <NextImage
                  src={presetUrl}
                  alt="Result"
                  width={1200}
                  height={1800}
                  className="h-[75dvh] w-auto max-w-full"
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="h-[75dvh] w-auto max-w-full"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={download}
                disabled={!finalUrl}
                className="px-4 py-2 rounded-md border"
              >
                Download
              </button>
              <button
                onClick={share}
                disabled={!finalUrl}
                className="px-4 py-2 rounded-md bg-[#4062CB] text-white hover:opacity-90 transition"
              >
                Share
              </button>
              {uploading && (
                <span className="text-sm opacity-70">Uploading…</span>
              )}
              {cloudUrl && (
                <a
                  href={cloudUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  Open Cloud Link
                </a>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <div className="text-sm opacity-70">
                Scan to open this result:
              </div>
              {qrSrc ? (
                <NextImage
                  src={qrSrc}
                  alt="QR code"
                  width={200}
                  height={200}
                  className="w-40 h-40"
                />
              ) : (
                <div className="text-sm">Generating QR…</div>
              )}
              <div className="text-xs opacity-60">
                QR opens a cross-device link. If the cloud link is not ready
                yet, wait for the upload indicator to finish.
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
