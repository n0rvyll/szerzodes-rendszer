'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import dynamic from 'next/dynamic';
const PdfReader = dynamic(() => import('@/components/PdfReader'), { ssr: false });

type LinkData = {
  documentId: string;
  name: string;
  expiresAt: string;
  acknowledged: boolean;
};

export default function ReadPage() {
  const { token } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LinkData | null>(null);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);


useEffect(() => {
  if (!data || !token) return;
  // jelöljük meg "megnyitottnak"
  fetch('/api/mark-used', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}, [data, token]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/link/${token}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((res) => {
        if (res?.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError('Hiba történt.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!checked) {
      alert('Kérjük, jelölje be, hogy elolvasta a szerződést!');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, acknowledged: true }),
      });
      if (!res.ok) throw new Error();
      router.push('/koszonjuk');
    } catch {
      alert('Nem sikerült menteni a visszajelzést.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Betöltés…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Nincs adat.</div>;

  const fileUrl = `/api/files/${data.documentId}?token=${token}`;

  return (
    <div className="min-h-screen flex flex-col items-center text-center p-4">
      <h1 className="text-2xl font-bold mb-4">📄 {data.name} – Szerződéstervezet</h1>

      {/* PDF.js alapú, mobilbarát néző */}
      <div className="w-full md:w-3/4">
        <PdfReader url={fileUrl} />
      </div>

      <label className="flex items-center gap-2 my-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>Elolvastam a szerződést</span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!checked || submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? 'Mentés…' : 'Megerősítés'}
      </button>
    </div>
  );}