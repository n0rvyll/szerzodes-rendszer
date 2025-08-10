import { readdir, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const manifestPath = path.join(uploadsDir, "manifest.json");

  try {
    const files = await readdir(uploadsDir);
    const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

    let manifest: Record<string, { title?: string; fileName: string }> = {};
    try {
      const m = await readFile(manifestPath, "utf-8");
      manifest = JSON.parse(m);
    } catch {
      manifest = {};
    }

    // Visszaadunk egy gazdagabb listát
    const items = pdfs.map((fileName) => {
      const documentId = fileName.replace(/\.pdf$/i, "");
      const meta = manifest[documentId];
      return {
        documentId,
        fileName,
        title: meta?.title || null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ items: [] });
  }
}
