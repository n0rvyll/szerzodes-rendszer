'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Opcionális: kerüli a statikus prerenderelést
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Betöltés…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Belépési hiba');
      router.push(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur border shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white grid place-items-center text-lg font-bold">
              ST
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Admin belépés</h1>
              <p className="text-sm text-slate-500">Szerződés Tablet Rendszer</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Felhasználónév</label>
              <input
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="FELHASZNÁLÓI NÉV"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Jelszó</label>
              <div className="relative">
                <input
                  className="w-full rounded-lg border px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs"
                >
                  {showPw ? 'Elrejt' : 'Mutat'}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg px-4 py-2.5 font-medium transition disabled:opacity-50"
            >
              {loading ? 'Belépés…' : 'Belépés'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Védett felület – csak jogosult felhasználóknak
          </div>
        </div>
      </div>
    </div>
  );
}
