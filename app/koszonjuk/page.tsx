// app/koszonjuk/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function KoszonjukPage() {
  const [left, setLeft] = useState(10);

  useEffect(() => {
    // másodpercenként csökkentjük
    const interval = setInterval(() => {
      setLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (left === 0) {
      // próbáljuk bezárni az ablakot; ha nem lehet, irány a főoldal
      window.close();
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = '/';
        }
      }, 200);
    }
  }, [left]);

  const percent = (1 - left / 10) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border shadow-sm p-8 w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Köszönjük a visszajelzést!</h1>
        <p className="text-slate-600">
          Az ablak <span className="font-medium">{left}</span> másodperc múlva bezárul.
        </p>

        {/* Progress bar (opcionális, de jól néz ki) */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${percent}%` }}
            aria-hidden
          />
        </div>

        <button
          onClick={() => {
            // manuális bezárás / kilépés
            window.close();
            setTimeout(() => {
              if (!document.hidden) window.location.href = '/';
            }, 200);
          }}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Bezárás most
        </button>

        <p className="text-xs text-slate-500">
          Ha az ablak nem zárható automatikusan, visszairányítjuk a főoldalra.
        </p>
      </div>
    </div>
  );
}