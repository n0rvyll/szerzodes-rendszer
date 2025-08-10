import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Hiányzó token' }, { status: 400 });

  const file = path.join(process.cwd(), 'public', 'links', `${token}.json`);
  try {
    const raw = await readFile(file, 'utf-8');
    const data = JSON.parse(raw);
    const updated = {
      ...data,
      used: true,
      revokedAt: new Date().toISOString(),
    };
    await writeFile(file, JSON.stringify(updated), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Nem található token' }, { status: 404 });
  }
}
