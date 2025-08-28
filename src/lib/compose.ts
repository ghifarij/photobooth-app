export type LayoutId =
  | "template-phone"
  | "template-phone-pastel"
  | "template-phone-dark"
  | string;

export type ComposeOptions = {
  width?: number;
  height?: number;
};

// Draw a 3-photo vertical strip with template background.
// Phone-like templates use 4:3 landscape cells; others default to 9:16 portrait cells.
export function composeStrip(
  canvas: HTMLCanvasElement,
  layout: LayoutId,
  photos: HTMLImageElement[] | null,
  opts: ComposeOptions = {}
) {
  const W = opts.width ?? 800;
  const H = opts.height ?? 2400;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Helpers per-template
  const isPhoneLike =
    layout === "template-phone" ||
    layout === "template-phone-pastel" ||
    layout === "template-phone-dark";

  const targetRatio = isPhoneLike ? 4 / 3 : 9 / 16;

  const pad = Math.round(H * (isPhoneLike ? 0.012 : 0.016667));
  const gap = Math.round(H * (isPhoneLike ? 0.008 : 0.01));
  const captionH = isPhoneLike ? Math.round(H * 0.04) : Math.round(H * 0.0583);
  const radius = Math.max(2, Math.round(H * (isPhoneLike ? 0.006 : 0.008)));

  // Background per template
  const drawBackground = () => {
    switch (layout) {
      case "template-phone": {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#fafaf9");
        grad.addColorStop(1, "#f5f5f4");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        break;
      }
      case "template-phone-pastel": {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#fff1f2"); // rose-50
        grad.addColorStop(1, "#e0f2fe"); // sky-100
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        break;
      }
      case "template-phone-dark": {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#111827");
        grad.addColorStop(1, "#0b1220");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        break;
      }
      default: {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#f8fafc");
        grad.addColorStop(1, "#e2e8f0");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
    }
  };
  drawBackground();

  // Area for photos
  const areaX = pad;
  const areaY = pad;
  const areaW = W - pad * 2;
  const areaH = H - pad * 2 - captionH;
  const rows = 3;
  const maxCellH = (areaH - gap * (rows - 1)) / rows;
  const cellWByHeight = maxCellH * targetRatio;
  const cellW = Math.min(areaW, cellWByHeight);
  const cellH = cellW / targetRatio;
  const offsetX = areaX + (areaW - cellW) / 2;

  const drawImageContain = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const ir = img.width / img.height;
    const tr = w / h;
    let dw: number;
    let dh: number;
    if (ir > tr) {
      dw = w;
      dh = w / ir;
    } else {
      dh = h;
      dw = h * ir;
    }
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Draw each cell with subtle border depending on template
  for (let r = 0; r < rows; r++) {
    const x = offsetX;
    const y = areaY + r * (cellH + gap);
    const img = photos?.[r];
    if (img) {
      ctx.save();

      if (layout === "template-phone") {
        ctx.strokeStyle = "#d4d4d4";
        ctx.lineWidth = Math.max(1, Math.round(W * 0.004));
      } else if (layout === "template-phone-pastel") {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = Math.max(1, Math.round(W * 0.004));
      } else if (layout === "template-phone-dark") {
        ctx.strokeStyle = "#f3f4f6";
        ctx.lineWidth = Math.max(1, Math.round(W * 0.004));
      }

      // Rounded-rect clip and optional border
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + cellW - radius, y);
      ctx.quadraticCurveTo(x + cellW, y, x + cellW, y + radius);
      ctx.lineTo(x + cellW, y + cellH - radius);
      ctx.quadraticCurveTo(x + cellW, y + cellH, x + cellW - radius, y + cellH);
      ctx.lineTo(x + radius, y + cellH);
      ctx.quadraticCurveTo(x, y + cellH, x, y + cellH - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      if (isPhoneLike) ctx.stroke();
      ctx.clip();

      drawImageContain(img, x, y, cellW, cellH);
      ctx.restore();
    }
  }

  // Caption
  ctx.fillStyle = layout === "template-phone-dark" ? "#e5e7eb" : "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontPx = Math.round(H * (isPhoneLike ? 0.018 : 0.02));
  ctx.font = `bold ${fontPx}px sans-serif`;
  const caption =
    layout === "template-phone"
      ? "Phone Print"
      : layout === "template-phone-pastel"
      ? "Pastel Print"
      : layout === "template-phone-dark"
      ? "Darkroom Print"
      : "Photo Strip";
  ctx.fillText(caption, W / 2, H - pad - captionH / 2);
}
