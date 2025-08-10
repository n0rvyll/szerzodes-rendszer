// app/api/send-draft/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// ⛔️ TÖRÖLJÜK a sablont – most direkt HTML-t küldünk
// import { draftEmailTemplate } from '../../lib/templates';
import { sendEmail } from '../../lib/email';
// import { sendSms } from '../../lib/sms';

type Recipient = { name: string; email?: string; phone?: string };

function getBaseUrl(req: Request) {
  const envUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return new URL(req.url).origin.replace(/\/+$/, '');
}

async function ensureDir(p: string) {
  try { await mkdir(p, { recursive: true }); } catch {}
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
    const body = await req.json();
    const documentId: string = String(body?.documentId || '');
    const recipients: Recipient[] = Array.isArray(body?.recipients) ? body.recipients : [];
    const hours = Number(process.env.LINK_EXPIRES_HOURS || 24);

    if (!documentId) {
      return NextResponse.json({ error: 'documentId hiányzik' }, { status: 400 });
    }

    const clean = recipients
      .map((r) => ({
        name: String(r?.name ?? '').trim(),
        email: (r?.email ?? '').trim() || undefined,
        phone: (r?.phone ?? '').trim() || undefined,
      }))
      .filter((r) => r.name && (r.email || r.phone));

    if (clean.length === 0) {
      return NextResponse.json({ error: 'Nincs érvényes címzett' }, { status: 400 });
    }

    // (opcionális) dokumentum cím meta beolvasása
    let docTitle: string | null = null;
    try {
      const mfPath = path.join(process.cwd(), 'uploads', 'manifest.json');
      const raw = await readFile(mfPath, 'utf-8');
      const manifest = JSON.parse(raw);
      const meta = Array.isArray(manifest)
        ? manifest.find((m: any) => m?.documentId === documentId)
        : manifest?.[documentId];
      docTitle = (meta?.title || meta?.name || null) ?? null;
    } catch {}

    const baseUrl = getBaseUrl(req);
    console.log('[send-draft] BASE_URL:', baseUrl);

    const linksDir = path.join(process.cwd(), 'public', 'links');
    const debugDir = path.join(process.cwd(), 'public', 'debug');
    await ensureDir(linksDir);
    await ensureDir(debugDir);

    const results: Array<{ name: string; url: string; emailId?: string; error?: string }> = [];

    for (const r of clean) {
      const token = randomUUID().replace(/-/g, '');
      const url = `${baseUrl}/r/${token}`;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      console.log('[send-draft] building link:', { name: r.name, url, documentId, token });

      // Link JSON mentése
      const item = {
        token,
        documentId,
        name: r.name,
        contact: { email: r.email || null, phone: r.phone || null },
        createdAt: new Date().toISOString(),
        expiresAt,
        acknowledged: false,
        docTitle,
        url,
        status: 'active',
      };
      await writeFile(path.join(linksDir, `${token}.json`), JSON.stringify(item, null, 2), 'utf-8');

      try {
        let emailId: string | undefined;

        if (r.email) {
          // ✅ Direkt HTML (gomb + sima link)
          const safeName = escapeHtml(r.name);
          const safeUrl = escapeHtml(url);
          const safeTitle = escapeHtml(docTitle || 'Szerződéstervezet');

          const html = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
    <p>Tisztelt ${safeName}!</p>
    <p>${safeTitle} elkészült. Kérem, olvassa el az alábbi gombra kattintva.</p>

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

          // debug mentés
          const debugName = `${Date.now()}_${token}.html`;
          await writeFile(path.join(debugDir, debugName), html, 'utf-8');
          console.log('[send-draft] saved debug email:', `/debug/${debugName}`);

          // küldés
          emailId = await sendEmail({
            to: r.email,
            subject: 'Szerződéstervezet megtekintése',
            html,
            text: [
              `Tisztelt ${r.name}!`,
              ``,
              `A szerződéstervezet az alábbi linken olvasható:`,
              url,
              ``,
              `Elolvasás után jelölje be az "Elolvastam a szerződést" négyzetet, majd kattintson a "Megerősítés" gombra.`,
              ``,
              `Üdvözlettel:`,
              `Keserű Imre, ügyvéd`,
            ].join('\n'),
          });
        }

        // SMS – csak ha be van kötve
        // if (r.phone) {
        //   await sendSms({ to: r.phone, message: `Szerződéstervezet: ${url}` });
        // }

        results.push({ name: r.name, url, emailId });
      } catch (e: any) {
        console.error('[send-draft] email küldési hiba:', e?.message);
        results.push({ name: r.name, url, error: e?.message || 'Küldési hiba' });
      }
    }

    console.log('[send-draft] results:', results);
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error('[send-draft] hiba:', e);
    return NextResponse.json({ error: e?.message || 'Ismeretlen hiba' }, { status: 500 });
  }
}
