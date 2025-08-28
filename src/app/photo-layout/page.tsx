"use client";

import { JSX, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadSession, updateSession } from "../../lib/session";
import { composeStrip } from "../../lib/compose";

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

  return (
    <div
      className="w-full aspect-[3/4] rounded-lg overflow-hidden border-2 flex flex-col items-stretch justify-between"
      style={{ background: bg }}
    >
      <div className="p-3 space-y-3 flex-1 flex flex-col">
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/80 rounded-md h-[30%]"
              : "bg-black/80 rounded-md h-[30%]"
          }
        />
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/80 rounded-md h-[30%]"
              : "bg-black/80 rounded-md h-[30%]"
          }
        />
        <div
          className={
            variant === "phone-dark"
              ? "bg-white/80 rounded-md h-[30%]"
              : "bg-black/80 rounded-md h-[30%]"
          }
        />
      </div>
      <div
        className={
          variant === "phone-dark"
            ? "text-sm text-center py-2 font-medium text-white/90"
            : "text-sm text-center py-2 font-medium text-black/80"
        }
      >
        {variant === "phone"
          ? "Phone Print"
          : variant === "phone-pastel"
          ? "Pastel Print"
          : "Darkroom Print"}
      </div>
    </div>
  );
};

// Preview now uses the shared composer for parity with the result page
function PreviewStrip({
  layout,
  photoSrcs,
}: {
  layout: string;
  photoSrcs: string[] | null;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [imgs, setImgs] = useState<HTMLImageElement[] | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [photoSrcs]);

  // Draw preview
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const isPhone =
      layout === "template-phone" ||
      layout === "template-phone-pastel" ||
      layout === "template-phone-dark";
    // Increase preview size significantly for better visibility
    const w = 400;
    const h = isPhone ? Math.round((4 / 3) * w) : 800;
    composeStrip(c, layout, imgs, { width: w, height: h });
  }, [layout, imgs]);

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

  const isPhone =
    layout === "template-phone" ||
    layout === "template-phone-pastel" ||
    layout === "template-phone-dark";

  return (
    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border-2 flex items-center justify-center bg-gray-50">
      <canvas ref={ref} className="w-full h-full object-contain" />
    </div>
  );
}

const options: TemplateOption[] = [
  {
    id: "template-phone",
    label: "Phone Print (4:3)",
    preview: <PreviewShell variant="phone" />,
  },
  {
    id: "template-phone-pastel",
    label: "Pastel Print (4:3)",
    preview: <PreviewShell variant="phone-pastel" />,
  },
  {
    id: "template-phone-dark",
    label: "Darkroom Print (4:3)",
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
      <div className="w-full max-w-6xl space-y-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt)}
              className={`card p-6 flex flex-col items-center gap-4 transition-all duration-200 text-left hover:shadow-lg transform hover:-translate-y-1 min-h-[400px] ${
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
            className="btn btn-primary"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
