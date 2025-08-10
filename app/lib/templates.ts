// app/lib/templates.ts
export function draftEmailTemplate(params: {
  name?: any;
  linkUrl?: any;
  docTitle?: any;
  expiresAt?: any;
}) {
  const safeName = toStr(params.name).trim() || 'Ügyfelünk';
  const safeDoc = toStr(params.docTitle).trim() || 'Szerződéstervezet';
  const safeUrl = toStr(params.linkUrl).trim();
  const exp = toDate(params.expiresAt);

  const expHu = exp
    ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' }).format(exp)
    : null;

  return `<!doctype html>
<html lang="hu">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${escapeHtml(safeDoc)}</title>
    <style>
      body { margin:0; padding:0; background:#f6f7f9; }
      .container { width:100%; padding:24px 0; }
      .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; border:1px solid #e5e7eb; }
      .inner { padding:24px; font:14px/1.5 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color:#111827; }
      .btn { display:inline-block; background:#2563eb; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; }
      .muted { color:#6b7280; font-size:12px; }
      .hr { border:none; border-top:1px solid #e5e7eb; margin:20px 0; }
      .mb-8 { margin-bottom:8px; }
      .mb-16 { margin-bottom:16px; }
      .link { color:#2563eb; word-break:break-all; }
    </style>
  </head>
  <body>
    <div class="container">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="card">
        <tr>
          <td class="inner">
            <p class="mb-8">Tisztelt ${escapeHtml(safeName)}!</p>

            <p class="mb-16">
              Kérésének megfelelően a <strong>${escapeHtml(safeDoc)}</strong> elkészült. 
              Kérem, olvassa el az alábbi gombra kattintva. Elolvasás után jelölje be az 
              „Elolvastam a szerződést” négyzetet, majd kattintson a „Megerősítés” gombra.
            </p>

            ${
              safeUrl
                ? `<p class="mb-16">
                     <a class="btn" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
                       Megnyitás
                     </a>
                   </p>
                   <p class="muted mb-8">Ha nem működik a gomb, használja ezt a linket:</p>
                   <p><a class="link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
                     ${escapeHtml(safeUrl)}
                   </a></p>`
                : `<p style="color:#b91c1c"><strong>Hiba:</strong> A megnyitó link nem elérhető.</p>`
            }

            ${
              expHu
                ? `<hr class="hr" />
                   <p class="muted">A link érvényessége: ${escapeHtml(expHu)}</p>`
                : ''
            }

            <hr class="hr" />
            <p class="mb-8">Üdvözlettel:<br/>Keserű Imre, ügyvéd</p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

function toStr(v: any): string { try { return v == null ? '' : String(v); } catch { return ''; } }
function toDate(v: any): Date | null {
  try { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d : null; }
  catch { return null; }
}
function escapeHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
