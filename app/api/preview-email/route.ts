// app/api/preview-email/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
// Relatív import, hogy ne legyen alias-gond
import { draftEmailTemplate } from '../../lib/templates';

export async function GET() {
  try {
    const html = draftEmailTemplate({
      name: 'Teszt Ügyfél',
      linkUrl: 'http://localhost:3000/r/teszt-token',
      docTitle: 'Szerződéstervezet',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    console.error('[preview-email] hiba:', e);
    return NextResponse.json(
      { error: e?.message || 'Sablon hiba' },
      { status: 500 }
    );
  }
}
