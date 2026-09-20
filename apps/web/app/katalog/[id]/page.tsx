"use client";

import SiteHeader from "../../../components/SiteHeader";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, MapPin } from "lucide-react";
import { apiFetch } from "../../lib/api";

type Book = {
  id: number;
  title: string;
  isbn: string;
  author: string;
  publisher: string | null;
  publicationYear: number | null;
  description: string | null;
  category: {
    id: number;
    name: string;
  } | null;
  availability: {
    total: number;
    available: number;
    borrowed: number;
    isAvailable: boolean;
    locations: string[];
    availableCopies: {
      id: number;
      barcode: string;
      shelfLocation: string | null;
    }[];
  };
};

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { id } = await params;

        const response = await apiFetch(`/books/${id}`);

        if (!response.ok) {
          throw new Error("Buku tidak ditemukan");
        }

        const result = await response.json();

        setBook(result);
      } catch (error) {
        console.error(
          "Gagal mengambil detail buku:",
          error,
        );

        setError("Buku tidak ditemukan");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [params]);

  const handleReservation = async () => {
    if (!book || submitting) return;

    if (!book.availability.isAvailable) {
      alert("Buku sedang tidak tersedia.");
      return;
    }

    const confirmed = window.confirm(
      `Ajukan peminjaman buku "${book.title}"?`,
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const response = await apiFetch("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: book.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengajukan peminjaman",
        );
      }

      alert(
        result?.message ??
          "Pengajuan peminjaman berhasil dibuat.",
      );

      window.location.href = "/reservasi";
    } catch (error: any) {
      console.error(
        "Gagal mengajukan reservasi:",
        error,
      );

      alert(
        error?.message ??
          "Gagal mengajukan peminjaman",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="catalog-page">
        <div className="catalog-content">
          <p>Memuat detail buku...</p>
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="catalog-page">
        <div className="catalog-content">
          <button
            onClick={() => window.history.back()}
            className="catalog-back-button"
          >
            <ArrowLeft size={18} />
            Kembali
          </button>

          <h1>Buku tidak ditemukan</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="catalog-page">
            <SiteHeader />

      <section className="catalog-content catalog-detail-content">
        <div className="book-detail-wrapper">
          <button
            onClick={() => window.history.back()}
            className="catalog-back-button"
          >
            <ArrowLeft size={18} />
            Kembali ke Katalog
          </button>

          <div className="book-detail">
            <div className="book-detail-cover">
              <BookOpen size={72} strokeWidth={1.5} />
            </div>

            <div className="book-detail-info">
              <span className="book-detail-category">
                {book.category?.name ?? "Tanpa Kategori"}
              </span>

              <h1>{book.title}</h1>

              <p className="book-detail-author">
                {book.author}
              </p>

              <div className="book-detail-meta">
                <div>
                  <span>ISBN</span>
                  <strong>{book.isbn}</strong>
                </div>

                <div>
                  <span>Penerbit</span>
                  <strong>
                    {book.publisher ?? "Tidak tersedia"}
                  </strong>
                </div>

                <div>
                  <span>Tahun Terbit</span>
                  <strong>
                    {book.publicationYear ??
                      "Tidak tersedia"}
                  </strong>
                </div>
              </div>

              <div className="book-detail-availability">
                <strong>
                  {book.availability.isAvailable
                    ? "Tersedia"
                    : "Tidak tersedia"}
                </strong>

                <span>
                  {book.availability.available} dari{" "}
                  {book.availability.total} eksemplar tersedia
                </span>
              </div>

              <div className="book-detail-loan-action">
                {book.availability.isAvailable ? (
                  <button
                    className="book-loan-button"
                    onClick={handleReservation}
                    disabled={submitting}
                  >
                    <BookOpen size={18} />

                    {submitting
                      ? "Mengajukan..."
                      : "Ajukan Peminjaman"}
                  </button>
                ) : (
                  <div className="book-loan-unavailable">
                    Buku sedang tidak tersedia
                  </div>
                )}
              </div>

              {book.availability.locations.length > 0 && (
                <div className="book-detail-location">
                  <MapPin size={18} />

                  <span>
                    {book.availability.locations.join(", ")}
                  </span>
                </div>
              )}

              {book.description && (
                <div className="book-detail-description">
                  <h2>Deskripsi</h2>
                  <p>{book.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}