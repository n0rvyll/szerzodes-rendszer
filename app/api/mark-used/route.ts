// app/api/mark-used/route.ts
import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Hiányzó token' }, { status: 400 });

    const fp = path.join(process.cwd(), 'public', 'links', `${token}.json`);
    const raw = await readFile(fp, 'utf-8');
    const json = JSON.parse(raw);

    // már megnyitott? hagyjuk úgy
    if (!json.used) {
      json.used = true;
      json.usedAt = new Date().toISOString();
      await writeFile(fp, JSON.stringify(json, null, 2), 'utf-8');
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Hiba' }, { status: 500 });
  }
}
