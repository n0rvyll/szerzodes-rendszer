// app/api/files/[documentId]/route.ts
import { NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';

// Node runtime kell az fs-hez
export const runtime = 'nodejs';

// Opcionális: állíts be egy abszolút feltöltési könyvtárat .env-ben
// pl. NEXT_UPLOADS_DIR=/abszolut/elérési/út/uploads
const UPLOADS_DIR =
  process.env.NEXT_UPLOADS_DIR && process.env.NEXT_UPLOADS_DIR.trim().length > 0
    ? process.env.NEXT_UPLOADS_DIR
    : path.join(process.cwd(), 'uploads');

export async function GET(
  _req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const raw = params.documentId || '';
    const safeName = path.basename(raw);

    // Ha nincs .pdf, próbáljuk azzal is
    const candidates = safeName.toLowerCase().endsWith('.pdf')
      ? [safeName]
      : [safeName, `${safeName}.pdf`];

    const triedPaths: string[] = [];
    let foundPath: string | null = null;

    for (const name of candidates) {
      const p = path.join(UPLOADS_DIR, name);
      triedPaths.push(p);
      try {
        const s = await stat(p);
        if (s.isFile()) {
          foundPath = p;
          break;
        }
      } catch {
        // megyünk tovább
      }
    }

    if (!foundPath) {
      // Hasznos debug infó
      const debug = {
        error: 'Fájl nem található',
        cwd: process.cwd(),
        uploadsDir: UPLOADS_DIR,
        documentId: raw,
        candidates,
        triedPaths,
        hint:
          'Ellenőrizd, hogy a fájl ténylegesen létezik az uploads könyvtárban, és a documentId pontosan a fájlnév (kis/nagybetű is számít Linuxon).',
      };
      // Logoljuk szerverre is
      console.error('[files route] not found:', debug);
      return NextResponse.json(debug, { status: 404 });
    }

    const stream = createReadStream(foundPath);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${path.basename(foundPath)}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[files route] unexpected error:', err);
    return NextResponse.json(
      { error: 'Váratlan hiba a fájl kiszolgálásakor', message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
