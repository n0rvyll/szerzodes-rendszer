'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// dinamikus import SSR nélkül
const PdfReader = dynamic(() => import('../../../components/PdfReader'), { ssr: false });

type LinkData = {
  documentId: string;
  name: string;
  docTitle?: string | null;
  expiresAt: string;
  acknowledged: boolean;
};

export default function ReadPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/link/${token}`, { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Hiba a link lekérésénél');
        }
        const j = await res.json();
        if (alive) setData(j);
      } catch (e: any) {
        setError(e?.message || 'Hiba történt.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (loading) return <div className="p-6">Betöltés…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Nincs adat.</div>;

  const pdfUrl = `/api/files/${encodeURIComponent(data.documentId)}`;

  return (
    <div className="min-h-screen flex flex-col items-center text-center p-4 space-y-4">
      <h1 className="text-xl font-bold">
        {data.docTitle || 'Szerződéstervezet'} — {data.name}
      </h1>

      <div className="w-full md:w-3/4 h-[75vh] border rounded">
        <PdfReader url={pdfUrl} />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>Elolvastam a szerződést</span>
      </label>

      <button
        onClick={async () => {
          if (!checked) return alert('Kérjük, jelölje be, hogy elolvasta a szerződést!');
          setSubmitting(true);
          try {
            const res = await fetch('/api/ack', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, acknowledged: true }),
            });
            if (!res.ok) throw new Error('Nem sikerült menteni.');
            // siker esetén átirányítás
            window.location.href = '/koszonjuk';
          } catch (e: any) {
            alert(e?.message || 'Nem sikerült menteni a visszajelzést.');
          } finally {
            setSubmitting(false);
          }
        }}
        disabled={!checked || submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? 'Mentés…' : 'Megerősítés'}
      </button>
    </div>
  );
}
