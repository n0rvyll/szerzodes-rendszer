// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocMeta = {
  documentId: string;
  fileName: string;
  title?: string;
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null)?.trim();

    if (!file) {
      return NextResponse.json(
        { error: "Nincs fájl a kérésben." },
        { status: 400 }
      );
    }

    const documentId = Date.now().toString();
    const originalName = (file as any).name || "upload.bin";
    const ext = originalName.includes(".")
      ? originalName.split(".").pop()
      : "bin";
    const blobKey = `uploads/${documentId}.${ext}`;

    // ⬇️ Feltöltés a Vercel Blob Store-ba (publikus olvasás)
    const { url } = await put(blobKey, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN, // a Vercel UI automatikusan felveszi
    });

    const meta: DocMeta = {
      documentId,
      fileName: `${documentId}.${ext}`,
      title: title || undefined,
    };

    // Itt most NEM írunk lokális fájlt/manifestet (Vercel-en nem tartós).
    // A kliens oldalon használd az 'url'-t a megnyitáshoz/letöltéshez.

    return NextResponse.json({ documentId, title: title || null, url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
