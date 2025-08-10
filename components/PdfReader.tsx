// components/PdfReader.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type Props = {
  url: string;           // pl. /uploads/valami.pdf
  initialScale?: number; // kezdő nagyítás
};

export default function PdfReader({ url, initialScale = 1.2 }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPdf(null);
    (async () => {
      try {
        const task = getDocument(url);
        const doc = await task.promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch {
        if (!cancelled) setErr('Nem sikerült betölteni a PDF-et.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const zoomOut = () => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))));
  const zoomIn  = () => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))));
  const reset   = () => setScale(initialScale);

  return (
    <div className="w-full">
      {/* TOOLBAR — KÖZÉPRE IGAZÍTVA */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <button onClick={zoomOut} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">–</button>
        <span className="w-14 text-center text-sm">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">+</button>
        <button onClick={reset} className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50">Alap</button>
      </div>

      {loading && <div className="p-4 text-slate-600 text-center">Betöltés…</div>}
      {err && <div className="p-4 text-red-600 text-center">{err}</div>}

      {/* MINDEN oldal ugyanazzal a 'scale'-lel renderelődik */}
      {pdf && (
        <div className="space-y-6">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
            <PdfPage key={pageNumber} pdf={pdf} pageNumber={pageNumber} scale={scale} />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPage({
  pdf, pageNumber, scale,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    let cancelled = false;

    // állítsuk le az esetleg futó renderelést
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
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
        // cancel -> ne dobjuk tovább
      } finally {
        if (!cancelled && renderTaskRef.current === task) {
          renderTaskRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
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
