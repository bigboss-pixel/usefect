"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import SiteHeader from "../../../../components/SiteHeader";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type EBook = {
  id: number;
  title: string;
  author: string;
  publisher: string | null;
  publicationYear: number | null;
  category: string | null;
  language: string;
  fileUrl: string | null;
  fileType: string | null;
  accessType: string;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => {
    promise: Promise<void>;
  };
};

type PdfViewport = {
  width: number;
  height: number;
};

export default function EBookReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<PdfDocument | null>(null);
  const renderTaskRef = useRef<{
    promise: Promise<void>;
    cancel?: () => void;
  } | null>(null);

  const [ebook, setEbook] = useState<EBook | null>(null);
  const [ebookId, setEbookId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadEbook() {
      try {
        const { id } = await params;

        if (cancelled) return;

        setEbookId(id);

        const response = await fetch(`${API_URL}/ebooks/${id}`);

        if (!response.ok) {
          throw new Error("E-Book tidak ditemukan");
        }

        const data: EBook = await response.json();

        if (!cancelled) {
          setEbook(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat E-Book",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEbook();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!ebookId) return;

    const savedPage = window.localStorage.getItem(
      `usefect-ebook-progress-${ebookId}`,
    );

    if (savedPage) {
      const page = Number.parseInt(savedPage, 10);

      if (Number.isFinite(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, [ebookId]);

  useEffect(() => {
    if (!ebookId || totalPages <= 0) return;

    const safePage = Math.min(
      Math.max(currentPage, 1),
      totalPages,
    );

    window.localStorage.setItem(
      `usefect-ebook-progress-${ebookId}`,
      String(safePage),
    );
  }, [ebookId, currentPage, totalPages]);

  useEffect(() => {
    const currentEbook = ebook;

    if (!currentEbook?.fileUrl) return;

    const isPdf =
      currentEbook.fileType?.toUpperCase() === "PDF" ||
      currentEbook.fileUrl.toLowerCase().includes(".pdf");

    if (!isPdf) return;

    let cancelled = false;

    async function loadPdf() {
      setPdfLoading(true);
      setPdfError("");

      try {
        const pdfjsLib = await import("pdfjs-dist");

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "/pdf.worker.min.mjs";

        const rawFileUrl = currentEbook?.fileUrl;
        if (!rawFileUrl) {
          throw new Error("File PDF tidak tersedia.");
        }

        const fileUrl =
          rawFileUrl.startsWith("http://127.0.0.1:3000/")
            ? rawFileUrl.replace("http://127.0.0.1:3000", "")
            : rawFileUrl;

        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
        });

        const pdf = await loadingTask.promise;

        if (cancelled) {
          return;
        }

        pdfRef.current = pdf as unknown as PdfDocument;
        setTotalPages(pdf.numPages);

        const savedPage = ebookId
          ? window.localStorage.getItem(
              `usefect-ebook-progress-${ebookId}`,
            )
          : null;

        const savedPageNumber = savedPage
          ? Number.parseInt(savedPage, 10)
          : 1;

        const initialPage =
          Number.isFinite(savedPageNumber) &&
          savedPageNumber >= 1 &&
          savedPageNumber <= pdf.numPages
            ? savedPageNumber
            : 1;

        setCurrentPage(initialPage);
      } catch (err) {
        if (!cancelled) {
          setPdfError(
            err instanceof Error
              ? err.message
              : "Gagal memuat PDF",
          );
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      pdfRef.current = null;
    };
  }, [ebook, ebookId]);

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || !totalPages) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      const pdf = pdfRef.current;

      if (!pdf) return;

      setPdfLoading(true);
      setPdfError("");

      try {
        renderTaskRef.current?.cancel?.();

        const pageNumber = Math.min(
          Math.max(currentPage, 1),
          pdf.numPages,
        );

        const page = await pdf.getPage(pageNumber);

        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({
          scale: zoom,
        });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas PDF tidak tersedia");
        }

        const devicePixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(
          viewport.width * devicePixelRatio,
        );
        canvas.height = Math.floor(
          viewport.height * devicePixelRatio,
        );

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(
          devicePixelRatio,
          0,
          0,
          devicePixelRatio,
          0,
          0,
        );

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!cancelled) {
          setPdfLoading(false);
        }
      } catch (err) {
        if (
          !cancelled &&
          !(err instanceof Error && err.name === "RenderingCancelledException")
        ) {
          setPdfError(
            err instanceof Error
              ? err.message
              : "Gagal merender halaman PDF",
          );
          setPdfLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [currentPage, totalPages, zoom]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="ebook-reader-page">
          <div className="ebook-reader-loading">
            <Loader2 size={24} className="ebook-reader-spinner" />
            <span>Memuat E-Book...</span>
          </div>
        </main>
      </>
    );
  }

  if (error || !ebook) {
    return (
      <>
        <SiteHeader />
        <main className="ebook-reader-page">
          <div className="ebook-reader-error">
            <FileText size={42} />
            <h1>E-Book tidak dapat dibuka</h1>
            <p>{error || "Data E-Book tidak tersedia."}</p>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="ebook-reader-back"
            >
              <ArrowLeft size={17} />
              Kembali
            </button>
          </div>
        </main>
      </>
    );
  }

  const canDownload =
    ebook.accessType === "DOWNLOAD" ||
    ebook.accessType === "READ_AND_DOWNLOAD";

  const isPdf =
    ebook.fileType?.toUpperCase() === "PDF" ||
    ebook.fileUrl?.toLowerCase().includes(".pdf");

  const progress =
    totalPages > 0
      ? Math.round((currentPage / totalPages) * 100)
      : 0;

  return (
    <>
      <SiteHeader />

      <main className="ebook-reader-page">
        <section className="ebook-reader-header">
          <div className="ebook-reader-heading">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="ebook-reader-back"
            >
              <ArrowLeft size={17} />
              Kembali
            </button>

            <div>
              <p className="ebook-reader-label">BACA ONLINE</p>

              <h1>{ebook.title}</h1>

              <p className="ebook-reader-author">
                {ebook.author}
                {ebook.publicationYear
                  ? ` • ${ebook.publicationYear}`
                  : ""}
              </p>
            </div>
          </div>

          {canDownload && ebook.fileUrl && (
            <a
              href={ebook.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="ebook-reader-download"
            >
              <Download size={17} />
              Download
            </a>
          )}
        </section>

        {!ebook.fileUrl ? (
          <section className="ebook-reader-empty">
            <FileText size={46} />
            <h2>File E-Book belum tersedia</h2>
            <p>
              E-Book ini sudah terdaftar, tetapi file baca online
              belum tersedia.
            </p>
          </section>
        ) : !isPdf ? (
          <section className="ebook-reader-empty">
            <FileText size={46} />
            <h2>Format belum didukung</h2>
            <p>
              Reader saat ini mendukung PDF. Dukungan EPUB akan
              ditambahkan kemudian.
            </p>
          </section>
        ) : pdfError ? (
          <section className="ebook-reader-error">
            <FileText size={42} />
            <h1>PDF tidak dapat dimuat</h1>
            <p>{pdfError}</p>
          </section>
        ) : (
          <>
            <section className="ebook-reader-progress">
              <div className="ebook-reader-progress-info">
                <span>
                  Halaman <strong>{currentPage}</strong> /{" "}
                  <strong>{totalPages || "..."}</strong>
                </span>

                <span>{progress}% selesai</span>
              </div>

              <div className="ebook-reader-progress-track">
                <div
                  className="ebook-reader-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            <section className="ebook-reader-toolbar">
              <div className="ebook-reader-toolbar-group">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1),
                    )
                  }
                  disabled={currentPage <= 1 || pdfLoading}
                  className="ebook-reader-tool"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={18} />
                  Sebelumnya
                </button>

                <span className="ebook-reader-page-number">
                  {currentPage} / {totalPages || "..."}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(page + 1, totalPages),
                    )
                  }
                  disabled={
                    !totalPages ||
                    currentPage >= totalPages ||
                    pdfLoading
                  }
                  className="ebook-reader-tool"
                  aria-label="Halaman berikutnya"
                >
                  Berikutnya
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="ebook-reader-toolbar-group">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(
                        Number((value - 0.1).toFixed(2)),
                        0.5,
                      ),
                    )
                  }
                  disabled={pdfLoading}
                  className="ebook-reader-tool ebook-reader-tool-icon"
                  aria-label="Perkecil"
                >
                  <Minus size={17} />
                </button>

                <span className="ebook-reader-zoom">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(
                        Number((value + 0.1).toFixed(2)),
                        2,
                      ),
                    )
                  }
                  disabled={pdfLoading}
                  className="ebook-reader-tool ebook-reader-tool-icon"
                  aria-label="Perbesar"
                >
                  <Plus size={17} />
                </button>
              </div>
            </section>

            <section className="ebook-reader-viewer">
              {pdfLoading && (
                <div className="ebook-reader-pdf-loading">
                  <Loader2
                    size={24}
                    className="ebook-reader-spinner"
                  />
                  <span>Memuat halaman...</span>
                </div>
              )}

              <div className="ebook-reader-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className="ebook-pdf-canvas"
                />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
