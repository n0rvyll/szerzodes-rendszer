'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600 text-white grid place-items-center text-sm font-bold">
              ST
            </div>
            <span className="font-semibold">Admin felület</span>
          </Link>

          <nav className="ml-6 hidden md:flex items-center gap-4 text-sm text-slate-600">
            <Link href="/admin" className="hover:text-slate-900">Küldés</Link>
          </nav>

          <div className="ml-auto">
            <button
              onClick={async () => {
                await fetch('/api/logout', { method: 'POST' });
                location.href = '/login';
              }}
              className="text-sm bg-white border hover:bg-slate-50 px-3 py-1.5 rounded-md transition"
            >
              Kijelentkezés
            </button>
          </div>
        </div>
      </header>

      {/* Tartalom */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
