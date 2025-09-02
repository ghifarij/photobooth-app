"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { saveSession } from "../../lib/session";
import { useRouter, useSearchParams } from "next/navigation";

type CaptureState = "idle" | "counting" | "flashing" | "shooting" | "done";

function uuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PhotoboothPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center">Loading…</main>
      }
    >
      <PhotoboothInner />
    </Suspense>
  );
}

function PhotoboothInner() {
  const params = useSearchParams();
  const router = useRouter();
  // Fixed flow: always take 3 photos; choose template after capture
  const desiredPhotos = 3;
  const timerSeconds = parseInt(params.get("timer") || "3", 10) as 3 | 5;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [countdown, setCountdown] = useState<number>(timerSeconds);
  const [taken, setTaken] = useState<string[]>([]);
  const [flashOn, setFlashOn] = useState(false);

  const remaining = useMemo(
    () => desiredPhotos - taken.length,
    [desiredPhotos, taken.length]
  );

  // Setup camera
  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            // Prefer higher resolution capture for better final quality
            width: { min: 1280, ideal: 2560, max: 4096 },
            height: { min: 720, ideal: 1440, max: 4096 },
          },
          audio: false,
        });
        if (!active) return;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          localStream = stream;
          await v.play();
          setReady(true);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Unable to access camera";
        setStreamError(message);
      }
    })();
    return () => {
      active = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Countdown logic for multiple shots
  useEffect(() => {
    if (captureState !== "counting") return;
    if (countdown <= 0) {
      // Trigger a 1s flash effect before capturing
      setFlashOn(true);
      setCaptureState("flashing");
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [captureState, countdown]);

  // Flash phase lasts ~1s then proceeds to shooting (capture)
  useEffect(() => {
    if (captureState !== "flashing") return;
    const t = setTimeout(() => {
      setFlashOn(false);
      setCaptureState("shooting");
    }, 1000);
    return () => clearTimeout(t);
  }, [captureState]);

  // When in shooting phase, capture frame then continue or finish
  useEffect(() => {
    if (captureState !== "shooting") return;
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Use high quality resampling when drawing from the video
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Mirror horizontally so the capture matches the preview
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    ctx.restore();
    // Preserve original capture fidelity (PNG, no downscaling)
    const url = c.toDataURL("image/png");
    setTaken((arr) => [...arr, url]);
    // Small pause then either next countdown or done
    setTimeout(() => {
      if (taken.length + 1 >= desiredPhotos) {
        setCaptureState("done");
      } else {
        setCountdown(timerSeconds);
        setCaptureState("counting");
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureState]);

  // When done, persist session and go to result
  useEffect(() => {
    if (captureState !== "done") return;
    (async () => {
      const id = uuid();
      const payload = {
        id,
        // Temporary template; user will choose in the next step
        layout: "PHOTOSTRIP_A",
        photos: taken,
        timer: timerSeconds,
        createdAt: Date.now(),
      };
      const ok = await saveSession(payload);
      if (ok) {
        router.replace(`/photo-layout?id=${encodeURIComponent(id)}`);
      } else {
        setStreamError(
          "Saving failed (storage quota). Consider fewer photos or let me switch to a cloud-only flow."
        );
        setCaptureState("idle");
      }
    })();
  }, [captureState, router, taken, timerSeconds]);

  const start = () => {
    if (!ready) return;
    setTaken([]);
    setCountdown(timerSeconds);
    setCaptureState("counting");
  };

  const stop = () => {
    setCaptureState("idle");
    setCountdown(timerSeconds);
  };

  return (
    <main className="flex flex-col items-center">
      <div className="w-full max-w-4xl 2xl:max-w-7xl space-y-5 2xl:space-y-8">
        {streamError && (
          <div className="text-red-600 text-sm">{streamError}</div>
        )}

        <div className="relative w-full aspect-video card media overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover -scale-x-100"
            playsInline
            muted
          />
          {/* Countdown bubble */}
          {captureState === "counting" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 2xl:w-32 2xl:h-32 rounded-full bg-black/60 text-white flex items-center justify-center text-4xl 2xl:text-5xl font-bold">
                {countdown}
              </div>
            </div>
          )}
          {/* Flash overlay (UI only) */}
          {(flashOn || captureState === "flashing") && (
            <div className="absolute inset-0 pointer-events-none flash-overlay" />
          )}
        </div>

        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="flex gap-3 2xl:gap-4">
            {captureState === "idle" && (
              <button onClick={start} className="btn btn-primary w-80 2xl:w-96">
                Start
              </button>
            )}
            {captureState !== "idle" && captureState !== "done" && (
              <button onClick={stop} className="btn btn-ghost w-80 2xl:w-96">
                Cancel
              </button>
            )}
          </div>
          <div className="text-sm 2xl:text-base muted">
            Timer: {timerSeconds}s • Remaining: {remaining}
          </div>
        </div>

        {/* Preview shots removed intentionally */}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}
