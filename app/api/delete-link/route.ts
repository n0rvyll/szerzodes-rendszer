// app/api/delete-link/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Hiányzó token' }, { status: 400 });

    const linksDir = path.join(process.cwd(), 'public', 'links');
    const fp = path.join(linksDir, `${token}.json`);

    await fs.unlink(fp);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Nem gond, ha már nincs meg a fájl – kompatibilitás kedvéért 200-at adunk vissza
    if (e?.code === 'ENOENT') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Törlési hiba' }, { status: 500 });
  }
}
