export type LayoutId =
  | "template-phone"
  | "template-phone-pastel"
  | "template-phone-dark"
  | string;

export type ComposeOptions = {
  width?: number;
  height?: number;
  // Optional brand logo to place in one cell
  logo?: HTMLImageElement | null;
};

// Draw a 9:16 template with a 2x2 grid area where 3 photos are placed
// and 1 remaining slot (left-side slot) is reserved for the Assessio logo.
export function composeStrip(
  canvas: HTMLCanvasElement,
  layout: LayoutId,
  photos: HTMLImageElement[] | null,
  opts: ComposeOptions = {}
) {
  // Enforce 9:16 canvas by default
  const W = opts.width ?? 1080;
  const H = opts.height ?? 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Helpers per-template
  const pad = Math.round(H * 0.04); // outer padding
  const gap = Math.round(H * 0.02); // gap between cells

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

  // Single-column, 4-row vertical stack
  const areaX = pad;
  const areaY = pad;
  const areaW = W - pad * 2;
  const areaH = H - pad * 2;
  const cols = 1;
  const rows = 4;
  const cellW = areaW;
  const cellH = (areaH - gap * (rows - 1)) / rows;

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

  // Determine which cell is reserved for the logo
  // Order (single column): indices 0,1,2,3 from top to bottom
  // Place logo at the bottom slot (index 3)
  const logoCellIndex = 3; // bottom position
  const positions: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    const x = areaX;
    const y = areaY + r * (cellH + gap);
    positions.push({ x, y });
  }

  // Draw logo if provided
  const logo = opts.logo || null;
  {
    // Always render the right text block; logo is optional
    const { x, y } = positions[logoCellIndex];
    ctx.save();
    // Vertical paddings
    const padInner = Math.round(Math.min(cellW, cellH) * 0.10);
    const colGap = Math.round(cellW * 0.04);
    const innerY = y + padInner;
    const innerH = cellH - padInner * 2;

    // Initial estimates
    let leftW = Math.round((cellW - colGap) * 0.24); // smaller logo column
    const leftH = innerH;

    // Compute text sizes: make heading only slightly larger than sub
    let subPx = Math.max(16, Math.round(innerH * 0.22));
    let headingPx = Math.max(18, Math.round(subPx * 1.10)); // ~10% larger
    const lineGap = Math.round(innerH * 0.08);

    // Prepare colors and font
    const isDark = layout === "template-phone-dark";
    const color = isDark ? "#D1D9F2" : "#0D2260";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const heading = "EXHIBITION DAY";
    const sub = "Assessio @ 2025";

    // Measure text to calculate used width (keep text sizes as-is)
    ctx.font = `800 ${headingPx}px sans-serif`;
    let headingW = ctx.measureText(heading).width;
    ctx.font = `600 ${subPx}px sans-serif`;
    let subW = ctx.measureText(sub).width;

    // Fit both within right column width by scaling down uniformly if needed
    const rightMax = cellW - Math.round(Math.min(cellW, cellH) * 0.10) * 2 - leftW - colGap; // approximate available
    let maxW = Math.max(headingW, subW);
    if (maxW > rightMax && maxW > 0) {
      const f = rightMax / maxW;
      headingPx = Math.max(12, Math.floor(headingPx * f));
      subPx = Math.max(11, Math.floor(subPx * f));
      ctx.font = `800 ${headingPx}px sans-serif`;
      headingW = ctx.measureText(heading).width;
      ctx.font = `600 ${subPx}px sans-serif`;
      subW = ctx.measureText(sub).width;
      maxW = Math.max(headingW, subW);
    }

    // Nudge sizes to make visual lengths similar while keeping heading slightly larger
    for (let i = 0; i < 3; i++) {
      const diff = Math.abs(headingW - subW);
      const avg = (headingW + subW) / 2;
      if (avg === 0) break;
      const delta = diff / avg;
      if (delta <= 0.06) break; // within 6% considered same length
      if (headingW < subW) {
        headingPx = Math.min(headingPx + 1, headingPx * 1.06);
      } else {
        subPx = Math.min(subPx + 1, subPx * 1.06);
      }
      // Re-measure and ensure not exceeding rightMax
      ctx.font = `800 ${Math.floor(headingPx)}px sans-serif`;
      headingW = ctx.measureText(heading).width;
      ctx.font = `600 ${Math.floor(subPx)}px sans-serif`;
      subW = ctx.measureText(sub).width;
      const newMax = Math.max(headingW, subW);
      if (newMax > rightMax && newMax > 0) {
        const f2 = rightMax / newMax;
        headingPx = Math.floor(headingPx * f2);
        subPx = Math.floor(subPx * f2);
        ctx.font = `800 ${headingPx}px sans-serif`;
        headingW = ctx.measureText(heading).width;
        ctx.font = `600 ${subPx}px sans-serif`;
        subW = ctx.measureText(sub).width;
      }
    }

    // Ensure heading font remains slightly larger than sub font
    if (headingPx < subPx * 1.04) {
      headingPx = Math.ceil(subPx * 1.06);
      ctx.font = `800 ${headingPx}px sans-serif`;
      headingW = ctx.measureText(heading).width;
      if (headingW > rightMax && headingW > 0) {
        const f3 = rightMax / headingW;
        headingPx = Math.floor(headingPx * f3);
        subPx = Math.floor(subPx * f3);
      }
    }

    // Recompute widths after final sizes
    ctx.font = `800 ${headingPx}px sans-serif`;
    headingW = ctx.measureText(heading).width;
    ctx.font = `600 ${subPx}px sans-serif`;
    subW = ctx.measureText(sub).width;
    const rightUsed = Math.max(headingW, subW);

    // Keep text sizes fixed; if overflow, reduce logo column instead
    const maxGroupW = cellW - padInner * 2; // symmetrical side padding
    const neededForText = rightUsed + colGap;
    if (neededForText > maxGroupW) {
      // If even text+gap exceed available space, let it overflow slightly centered
      leftW = 0;
    } else if (leftW + neededForText > maxGroupW) {
      leftW = Math.max(0, maxGroupW - neededForText);
    }

    // Now center the content group horizontally
    const contentW = leftW + colGap + rightUsed;
    const offsetX = x + (cellW - contentW) / 2;
    const leftX = offsetX;
    const rightX = leftX + leftW + colGap;

    // Baselines for text
    const totalTextH = headingPx + lineGap + subPx;
    let ty = innerY + (innerH - totalTextH) / 2 + headingPx;

    // Draw logo sized to match text height (slightly smaller for balance)
    if (logo) {
      const desiredH = Math.round(totalTextH); // match combined text height
      const boxW = leftW;
      const boxH = Math.min(leftH, Math.round(desiredH));
      const bx = leftX; // left aligned
      const by = innerY + (leftH - boxH) / 2;
      drawImageContain(logo, bx, by, boxW, boxH);
    }

    // Draw heading
    ctx.fillStyle = color;
    ctx.font = `800 ${headingPx}px sans-serif`;
    ctx.fillText(heading, rightX, ty);

    // Draw sub
    ty += lineGap + subPx;
    ctx.font = `600 ${subPx}px sans-serif`;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.fillText(sub, rightX, ty);
    ctx.restore();

    ctx.restore();
  }

  // Draw up to 3 photos in remaining cells (skip the logo cell)
  let pIndex = 0;
  for (let i = 0; i < positions.length; i++) {
    if (i === logoCellIndex) continue;
    const img = photos?.[pIndex++];
    if (!img) continue;
    const { x, y } = positions[i];
    drawImageContain(img, x, y, cellW, cellH);
    if (pIndex >= 3) break; // only place 3 photos
  }
}
