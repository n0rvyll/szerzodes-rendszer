import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { mkdirSync } from "fs";

type DocMeta = {
  documentId: string;
  fileName: string; // pl. 1723112345678.pdf
  title?: string;   // emberi név
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const documentId = Date.now().toString();
    const fileName = `${documentId}.pdf`;

    const uploadsDir = path.join(process.cwd(), "uploads"); // privát mappa
    mkdirSync(uploadsDir, { recursive: true });
    const uploadPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(uploadPath, buffer);

    // Manifest frissítése
    const manifestPath = path.join(uploadsDir, "manifest.json");
    let manifest: Record<string, DocMeta> = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch {
        manifest = {};
      }
    }

    manifest[documentId] = { documentId, fileName, title: title || undefined };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    return NextResponse.json({ documentId, title: title || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}