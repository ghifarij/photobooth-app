import { NextResponse } from "next/server";
import crypto from "node:crypto";

// Force dynamic to ensure server runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function buildSignature(params: Record<string, string>, apiSecret: string) {
  // Exclude empty values and file/api_key/signature
  const entries = Object.entries(params)
    .filter(([k, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const toSign = entries.map(([k, v]) => `${k}=${v}`).join("&");
  return sha1(`${toSign}${apiSecret}`);
}

export async function POST(req: Request) {
  try {
    const { image, folder: folderBody, publicId } = (await req.json()) as {
      image?: string; // data URL or remote URL
      folder?: string;
      publicId?: string;
    };
    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary environment variables are not configured" },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = folderBody || process.env.CLOUDINARY_FOLDER || "";
    const paramsToSign: Record<string, string> = { timestamp };
    if (folder) paramsToSign.folder = folder;
    if (publicId) paramsToSign.public_id = publicId;

    const signature = buildSignature(paramsToSign, apiSecret);

    const form = new FormData();
    form.append("file", image);
    form.append("api_key", apiKey);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    if (folder) form.append("folder", folder);
    if (publicId) form.append("public_id", publicId);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: form }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({
      secure_url: data.secure_url as string,
      public_id: data.public_id as string,
      width: data.width as number,
      height: data.height as number,
      bytes: data.bytes as number,
      format: data.format as string,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
