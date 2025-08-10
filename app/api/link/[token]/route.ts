// app/api/link/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, context: { params: Promise<{ token: string }> }) {
  // A Next 15 miatt a params Promise – ki kell awaitolni
  const { token } = await context.params;

  const dir = path.join(process.cwd(), 'public', 'links');
  const file = path.join(dir, `${token}.json`);

  try {
    const raw = await readFile(file, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      token,
      documentId: data.documentId,
      name: data.name || '',
      expiresAt: data.expiresAt,
      acknowledged: !!data.acknowledged,
      docTitle: data.docTitle || null,
      url: data.url || null,
      status: data.status || 'active',
      contact: data.contact || null,
    });
  } catch {
    // Diagnosztika: listázzuk ki, milyen token fájlok vannak
    try {
      const files = await readdir(dir);
      return NextResponse.json(
        {
          error: 'Link nem található',
          tried: file,
          existing: files.filter((f) => f.toLowerCase().endsWith('.json')),
        },
        { status: 404 }
      );
    } catch {
      return NextResponse.json(
        { error: 'Link nem található, és a links mappa sem elérhető', tried: file },
        { status: 404 }
      );
    }
  }
}
