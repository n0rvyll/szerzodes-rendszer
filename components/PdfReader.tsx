'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

type Props = {
  url: string;
  initialScale?: number;
};

export default function PdfReader({ url, initialScale = 1.2 }: Props) {
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPdfDoc(null);

    const ensurePdfJs = () =>
      new Promise<any>((resolve, reject) => {
        if (window.pdfjsLib) return resolve(window.pdfjsLib);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.async = true;
        script.onload = () => resolve(window.pdfjsLib);
        script.onerror = () => reject(new Error('PDF.js betöltése sikertelen'));
        document.head.appendChild(script);
      });

    (async () => {
      try {
        const lib = await ensurePdfJs();
        if (cancelled) return;

        lib.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

        setPdfjs(lib);

        const task = lib.getDocument(url);
        const doc = await task.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages ?? 0);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Nem sikerült betölteni a PDF-et.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const zoomOut = () => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))));
  const zoomIn = () => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))));
  const reset = () => setScale(initialScale);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-center gap-2">
        <button onClick={zoomOut} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">–</button>
        <span className="w-14 text-center text-sm">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">+</button>
        <button onClick={reset} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">Alap</button>
      </div>

      {loading && <div className="p-4 text-slate-600 text-center">Betöltés…</div>}
      {err && <div className="p-4 text-red-600 text-center">{err}</div>}

      {pdfDoc && (
        <div className="space-y-6">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
            <PdfPage key={pageNumber} pdf={pdfDoc} pageNumber={pageNumber} scale={scale} />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPage({
  pdf, pageNumber, scale,
}: {
  pdf: any;
  pageNumber: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    (async () => {
      const page = await pdf.getPage(pageNumber);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch {
        // cancel -> ignore
      } finally {
        if (!cancelled && renderTaskRef.current === task) {
          renderTaskRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div className="w-full overflow-auto">
      <canvas ref={canvasRef} className="mx-auto shadow rounded" />
      <div className="mt-1 text-center text-xs text-slate-500">Oldal {pageNumber}</div>
    </div>
  );
}