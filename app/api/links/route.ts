// app/api/links/route.ts
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LinkRow = {
  token: string;
  documentId: string;
  name: string;
  contact?: { email?: string | null; phone?: string | null };
  createdAt: string;
  expiresAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  used?: boolean;
  revokedAt?: string | null;
  url: string;
  status?: string;
  docTitle?: string | null;
  fileName?: string | null;
};

function computeStatus(item: LinkRow): 'active'|'acknowledged'|'expired'|'revoked'|'used' {
  const now = Date.now();
  const exp = Date.parse(item.expiresAt);
  if (item.revokedAt) return 'revoked';
  if (!Number.isNaN(exp) && now > exp) return 'expired';
  if (item.acknowledged || item.acknowledgedAt) return 'acknowledged';
  if (item.used) return 'used';
  return 'active';
}

export async function GET() {
  try {
    const linksDir = path.join(process.cwd(), 'public', 'links');
    const files = await readdir(linksDir).catch(() => []);
    const jsons = files.filter((f) => f.endsWith('.json'));

    // manifest: uploads/manifest.json (opcionális)
    const mfPath = path.join(process.cwd(), 'uploads', 'manifest.json');
    let manifest: any = null;
    try {
      const raw = await readFile(mfPath, 'utf-8');
      manifest = JSON.parse(raw);
    } catch {}

    const items: LinkRow[] = [];
    for (const f of jsons) {
      try {
        const raw = await readFile(path.join(linksDir, f), 'utf-8');
        const item = JSON.parse(raw) as LinkRow;

        // státusz egységesítése
        const status = computeStatus(item);

        // fájlnév kinyerés (manifestből vagy fallback)
        let fileName: string | null = null;
        if (manifest) {
          if (Array.isArray(manifest)) {
            const meta = manifest.find((m: any) => m?.documentId === item.documentId);
            fileName = meta?.fileName || meta?.title || null;
          } else if (manifest[item.documentId]) {
            const meta = manifest[item.documentId];
            fileName = meta?.fileName || meta?.title || null;
          }
        }
        if (!fileName) {
          // fallback: <documentId>.pdf
          fileName = `${item.documentId}.pdf`;
        }

        items.push({
          ...item,
          status,
          fileName,
        });
      } catch {}
    }

    // Legyen a legfrissebb elől
    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Hiba' }, { status: 500 });
  }
}
