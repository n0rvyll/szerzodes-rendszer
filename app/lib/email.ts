// app/lib/email.ts
import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  html?: string | Buffer | null;
  text?: string;
};

function firstHref(html?: string | Buffer | null): string | undefined {
  if (!html) return undefined;
  const s = typeof html === 'string' ? html : html.toString('utf-8');

  // Fogadja a szimpla VAGY dupla idézőjelet is
  const m = s.match(/href=['"]([^'"]+)['"]/i);
  return m?.[1];
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<string> {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || `no-reply@localhost`;

  if (!host || !user || !pass) {
    throw new Error('SMTP beállítás hiányzik (SMTP_HOST/SMTP_USER/SMTP_PASS)');
  }

  // Transport
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL
    auth: { user, pass },
  });

  // LOG – itt látni fogod, mi megy ki
  const htmlStr = typeof html === 'string' ? html : (html ? html.toString('utf-8') : '');
  const first = firstHref(htmlStr);

  console.log('[sendEmail] to:', to);
  console.log('[sendEmail] subject:', subject);
  console.log('[sendEmail] html length:', htmlStr?.length || 0);
  console.log('[sendEmail] text length:', text?.length || 0);
  console.log('[sendEmail] first href (any quotes):', first);

  // Biztonsági fallback: ha nincs html, küldjünk szöveget
  const mailOptions = {
    from,
    to,
    subject,
    text: text || (htmlStr ? htmlStr.replace(/<[^>]+>/g, '') : '(nincs tartalom)'),
    html: htmlStr || undefined,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log('[sendEmail] messageId:', info.messageId);
  return info.messageId || '';
}
