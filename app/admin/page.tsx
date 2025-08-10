// app/admin/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Recipient = { name: string; email?: string; phone?: string };

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
  status: 'active' | 'acknowledged' | 'expired' | 'used' | 'revoked';
  fileName?: string | null; // <-- ÚJ
  docTitle?: string | null; // <-- Hozzáadva a hiba javításához
};

type PdfListItem = { documentId: string; fileName: string; title: string | null };

/** Magyar státusz feliratok (UI + CSV) */
const STATUS_LABELS: Record<string, string> = {
  all: 'Összes',
  active: 'Aktív',
  used: 'Megnyitott',
  acknowledged: 'Elolvasott',
  expired: 'Lejárt',
  revoked: 'Visszavont',
};

const normalizeStatus = (s?: string) => {
  const x = (s || '').toLowerCase();
  if (['aktív','aktiv','active'].includes(x)) return 'active';
  if (['elolvasott','acknowledged'].includes(x)) return 'acknowledged';
  if (['lejárt','lejart','expired'].includes(x)) return 'expired';
  if (['visszavont','revoked'].includes(x)) return 'revoked';
  if (['megnyitott','used'].includes(x)) return 'used';
  return 'active';
};

const useReportData = (
  links: any[],
  q: string,
  statusFilter: 'all'|'active'|'acknowledged'|'expired'|'revoked'|'used'
) => {
  const filtered = useMemo(() => {
    const needle = (q || '').toLowerCase();
    return (links || []).filter((l) => {
      const matchesQ =
        !needle ||
        (l.name || '').toLowerCase().includes(needle) ||
        (l.documentId || '').toLowerCase().includes(needle) ||
        (l.fileName || '').toLowerCase().includes(needle) ||
        (l.contact?.email || '').toLowerCase().includes(needle) ||
        (l.contact?.phone || '').toLowerCase().includes(needle) ||
        (l.token || '').toLowerCase().includes(needle);

      const norm = normalizeStatus(l.status);
      const matchesStatus = statusFilter === 'all' ? true : norm === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [links, q, statusFilter]);

  const counts = useMemo(() => {
    const base = { active: 0, used: 0, acknowledged: 0, expired: 0, revoked: 0 };
    for (const l of links || []) {
      const norm = normalizeStatus(l.status);
      if (norm in base) (base as any)[norm] += 1;
      if (l.used && norm !== 'used') base.used += 1; // régi rekord kompat.
    }
    return base;
  }, [links]);

  return { filtered, counts };
};

/** Hydration-safe dátum kiírás */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
const huFormatter = new Intl.DateTimeFormat('hu-HU', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Budapest',
});
function DateCell({ value }: { value?: string | null }) {
  const mounted = useMounted();
  if (!mounted) return <span suppressHydrationWarning> </span>;
  if (!value) return <span>-</span>;
  try {
    return <span suppressHydrationWarning>{huFormatter.format(new Date(value))}</span>;
  } catch {
    return <span>-</span>;
  }
}

/* --- Státusz jelvény --- */
function StatusBadge({ status }: { status: LinkRow['status'] | string }) {
  const map: Record<string, string> = {
    acknowledged: 'bg-green-100 text-green-700',
    expired: 'bg-yellow-100 text-yellow-700',
    revoked: 'bg-red-100 text-red-700',
    used: 'bg-slate-200 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
  };
  const label = STATUS_LABELS[status] || String(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] || 'bg-slate-100 text-slate-700'
      }`}
      title={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
      {label}
    </span>
  );
}

export default function AdminPage() {
  // Feltöltött PDF-ek listája (manifestből): documentId, fileName, title
  const [pdfList, setPdfList] = useState<PdfListItem[]>([]);
  const [selectedPdf, setSelectedPdf] = useState(''); // itt a fileName legyen (pl. 1723...pdf)
  const [uploadTitle, setUploadTitle] = useState(''); // feltöltéskor megadható szép név

  const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', email: '' }]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<
    { name: string; url: string; emailId?: string; smsId?: string; error?: string }[] | null
  >(null);

  // Link érvényességi idő (órában) – küldéskor elküldjük a backendnek
  const [expiresHours, setExpiresHours] = useState<number>(24);

  // Riport állapot
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'acknowledged' | 'expired' | 'revoked' | 'used'
  >('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // --- Helpers
  const loadPdfs = async () => {
    const res = await fetch('/api/list-pdfs', { cache: 'no-store' });
    const data = await res.json();
    setPdfList(data.items || []);
  };
  const loadLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch('/api/links', { cache: 'no-store' });
      const data = await res.json();
      setLinks(data.items || []);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, []);
  useEffect(() => {
    loadLinks();
  }, []);

  // --- Feltöltés (privát /uploads + title mentése manifestbe)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Csak PDF tölthető fel.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    if (uploadTitle.trim()) {
      fd.append('title', uploadTitle.trim());
    }

    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Feltöltési hiba');
      const data = await res.json();
      await loadPdfs();

      // állítsuk be kiválasztottnak az új fájlt
      const newFileName = `${data.documentId}.pdf`;
      setSelectedPdf(newFileName);
      setUploadTitle('');
    } catch {
      alert('Nem sikerült feltölteni.');
    } finally {
      setUploading(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  // --- Címzettek
  const updateRecipient = (idx: number, field: keyof Recipient, value: string) => {
    setRecipients((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };
  const addRow = () => setRecipients((p) => [...p, { name: '', email: '' }]);
  const removeRow = (idx: number) => setRecipients((p) => p.filter((_, i) => i !== idx));

  // --- Küldés
  const handleSend = async () => {
    if (!selectedPdf) return alert('Válassz PDF-et!');
    const clean = recipients
      .map((r) => ({ name: r.name.trim(), email: r.email?.trim(), phone: r.phone?.trim() }))
      .filter((r) => r.name && (r.email || r.phone));

    if (clean.length === 0) return alert('Adj meg legalább egy érvényes címzettet (név + email/telefon).');
    

    setSending(true);
    setResults(null);
    try {
      // a documentId a fileName-ból jön (1723....pdf -> 1723...)
      const documentId = selectedPdf.replace(/\.pdf$/i, '');

      const res = await fetch('/api/send-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          recipients: clean,
          expiresHours: Number.isFinite(expiresHours) && expiresHours > 0 ? expiresHours : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Hiba a küldésnél');
      setResults(data.results || []);
      await loadLinks();
    } catch (e: any) {
      alert(e?.message || 'Nem sikerült linket generálni/küldeni.');
    } finally {
      setSending(false);
    }
  };

  // --- Riport szűrés
  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return links.filter((l) => {
      const matchesQ =
        !needle ||
        l.name?.toLowerCase().includes(needle) ||
        l.documentId?.toLowerCase().includes(needle) ||
        l.contact?.email?.toLowerCase().includes(needle) ||
        l.contact?.phone?.toLowerCase().includes(needle) ||
        l.token.includes(needle) ||
        (l.docTitle && l.docTitle.toLowerCase().includes(needle)) ||
        (() => {
          const meta = pdfList.find((p) => p.documentId === l.documentId);
          return !!(meta?.title && meta.title.toLowerCase().includes(needle));
        })();

      const matchesStatus = statusFilter === 'all' ? true : l.status === statusFilter;

      return matchesQ && matchesStatus;
    });
  }, [links, q, statusFilter, pdfList]);

// --- Státusz számlálók
  const counts = useMemo(() => {
    return {
      active: links.filter((l) => l.status === 'active').length,
      acknowledged: links.filter((l) => l.status === 'acknowledged').length,
      expired: links.filter((l) => l.status === 'expired').length,
      revoked: links.filter((l) => l.status === 'revoked').length,
      used: links.filter((l) => l.status === 'used').length,
    };
  }, [links]);

  // --- CSV export (UTF-8 BOM + magyar státusz + biztonságos idézőjelezés)
  const exportCsv = () => {
    try {
      const header = [
        'name',
        'email',
        'phone',
        'documentLabel', // címke (title vagy fileName)
        'documentId',
        'token',
        'url',
        'status',
        'createdAt',
        'expiresAt',
        'acknowledged',
        'acknowledgedAt',
        'revokedAt',
      ];

      const rows = filtered.map((l) => {
        const meta = pdfList.find((p) => p.documentId === l.documentId);
        const docLabel = l.docTitle || meta?.title || meta?.fileName || l.documentId;

        return [
          wrap(l.name),
          wrap(l.contact?.email || ''),
          wrap(l.contact?.phone || ''),
          wrap(docLabel),
          wrap(l.documentId),
          wrap(l.token),
          wrap(l.url),
          wrap(STATUS_LABELS[l.status] || l.status),
          wrap(l.createdAt),
          wrap(l.expiresAt),
          wrap(String(l.acknowledged)),
          wrap(l.acknowledgedAt || ''),
          wrap(l.revokedAt || ''),
        ];
      });

      const csv = [header, ...rows].map((r) => r.join(',')).join('\n');

      // UTF-8 BOM, hogy Excel jól kezelje az ékezeteket
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `links_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      function wrap(v: string) {
        const needsQuote = /[",\n\r]/.test(v ?? '');
        const s = (v ?? '').replace(/"/g, '""');
        return needsQuote ? `"${s}"` : s;
      }
    } catch (e) {
      console.error('CSV export hiba:', e);
      alert('Nem sikerült a CSV export.');
    }
  };

  // --- Riport műveletek
  const revoke = async (token: string) => {
    if (!confirm('Biztosan visszavonod ezt a linket?')) return;
    const res = await fetch('/api/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) await loadLinks();
    else alert('Nem sikerült visszavonni.');
  };

  const resend = async (token: string) => {
    const res = await fetch('/api/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) alert('Elküldve.');
    else {
      const e = await res.json().catch(() => ({}));
      alert(`Nem sikerült újraküldeni. ${e?.error || ''}`);
    }
  };

  const remove = async (token: string, documentId: string) => {
    if (!confirm('Biztosan törlöd ezt a linket és a hozzá tartozó PDF-et?')) return;
    const res = await fetch('/api/delete-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, documentId }),
    });
    if (res.ok) {
      alert('Törölve.');
      await loadLinks();
      await loadPdfs();
      setSelectedPdf((prev) => (prev === `${documentId}.pdf` ? '' : prev));
    } else {
      const e = await res.json().catch(() => ({}));
      alert(`Nem sikerült törölni. ${e?.error || ''}`);
    }
  };

  const deletePdf = async () => {
    if (!selectedPdf) return;
    if (!confirm('Biztosan törlöd ezt a PDF-et?')) return;
    const documentId = selectedPdf.replace(/\.pdf$/i, '');
    const res = await fetch('/api/delete-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });
    if (res.ok) {
      alert('PDF törölve.');
      setSelectedPdf('');
      await loadPdfs();
      await loadLinks();
    } else {
      const e = await res.json().catch(() => ({}));
      alert(`Nem sikerült törölni. ${e?.error || ''}`);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Meghívjuk a handleUpload-ot, mintha inputból jött volna:
      handleUpload({ target: { files: [file] } } as any);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Oldalcím + infó */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Okiratok megküldése ügyfelek részére</h1>
            <p className="text-sm text-slate-500">Az elkészített szerződés tervezett lehet elküldeni az ügyfelek részére, és nyomonkövethető ha azt megnyitották, elolvasták stb.</p>
          </div>
        </div>

        {/* Feltöltés + PDF választás */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section
  className={`bg-white border rounded-2xl shadow-sm p-5 space-y-3 relative transition ${dragActive ? 'ring-2 ring-blue-400' : ''}`}
  onDragEnter={handleDrag}
  onDragOver={handleDrag}
  onDragLeave={handleDrag}
  onDrop={handleDrop}
>
  <h2 className="text-base font-semibold">PDF feltöltése</h2>

  <input
    type="text"
    className="border rounded-lg px-3 py-2 w-full"
    placeholder="Dokumentum megjelenítési neve..."
    value={uploadTitle}
    onChange={(e) => setUploadTitle(e.target.value)}
  />

  {/* Rejtett input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="application/pdf"
    onChange={handleUpload}
    disabled={uploading}
    className="hidden"
  />
  {/* Saját gomb */}
  <button
    type="button"
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
    onClick={() => fileInputRef.current?.click()}
    disabled={uploading}
  >
    Fájl kiválasztása
  </button>
  <div className="text-xs text-slate-500 mt-2">
    vagy húzd ide a PDF-et a feltöltéshez
  </div>
  {uploading && <p className="text-sm text-slate-500">Feltöltés…</p>}
  <p className="text-xs text-slate-500">
    A feltöltött fájl a privát <code>/uploads</code> mappába kerül (nem publikus).
  </p>
  {dragActive && (
    <div className="absolute inset-0 bg-blue-100/60 border-2 border-blue-400 rounded-2xl flex items-center justify-center pointer-events-none z-10 text-blue-700 text-lg font-semibold">
      Dobd ide a PDF-et!
    </div>
  )}
</section>

          <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="text-base font-semibold">PDF kiválasztása</h2>
            <select
              className="border px-3 py-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              value={selectedPdf}
              onChange={(e) => setSelectedPdf(e.target.value)}
            >
              <option value="">-- Válassz --</option>
              {pdfList.map((f) => (
                <option key={f.documentId} value={f.fileName}>
                  {f.title ? `${f.title} (${f.fileName})` : f.fileName}
                </option>
              ))}
            </select>
            {selectedPdf && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                Kiválasztva: <span className="font-mono">{selectedPdf}</span>
                <button
                  onClick={deletePdf}
                  className="ml-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition"
                >
                  Törlés
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Címzettek kártya */}
        <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-4" id="send">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Címzettek</h2>
            <button type="button" onClick={addRow} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md">
              + Sor hozzáadása
            </button>
          </div>

          <div className="space-y-3">
            {recipients.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                <input
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 md:col-span-3"
                  placeholder="Név"
                  value={r.name}
                  onChange={(e) => updateRecipient(idx, 'name', e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 md:col-span-3"
                  placeholder="E-mail (kötelező)"
                  value={r.email || ''}
                  onChange={(e) => updateRecipient(idx, 'email', e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 md:col-span-2"
                  placeholder="Telefon (nem kötelező)"
                  value={r.phone || ''}
                  onChange={(e) => updateRecipient(idx, 'phone', e.target.value)}
                />
                <div className="md:col-span-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Sor törlése
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Küldés kártya */}
        <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Érvényesség (óra):</label>
              <input
                type="number"
                min={1}
                className="w-28 border rounded px-2 py-1"
                value={expiresHours}
                onChange={(e) => setExpiresHours(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={!selectedPdf || sending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50"
            >
              {sending ? 'Küldés folyamatban…' : 'Linkek generálása és küldése'}
            </button>
            {!selectedPdf && <span className="text-sm text-slate-500">Válassz egy PDF-et a küldéshez.</span>}
          </div>

          {results && results.length > 0 && (
            <div className="mt-3 space-y-2">
              <h3 className="font-medium">Kiküldés eredménye</h3>
              <ul className="space-y-1">
                {results.map((r, i) => (
                  <li key={i} className="bg-slate-50 border rounded-lg px-3 py-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <div className="font-medium">{r.name}</div>
                      <a className="text-blue-600 hover:underline break-all" href={r.url} target="_blank" rel="noreferrer">
                        {r.url}
                      </a>
                    </div>
                    {r.error ? (
                      <div className="text-red-600 text-sm mt-1">Hiba: {r.error}</div>
                    ) : (
                      <div className="text-slate-500 text-xs mt-1">
                        {r.emailId && <>Email ID: {r.emailId} </>}
                        {r.smsId && <>| SMS ID: {r.smsId}</>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* --- Riport kártya (MODERN) --- */}
        <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-5" id="report">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <h2 className="text-base font-semibold">Riport</h2>

            {/* Összesítő kártyák */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full md:ml-4">
  {/* Aktív */}
  <div className="rounded-2xl border bg-blue-50 px-4 py-4 text-center">
    <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
      {/* document icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4M5 20h14a2 2 0 0 0 2-2V7.83a2 2 0 0 0-.59-1.41L16.58 2.59A2 2 0 0 0 15.17 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"/>
      </svg>
    </div>
    <div className="text-xs font-medium text-blue-700">Aktív</div>
    <div className="mt-1 text-2xl font-semibold text-blue-900">{counts.active}</div>
  </div>

  {/* Elolvasott */}
  <div className="rounded-2xl border bg-green-50 px-4 py-4 text-center">
    <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
      {/* check-circle icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </div>
    <div className="text-xs font-medium text-green-700">Elolvasott</div>
    <div className="mt-1 text-2xl font-semibold text-green-900">{counts.acknowledged}</div>
  </div>

  {/* Lejárt */}
  <div className="rounded-2xl border bg-amber-50 px-4 py-4 text-center">
    <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
      {/* clock icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
      </svg>
    </div>
    <div className="text-xs font-medium text-amber-700">Lejárt</div>
    <div className="mt-1 text-2xl font-semibold text-amber-900">{counts.expired}</div>
  </div>

  {/* Visszavont */}
  <div className="rounded-2xl border bg-red-50 px-4 py-4 text-center">
    <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
      {/* x-circle icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 9-6 6m0-6 6 6" />
      </svg>
    </div>
    <div className="text-xs font-medium text-red-700">Visszavont</div>
    <div className="mt-1 text-2xl font-semibold text-red-900">{counts.revoked}</div>
  </div>

  {/* Megnyitott (használt) */}
  <div className="rounded-2xl border bg-slate-50 px-4 py-4 text-center">
    <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700">
      {/* eye icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
    <div className="text-xs font-medium text-slate-700">Megnyitott</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{counts.used}</div>
  </div>
</div>

            {/* Jobb oldali akciók */}
            <div className="md:ml-auto flex flex-wrap items-center gap-2">
              {(['all', 'active', 'acknowledged', 'expired', 'revoked', 'used'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              <input
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Keresés"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button onClick={loadLinks} className="text-sm bg-white border px-3 py-1.5 rounded-md hover:bg-slate-50">
                Frissítés
              </button>
              <button onClick={exportCsv} className="text-sm bg-white border px-3 py-1.5 rounded-md hover:bg-slate-50">
                CSV export
              </button>
            </div>
          </div>

          {loadingLinks ? (
            <div className="text-slate-600">Betöltés…</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-500">Nincs találat.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l) => {
                const meta = pdfList.find((p) => p.documentId === l.documentId);
                const docLabel = l.docTitle || meta?.title || meta?.fileName || l.documentId;

                return (
                  <div key={l.token} className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{l.name || 'Névtelen'}</div>
                        <div className="text-xs text-slate-500 break-all">{docLabel}</div>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">E-mail</span>
    <span className="break-all">{l.contact?.email || '-'}</span>
  </div>
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Telefon</span>
    <span className="break-all">{l.contact?.phone || '-'}</span>
  </div>
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Doksi ID</span>
    <span className="break-all font-mono">{l.documentId}</span>
  </div>

  {/* <-- ÚJ SOR: Fájlnév */}
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Fájlnév</span>
    <span className="break-all">{l.fileName || '-'}</span>
  </div>

  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Link</span>
    <a className="break-all text-blue-600 hover:underline" href={l.url} target="_blank" rel="noreferrer">
      megnyitás
    </a>
  </div>
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Létrejött</span>
    <span>{new Date(l.createdAt).toLocaleString()}</span>
  </div>
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 text-slate-500">Lejár</span>
    <span>{new Date(l.expiresAt).toLocaleString()}</span>
  </div>
  {l.acknowledgedAt && (
    <div className="flex items-start gap-2">
      <span className="w-20 shrink-0 text-slate-500">Elolvasva</span>
      <span>{new Date(l.acknowledgedAt).toLocaleString()}</span>
    </div>
  )}
</div>                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => resend(l.token)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md disabled:opacity-50 transition"
                        disabled={!l.contact?.email || l.status === 'revoked'}
                      >
                        Újraküldés
                      </button>
                      <button
                        onClick={() => revoke(l.token)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md disabled:opacity-50 transition"
                        disabled={l.status === 'revoked'}
                      >
                        Visszavonás
                      </button>
                      <button
                        onClick={() => remove(l.token, l.documentId)}
                        className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2.5 py-1.5 rounded-md transition"
                      >
                        Törlés
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}