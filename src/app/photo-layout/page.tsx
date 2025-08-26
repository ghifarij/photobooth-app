"use client";

import { JSX, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LayoutOption = {
  id: string;
  label: string;
  photos: number;
  preview: JSX.Element;
};

const options: LayoutOption[] = [
  {
    id: "2-vertical",
    label: "2 vertical",
    photos: 2,
    preview: (
      <div className="grid grid-rows-2 gap-1 h-24">
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
      </div>
    ),
  },
  {
    id: "3-grid",
    label: "3 layout",
    photos: 3,
    preview: (
      <div className="grid grid-cols-3 gap-1 h-24">
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
      </div>
    ),
  },
  {
    id: "4-grid",
    label: "4 layout",
    photos: 4,
    preview: (
      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-24">
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
        <div className="bg-gray-300 rounded" />
      </div>
    ),
  },
];

export default function PhotoLayoutPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LayoutOption>(options[0]);
  const [timer, setTimer] = useState<3 | 5>(3);

  const canContinue = useMemo(
    () => Boolean(selected && timer),
    [selected, timer]
  );

  const go = () => {
    if (!canContinue) return;
    const params = new URLSearchParams({
      layout: selected.id,
      photos: String(selected.photos),
      timer: String(timer),
    });
    router.push(`/photobooth?${params.toString()}`);
  };

  return (
    <main className="min-h-dvh p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Choose your layout</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt)}
              className={`border rounded-lg p-4 flex flex-col items-center gap-3 hover:bg-gray-50 transition text-left ${
                selected.id === opt.id ? "border-black" : "border-gray-300"
              }`}
            >
              <div className="w-24">{opt.preview}</div>
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs opacity-60">{opt.photos} photos</div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="font-medium">Timer</div>
          <div className="flex gap-3">
            {[3, 5].map((t) => (
              <button
                key={t}
                onClick={() => setTimer(t as 3 | 5)}
                className={`px-4 py-2 rounded-md border ${
                  timer === t ? "border-black" : "border-gray-300"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={go}
            disabled={!canContinue}
            className="inline-flex items-center justify-center rounded-md bg-black text-white px-6 py-3 text-base font-medium disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
