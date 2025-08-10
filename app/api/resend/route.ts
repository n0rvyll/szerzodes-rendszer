// app/api/resend/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Request, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { sendEmail } from '../../lib/email';

function getBaseUrl(req: Request) {
  const envUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return new URL(req.url).origin.replace(/\/+$/, '');
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'token hiányzik' }, { status: 400 });

    const file = path.join(process.cwd(), 'public', 'links', `${token}.json`);
    const raw = await readFile(file, 'utf-8');
    const link = JSON.parse(raw) || {};

    const baseUrl = getBaseUrl(req);
    // Pótoljuk a hiányzó mezőket (régi rekordoknál előfordulhat)
    const name: string = link.name || 'Ügyfelünk';
    const contact = link.contact || {};
    let url: string = link.url || `${baseUrl}/r/${token}`;
    const docTitle: string = link.docTitle || 'Szerződéstervezet';

    // Ha nincs mentve az url a JSON-ban, mentsük vissza (hogy legközelebb már meglegyen)
    if (!link.url) {
      link.url = url;
      try {
        await writeFile(file, JSON.stringify(link, null, 2), 'utf-8');
      } catch {}
    }

    const to = contact.email;
    if (!to) return NextResponse.json({ error: 'Nincs e-mail cím a linkhez' }, { status: 400 });

    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(url);
    const safeTitle = escapeHtml(docTitle);

    const html = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
    <p>Tisztelt ${safeName}!</p>
    <p>${safeTitle} újraküldve. Kérem, olvassa el az alábbi gombra kattintva.</p>
    <p>
      <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600" target="_blank" rel="noopener noreferrer">
        Megnyitás
      </a>
    </p>
    <p style="color:#6b7280;font-size:12px;margin-top:16px">
      Ha nem működik a gomb, használja ezt a linket:<br/>
      <a href="${safeUrl}" style="color:#2563eb">${safeUrl}</a>
    </p>
    <p style="margin-top:16px">
      Elolvasás után jelölje be az „Elolvastam a szerződést” négyzetet, majd kattintson a „Megerősítés” gombra.
    </p>
    <p style="margin-top:16px">Üdvözlettel:<br/>Keserű Imre, ügyvéd</p>
  </body>
</html>`;

    // opcionális: debug mentés
    try {
      const debugDir = path.join(process.cwd(), 'public', 'debug');
      await writeFile(path.join(debugDir, `${Date.now()}_${token}_resend.html`), html, 'utf-8');
      console.log('[resend] saved debug email:', `/debug/${Date.now()}_${token}_resend.html`);
    } catch {}

    const messageId = await sendEmail({
      to,
      subject: 'Szerződéstervezet – újraküldés',
      html,
      text: `Tisztelt ${name}!\n\nA szerződéstervezet itt olvasható: ${url}\n\nÜdvözlettel:\nKeserű Imre, ügyvéd`,
    });

    return NextResponse.json({ ok: true, messageId });
  } catch (e: any) {
    console.error('[resend] hiba:', e);
    return NextResponse.json({ error: e?.message || 'Ismeretlen hiba' }, { status: 500 });
  }
}
