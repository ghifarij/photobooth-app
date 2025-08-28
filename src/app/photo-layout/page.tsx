"use client";

import { JSX, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSession, updateSession } from "../../lib/session";
import { composeStrip, type LayoutId } from "../../lib/compose";

type TemplateOption = {
  id: string;
  label: string;
  preview: JSX.Element;
};

const PreviewShell = ({
  variant,
}: {
  variant: "phone" | "phone-pastel" | "phone-dark";
}) => {
  const bg =
    variant === "phone"
      ? "linear-gradient(180deg,#fafaf9,#f5f5f4)"
      : variant === "phone-pastel"
      ? "linear-gradient(180deg,#fff1f2,#e0f2fe)"
      : "linear-gradient(180deg,#111827,#0b1220)";
  const imgRef = useRef<HTMLImageElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sync = () => {
      const t = textRef.current;
      const i = imgRef.current;
      if (!t || !i) return;
      const h = t.getBoundingClientRect().height;
      i.style.height = `${Math.max(10, Math.round(h))}px`;
      i.style.width = "auto";
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <div
      className="w-full aspect-[9/16] rounded-lg overflow-hidden flex flex-col items-stretch justify-center"
      style={{ background: bg }}
    >
      <div className="p-3 flex flex-col gap-3 w-full h-full">
        {/* Three photo placeholders (top 3) */}
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/70 flex-1"
              : "bg-black/70 flex-1"
          }
        />
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/70 flex-1"
              : "bg-black/70 flex-1"
          }
        />
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/70 flex-1"
              : "bg-black/70 flex-1"
          }
        />
        {/* Logo + texts card (bottom) */}
        <div className="flex-1 relative flex items-center justify-center">
          <div className="h-[86%] flex items-center gap-3 w-auto">
            {/* Left: Logo */}
            <div className="flex items-center justify-center shrink-0 h-full">
              <img
                src={
                  variant === "phone-dark"
                    ? "/AssessioDarkMode.png"
                    : "/AssessioLightMode.png"
                }
                alt="Assessio"
                ref={imgRef}
                className="object-contain"
                style={{ maxWidth: "140px" }}
              />
            </div>
            {/* Right: Two-line text */}
            <div ref={textRef} className="flex flex-col justify-center">
              <div
                className="font-extrabold leading-none tracking-tight truncate"
                style={{
                  color: variant === "phone-dark" ? "#D1D9F2" : "#0D2260",
                  fontSize: "clamp(18px, 4.8vh, 34px)",
                }}
                title="EXHIBITION DAY"
              >
                EXHIBITION DAY
              </div>
              <div
                className="font-semibold leading-tight opacity-80 truncate"
                style={{
                  color: variant === "phone-dark" ? "#D1D9F2" : "#0D2260",
                  fontSize: "clamp(17px, 4.4vh, 31px)",
                }}
                title="Assessio @ 2025"
              >
                Assessio @ 2025
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Preview now uses the shared composer for parity with the result page
function PreviewStrip({
  layout,
  photoSrcs,
}: {
  layout: LayoutId;
  photoSrcs: string[] | null;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [imgs, setImgs] = useState<HTMLImageElement[] | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);

  // Load images once when sources change
  useEffect(() => {
    let cancelled = false;
    if (!photoSrcs || photoSrcs.length === 0) {
      setImgs(null);
      return;
    }
    Promise.all(
      photoSrcs.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
          })
      )
    ).then((arr) => {
      if (!cancelled) setImgs(arr);
    });
    // Load logo once based on layout (dark vs light)
    const li = new Image();
    li.onload = () => {
      if (!cancelled) setLogo(li);
    };
    li.src =
      layout === "template-phone-dark"
        ? "/AssessioDarkMode.png"
        : "/AssessioLightMode.png";
    return () => {
      cancelled = true;
    };
  }, [photoSrcs, layout]);

  // Draw preview
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // Increase preview base size on very large screens
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    const w = vw >= 1536 ? 600 : 400;
    const h = Math.round((16 / 9) * w);
    composeStrip(c, layout, imgs, {
      width: w,
      height: h,
      logo,
    });
  }, [layout, imgs, logo]);

  // Show shell while loading
  if (!photoSrcs || !imgs) {
    const variant =
      layout === "template-phone"
        ? "phone"
        : layout === "template-phone-pastel"
        ? "phone-pastel"
        : "phone-dark";
    return <PreviewShell variant={variant} />;
  }

  return (
    <div className="w-full aspect-[9/16] rounded-lg overflow-hidden flex items-center justify-center">
      <canvas ref={ref} className="w-full h-full object-contain" />
    </div>
  );
}

const options: TemplateOption[] = [
  {
    id: "template-phone",
    label: "Phone Print (9:16)",
    preview: <PreviewShell variant="phone" />,
  },
  {
    id: "template-phone-pastel",
    label: "Pastel Print (9:16)",
    preview: <PreviewShell variant="phone-pastel" />,
  },
  {
    id: "template-phone-dark",
    label: "Darkroom Print (9:16)",
    preview: <PreviewShell variant="phone-dark" />,
  },
];

export default function PhotoLayoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading…</div>
        </main>
      }
    >
      <PhotoLayoutInner />
    </Suspense>
  );
}

function PhotoLayoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [selected, setSelected] = useState<TemplateOption>(options[0]);
  const [photoSrcs, setPhotoSrcs] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load session photos for previews
  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = await loadSession(id);
      if (!s) {
        setLoadError(
          "Missing session. Please retake photos from the home page."
        );
        setPhotoSrcs(null);
        return;
      }
      setPhotoSrcs(s.photos || null);
      // Preselect saved layout if any
      const opt = options.find((o) => o.id === s.layout) || options[0];
      setSelected(opt);
    })();
  }, [id]);

  const canContinue = useMemo(() => Boolean(id && selected), [id, selected]);

  const go = async () => {
    if (!canContinue || !id) return;
    const ok = await updateSession(id, { layout: selected.id });
    if (ok) router.push(`/photo-result?id=${encodeURIComponent(id)}`);
  };

  return (
    <main className="flex flex-col items-center">
      <div className="w-full max-w-4xl 2xl:max-w-[1600px] space-y-8 2xl:space-y-10">
        <h1 className="heading-2 text-center">Choose your template</h1>

        {!id && (
          <div className="text-sm text-red-600 text-center bg-red-50 p-4 rounded-lg">
            Missing session. Please retake photos from the home page.
          </div>
        )}
        {loadError && id && (
          <div className="text-sm text-red-600 text-center bg-red-50 p-4 rounded-lg">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 2xl:gap-10">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt)}
              className={`card p-6 2xl:p-8 flex flex-col items-center gap-4 transition-all duration-200 text-left hover:shadow-lg transform hover:-translate-y-1 min-h-[400px] 2xl:min-h-[520px] ${
                selected.id === opt.id
                  ? "is-selected ring-4 ring-blue-500 bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex-1 w-full flex items-center justify-center">
                {photoSrcs ? (
                  <PreviewStrip layout={opt.id} photoSrcs={photoSrcs} />
                ) : (
                  opt.preview
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={go}
            disabled={!canContinue}
            className="btn btn-primary w-80 px-6 py-3 2xl:px-8 2xl:py-4"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
