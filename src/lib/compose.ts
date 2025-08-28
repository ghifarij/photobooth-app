export type LayoutId = string;

export type ComposeOptions = {
  width?: number;
  height?: number;
  // Optional background image (used by PHOTOSTRIP_* templates)
  background?: HTMLImageElement | null;
  // Optional base DPI for mm->px mapping in photostrip (defaults 300)
  dpi?: number;
};

// Photostrip-only composer: draws the photostrip background and places
// three photos (35mm x 23mm each) within the grey areas without touching icons.
export function composeStrip(
  canvas: HTMLCanvasElement,
  layout: LayoutId,
  photos: HTMLImageElement[] | null,
  opts: ComposeOptions = {}
) {
  // Photostrip-only flow: background + three photos placed in the dark slots
  const BASE_W = 1575;
  const BASE_H = 4725;
  const W = opts.width ?? BASE_W;
  const H = opts.height ?? BASE_H;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Draw provided background if any; otherwise fill neutral
  if (opts.background) {
    ctx.drawImage(opts.background, 0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#f3f4f6");
    grad.addColorStop(1, "#e5e7eb");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

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

  const drawImageCover = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  };

  // Try to detect dark/gray/transparent rectangular "slots" on the background
  // so photos fill them. First approach: pixel-level mask from the drawn template.
  // If unavailable, fallback to a coarse downscaled luminance approach.
  const detectSlots = (bg: HTMLImageElement): { x: number; y: number; w: number; h: number }[] => {
    // Use an offscreen canvas with small resolution to speed up scanning
    const targetW = 220; // small but enough to locate edges
    const targetH = Math.max(220, Math.round((targetW * H) / W));
    const off = document.createElement("canvas");
    off.width = targetW;
    off.height = targetH;
    const octx = off.getContext("2d");
    if (!octx) return [];
    // Draw the same background scaling we used for main canvas
    octx.drawImage(bg, 0, 0, targetW, targetH);
    const { data } = octx.getImageData(0, 0, targetW, targetH);

    // Helper: get luminance and dark mask with threshold
    const isDarkRow: boolean[] = new Array(targetH).fill(false);
    const leftMargin = Math.floor(targetW * 0.1);
    const rightMargin = Math.ceil(targetW * 0.9);
    const darkThreshold = 36; // 0..255 luminance cutoff for near-black
    const lightThreshold = 170; // light gray detection
    for (let y = 0; y < targetH; y++) {
      let darkCount = 0;
      let total = 0;
      for (let x = leftMargin; x < rightMargin; x++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // relative luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum <= darkThreshold) darkCount++;
        total++;
      }
      isDarkRow[y] = darkCount / total > 0.6; // mostly dark across the row
    }

    // Collapse contiguous dark rows into vertical bands
    type Band = { top: number; bottom: number };
    const bands: Band[] = [];
    let start: number | null = null;
    for (let y = 0; y < targetH; y++) {
      if (isDarkRow[y]) {
        if (start == null) start = y;
      } else if (start != null) {
        bands.push({ top: start, bottom: y - 1 });
        start = null;
      }
    }
    if (start != null) bands.push({ top: start, bottom: targetH - 1 });

    // For each band, find left/right bounds by scanning columns
    const colDarkRatio = (x: number, top: number, bottom: number) => {
      let dark = 0;
      let tot = 0;
      for (let y = top; y <= bottom; y++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum <= darkThreshold) dark++;
        tot++;
      }
      return dark / tot;
    };

    const rowLightRatio = (y: number, left: number, right: number) => {
      let light = 0;
      let tot = 0;
      for (let x = left; x <= right; x++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum >= lightThreshold) light++;
        tot++;
      }
      return light / tot;
    };

    const colLightRatio = (x: number, top: number, bottom: number) => {
      let light = 0;
      let tot = 0;
      for (let y = top; y <= bottom; y++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum >= lightThreshold) light++;
        tot++;
      }
      return light / tot;
    };

    const rects: { x: number; y: number; w: number; h: number }[] = [];
    for (const band of bands) {
      const bandH = band.bottom - band.top + 1;
      if (bandH < targetH * 0.08) continue; // ignore tiny bands

      // Determine horizontal dark span inside this band
      const threshold = 0.55;
      let left = -1;
      let right = -1;
      for (let x = 0; x < targetW; x++) {
        const ratio = colDarkRatio(x, band.top, band.bottom);
        if (ratio > threshold) {
          if (left === -1) left = x;
          right = x;
        }
      }
      if (left === -1 || right === -1) continue;

      // Ignore very narrow spans
      const spanW = right - left + 1;
      if (spanW < targetW * 0.3) continue;

      // Refine to the inner light-gray area by trimming dark edges
      // Start from the band area and clip inward where rows/cols are mostly light
      const innerLeftMargin = Math.max(0, Math.floor(spanW * 0.05));
      const scanLeft = Math.max(left + innerLeftMargin, 0);
      const scanRight = Math.min(right - innerLeftMargin, targetW - 1);

      // Find top/bottom where rows turn light
      let top = band.top;
      for (let y = band.top; y <= band.bottom; y++) {
        const lr = rowLightRatio(y, scanLeft, scanRight);
        if (lr > 0.55) {
          top = y;
          break;
        }
      }
      let bottom = band.bottom;
      for (let y = band.bottom; y >= band.top; y--) {
        const lr = rowLightRatio(y, scanLeft, scanRight);
        if (lr > 0.55) {
          bottom = y;
          break;
        }
      }

      // Find left/right where columns turn light inside the vertical range
      let innerLeft = scanLeft;
      for (let x = scanLeft; x <= scanRight; x++) {
        const lr = colLightRatio(x, top, bottom);
        if (lr > 0.55) {
          innerLeft = x;
          break;
        }
      }
      let innerRight = scanRight;
      for (let x = scanRight; x >= scanLeft; x--) {
        const lr = colLightRatio(x, top, bottom);
        if (lr > 0.55) {
          innerRight = x;
          break;
        }
      }

      // Ensure valid inner rectangle; fallback to original dark span if needed
      let finalLeft = left;
      let finalRight = right;
      let finalTop = band.top;
      let finalBottom = band.bottom;
      if (innerRight > innerLeft && bottom > top) {
        finalLeft = innerLeft;
        finalRight = innerRight;
        finalTop = top;
        finalBottom = bottom;
      }

      // Map rect back to main canvas size (inner area)
      const scaleX = W / targetW;
      const scaleY = H / targetH;
      rects.push({
        x: Math.round(finalLeft * scaleX),
        y: Math.round(finalTop * scaleY),
        w: Math.round((finalRight - finalLeft + 1) * scaleX),
        h: Math.round((finalBottom - finalTop + 1) * scaleY),
      });
    }

    // Sort top-to-bottom and return
    rects.sort((a, b) => a.y - b.y);
    return rects;
  };

  const slots = opts.background ? detectSlots(opts.background) : [];

  // New: Pixel-level replacement using template transparency/gray mask when background exists
  if (opts.background) {
    // First draw background as already done above, then read pixels
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    const N = W * H;

    // Build candidate mask: transparent OR light gray neutral
    const mask = new Uint8Array(N);
    const alphaThr = 10; // near transparent
    const grayMin = 110;
    const grayMax = 190;
    const chromaMax = 22; // max channel difference to consider gray
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const a = data[o + 3];
      const maxCh = Math.max(r, g, b);
      const minCh = Math.min(r, g, b);
      const isTransparent = a <= alphaThr;
      const isGray = a >= 200 && maxCh - minCh <= chromaMax && r >= grayMin && r <= grayMax && g >= grayMin && g <= grayMax && b >= grayMin && b <= grayMax;
      mask[i] = isTransparent || isGray ? 1 : 0;
    }

    // Detect up to 3 vertical slot rectangles from the mask
    const detectRectsFromMask = (): { x: number; y: number; w: number; h: number }[] => {
      const leftMargin = Math.floor(W * 0.08);
      const rightMargin = Math.ceil(W * 0.92);
      const isBand: boolean[] = new Array(H).fill(false);
      const widthSpan = rightMargin - leftMargin;
      for (let y = 0; y < H; y++) {
        let c = 0;
        for (let x = leftMargin; x < rightMargin; x++) {
          if (mask[y * W + x]) c++;
        }
        isBand[y] = c / widthSpan > 0.5; // majority of the row is candidate
      }
      // collapse into bands
      const bands: { top: number; bottom: number }[] = [];
      let start: number | null = null;
      for (let y = 0; y < H; y++) {
        if (isBand[y]) {
          if (start == null) start = y;
        } else if (start != null) {
          bands.push({ top: start, bottom: y - 1 });
          start = null;
        }
      }
      if (start != null) bands.push({ top: start, bottom: H - 1 });

      // For each band, find left/right bounds by column coverage
      const rects: { x: number; y: number; w: number; h: number }[] = [];
      for (const band of bands) {
        const bandH = band.bottom - band.top + 1;
        if (bandH < H * 0.05) continue; // ignore tiny bands
        let left = -1;
        let right = -1;
        for (let x = 0; x < W; x++) {
          let c = 0;
          for (let y = band.top; y <= band.bottom; y++) {
            if (mask[y * W + x]) c++;
          }
          if (c / bandH > 0.5) {
            if (left === -1) left = x;
            right = x;
          }
        }
        if (left === -1 || right === -1) continue;
        const spanW = right - left + 1;
        if (spanW < W * 0.3) continue;

        // Trim 1-2% inside to avoid including any dark border pixels
        const trimX = Math.floor(spanW * 0.01);
        const trimY = Math.floor(bandH * 0.01);
        const rx = Math.max(0, left + trimX);
        const ry = Math.max(0, band.top + trimY);
        const rw = Math.min(W - rx, spanW - 2 * trimX);
        const rh = Math.min(H - ry, bandH - 2 * trimY);
        rects.push({ x: rx, y: ry, w: rw, h: rh });
      }
      rects.sort((a, b) => a.y - b.y);
      // If more than 3, keep the 3 tallest
      if (rects.length > 3) {
        rects.sort((a, b) => b.h - a.h);
        const top3 = rects.slice(0, 3);
        top3.sort((a, b) => a.y - b.y);
        return top3;
      }
      return rects;
    };

    const rects = detectRectsFromMask();
    if (rects.length >= 1 && photos && photos.length) {
      // Replace pixels inside mask for up to 3 regions
      const regions = rects.slice(0, 3);
      for (let i = 0; i < regions.length; i++) {
        const img = photos[i];
        if (!img) break;
        const r = regions[i];
        // Draw photo to offscreen at cover size to region dims
        const off = document.createElement("canvas");
        off.width = r.w;
        off.height = r.h;
        const octx = off.getContext("2d");
        if (!octx) continue;
        // Cover fit
        const scale = Math.max(r.w / img.width, r.h / img.height);
        const dw = Math.ceil(img.width * scale);
        const dh = Math.ceil(img.height * scale);
        const dx = Math.floor((r.w - dw) / 2);
        const dy = Math.floor((r.h - dh) / 2);
        octx.drawImage(img, dx, dy, dw, dh);
        const photoData = octx.getImageData(0, 0, r.w, r.h).data;

        // Blit only where mask=1
        for (let yy = 0; yy < r.h; yy++) {
          const cy = r.y + yy;
          const rowOffCanvas = cy * W;
          const rowOffPhoto = yy * r.w;
          for (let xx = 0; xx < r.w; xx++) {
            const cx = r.x + xx;
            const idxCanvas = rowOffCanvas + cx;
            if (!mask[idxCanvas]) continue; // keep decorative pixels intact
            const oC = idxCanvas * 4;
            const oP = (rowOffPhoto + xx) * 4;
            data[oC] = photoData[oP];
            data[oC + 1] = photoData[oP + 1];
            data[oC + 2] = photoData[oP + 2];
            data[oC + 3] = photoData[oP + 3];
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      return; // finished pixel-level composite
    }
    // If we couldn't detect regions, fall back to geometric approach below
  }

  // Draw photos into detected slots with padding; fallback to reasonable layout
  let pIndex = 0;
  if (slots.length >= 3) {
    // Use first three slots (top to bottom)
    for (let i = 0; i < 3; i++) {
      const slot = slots[i];
      const img = photos?.[pIndex++];
      if (!img) continue;
      drawImageCover(img, slot.x, slot.y, slot.w, slot.h);
    }
    return;
  }

  // Fallback: template-agnostic layout, centered on canvas but sized generously
  const padX = Math.round(W * 0.06);
  const padY = Math.round(H * 0.06);
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const vGap = Math.floor(innerH * 0.02);
  const slotH = Math.floor((innerH - 2 * vGap) / 3);
  const slotsFallback = [
    { x: padX, y: padY, w: innerW, h: slotH },
    { x: padX, y: padY + slotH + vGap, w: innerW, h: slotH },
    { x: padX, y: padY + 2 * (slotH + vGap), w: innerW, h: slotH },
  ];

  for (let i = 0; i < 3; i++) {
    const img = photos?.[i];
    if (!img) continue;
    const r = slotsFallback[i];
    drawImageCover(img, r.x, r.y, r.w, r.h);
  }
}
