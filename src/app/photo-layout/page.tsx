"use client";

import { JSX, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateSession } from "../../lib/session";

type TemplateOption = {
  id: string;
  label: string;
  preview: JSX.Element;
};

const PreviewCard = ({ bg }: { bg: string }) => (
  <div
    className="w-20 h-60 rounded-md overflow-hidden border flex flex-col items-stretch justify-between"
    style={{ backgroundColor: bg }}
  >
    <div className="p-1 space-y-1 flex-1 flex flex-col">
      <div className="bg-white/70 rounded-sm h-1/3" />
      <div className="bg-white/70 rounded-sm h-1/3" />
      <div className="bg-white/70 rounded-sm h-1/3" />
    </div>
    <div className="text-[9px] text-center py-1 font-medium text-black/80">
      {"Let's make a moment"}
    </div>
  </div>
);

const options: TemplateOption[] = [
  {
    id: "template-blue",
    label: "Blue",
    preview: <PreviewCard bg="#BFDBFE" />,
  },
  {
    id: "template-green",
    label: "Green",
    preview: <PreviewCard bg="#BBF7D0" />,
  },
  {
    id: "template-rose",
    label: "Rose",
    preview: <PreviewCard bg="#FBCFE8" />,
  },
];

export default function PhotoLayoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh p-6 flex items-center justify-center">
          Loading…
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

  const canContinue = useMemo(() => Boolean(id && selected), [id, selected]);

  const go = async () => {
    if (!canContinue || !id) return;
    const ok = await updateSession(id, { layout: selected.id });
    if (ok) router.push(`/photo-result?id=${encodeURIComponent(id)}`);
  };

  return (
    <main className="min-h-dvh p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Choose your template</h1>

        {!id && (
          <div className="text-sm text-red-600">
            Missing session. Please retake photos from the home page.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt)}
              className={`border rounded-lg p-4 flex flex-col items-center gap-3 hover:bg-gray-50 transition text-left ${
                selected.id === opt.id ? "border-black" : "border-gray-300"
              }`}
            >
              {opt.preview}
              <div className="font-medium">{opt.label}</div>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={go}
            disabled={!canContinue}
            className="inline-flex items-center justify-center rounded-md bg-[#4062CB] text-white px-6 py-3 text-base font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
