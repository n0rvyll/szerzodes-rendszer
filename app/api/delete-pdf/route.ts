// app/api/delete-pdf/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readFile, writeFile, unlink, readdir } from 'fs/promises';
import path from 'path';

async function safeUnlink(fp: string) {
  try { await unlink(fp); } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e;
  }
}

export async function POST(req: Request) {
  try {
    const { documentId, deleteLinks } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Hiányzó documentId' }, { status: 400 });
    }

    // Fájlok törlése (mindkét helyen, ami nálatok előfordulhat)
    const uploads1 = path.join(process.cwd(), 'uploads', `${documentId}.pdf`);
    const uploads2 = path.join(process.cwd(), 'public', 'uploads', `${documentId}.pdf`);
    await safeUnlink(uploads1);
    await safeUnlink(uploads2);

    // Manifest frissítés (uploads/manifest.json – támogatja az objektum és a tömb formát)
    const mfPath = path.join(process.cwd(), 'uploads', 'manifest.json');
    try {
      const raw = await readFile(mfPath, 'utf-8');
      const manifest = JSON.parse(raw);
      let changed = false;

      if (Array.isArray(manifest)) {
        const before = manifest.length;
        const after = manifest.filter((m: any) => m?.documentId !== documentId);
        if (after.length !== before) {
          await writeFile(mfPath, JSON.stringify(after, null, 2), 'utf-8');
          changed = true;
        }
      } else if (manifest && typeof manifest === 'object') {
        if (manifest[documentId]) {
          delete manifest[documentId];
          await writeFile(mfPath, JSON.stringify(manifest, null, 2), 'utf-8');
          changed = true;
        }
      }

      if (changed) {
        // ok
      }
    } catch {
      // nincs manifest – nem gond
    }

    // (Opcionális) kapcsolódó linkek törlése
    let deletedLinks = 0;
    if (deleteLinks) {
      const linksDir = path.join(process.cwd(), 'public', 'links');
      try {
        const files = await readdir(linksDir);
        const jsons = files.filter((f) => f.endsWith('.json'));
        for (const f of jsons) {
          try {
            const raw = await readFile(path.join(linksDir, f), 'utf-8');
            const data = JSON.parse(raw);
            if (data?.documentId === documentId) {
              await safeUnlink(path.join(linksDir, f));
              deletedLinks++;
            }
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, deletedLinks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Törlési hiba' }, { status: 500 });
  }
}
