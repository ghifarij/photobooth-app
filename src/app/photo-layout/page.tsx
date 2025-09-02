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
// Phone templates removed; only photostrip previews are supported.

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
  const [bg, setBg] = useState<HTMLImageElement | null>(null);

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
    // Load photostrip background
    if (typeof layout === "string") {
      const bi = new Image();
      bi.onload = () => {
        if (!cancelled) setBg(bi);
      };
      bi.src = `/${layout}.png`;
    } else {
      setBg(null);
    }
    return () => {
      cancelled = true;
    };
  }, [photoSrcs, layout]);

  // Draw preview
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // Photostrip preview sizing
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    const w = vw >= 1536 ? 360 : 280;
    const h = Math.round(w * (4725 / 1575));
    composeStrip(c, layout, imgs, {
      width: w,
      height: h,
      background: bg,
    });
  }, [layout, imgs, bg]);

  // Show shell while loading
  if (!photoSrcs || !imgs) {
    // Photostrip static background shell
    return (
      <div className="w-full aspect-[1/3] rounded-lg overflow-hidden flex items-center justify-center bg-[var(--surface-1)]">
        <img
          src={`/${layout}.png`}
          alt={layout}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-[1/3] rounded-lg overflow-hidden flex items-center justify-center">
      <canvas ref={ref} className="w-full h-full object-contain" />
    </div>
  );
}

const options: TemplateOption[] = [
  {
    id: "PHOTOSTRIP_A",
    label: "Photostrip A",
    preview: (
      <div className="w-full aspect-[1/3] rounded-lg overflow-hidden flex items-center justify-center bg-[var(--surface-1)]">
        <img
          src="/PHOTOSTRIP_A.png"
          alt="Photostrip A"
          className="w-full h-full object-contain"
        />
      </div>
    ),
  },
  {
    id: "PHOTOSTRIP_B",
    label: "Photostrip B",
    preview: (
      <div className="w-full aspect-[1/3] rounded-lg overflow-hidden flex items-center justify-center bg-[var(--surface-1)]">
        <img
          src="/PHOTOSTRIP_B.png"
          alt="Photostrip B"
          className="w-full h-full object-contain"
        />
      </div>
    ),
  },
  {
    id: "PHOTOSTRIP_C",
    label: "Photostrip C",
    preview: (
      <div className="w-full aspect-[1/3] rounded-lg overflow-hidden flex items-center justify-center bg-[var(--surface-1)]">
        <img
          src="/PHOTOSTRIP_C.png"
          alt="Photostrip C"
          className="w-full h-full object-contain"
        />
      </div>
    ),
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
      <div className="w-full max-w-[640px] 2xl:max-w-[1100px] space-y-8 2xl:space-y-10">
        <h1 className="heading-2 text-center">Choose your style!</h1>

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
