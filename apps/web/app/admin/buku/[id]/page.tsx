"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Layers3,
  Plus,
  RefreshCw,
  MapPin,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { apiFetch } from "../../../lib/api";

type Book = {
  id: number;
  title: string;
  isbn: string;
  author: string;
  publisher?: string | null;
  publicationYear?: number | null;
  description?: string | null;

  category?: {
    id: number;
    name: string;
  } | null;

  availability: {
    total: number;
    available: number;
    borrowed: number;
    isAvailable: boolean;
    locations: string[];
  };
};

type BookCopy = {
  id: number;
  barcode: string;
  status: string;
  shelfLocation?: string | null;
  bookId?: number;
};

export default function AdminDetailBukuPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCopies, setLoadingCopies] = useState(true);
  const [error, setError] = useState("");

  const fetchBook = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(`/books/${id}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil detail buku",
        );
      }

      setBook(result);
    } catch (error: any) {
      console.error("Gagal mengambil detail buku:", error);

      setError(
        error?.message ?? "Gagal mengambil detail buku",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCopies = async () => {
    try {
      setLoadingCopies(true);

      const response = await apiFetch("/book-copies");
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil data eksemplar",
        );
      }

      const allCopies: BookCopy[] = Array.isArray(result)
        ? result
        : result?.data ?? [];

      setCopies(
        allCopies.filter(
          (copy) =>
            Number(copy.bookId) === Number(id),
        ),
      );
    } catch (error) {
      console.error(
        "Gagal mengambil eksemplar:",
        error,
      );

      setCopies([]);
    } finally {
      setLoadingCopies(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchBook(),
      fetchCopies(),
    ]);
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleDeleteCopy = async (copy: BookCopy) => {
    const confirmed = window.confirm(
      `Hapus eksemplar dengan barcode "${copy.barcode}"?\n\n` +
        "Eksemplar yang sudah memiliki riwayat peminjaman tidak dapat dihapus.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await apiFetch(
        `/book-copies/${copy.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menghapus eksemplar",
        );
      }

      alert(
        result?.message ??
          "Eksemplar berhasil dihapus",
      );

      await fetchData();
    } catch (error: any) {
      console.error(
        "Gagal menghapus eksemplar:",
        error,
      );

      alert(
        error?.message ??
          "Gagal menghapus eksemplar",
      );
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Tersedia";

      case "BORROWED":
        return "Dipinjam";

      case "LOST":
        return "Hilang";

      case "DAMAGED":
        return "Rusak";

      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "admin-book-copy-status-available";

      case "BORROWED":
        return "admin-book-copy-status-borrowed";

      case "LOST":
        return "admin-book-copy-status-lost";

      case "DAMAGED":
        return "admin-book-copy-status-damaged";

      default:
        return "admin-book-copy-status-default";
    }
  };

  if (loading) {
    return (
      <main className="admin-book-detail-page">
        <div className="admin-book-detail-container">
          <div className="admin-book-detail-state">
            <RefreshCw
              size={32}
              className="admin-book-spin"
            />

            <p>Memuat detail buku...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="admin-book-detail-page">
        <div className="admin-book-detail-container">
          <button
            type="button"
            className="admin-book-detail-back"
            onClick={() =>
              router.push("/admin/buku")
            }
          >
            <ArrowLeft size={17} />
            Kembali ke Manajemen Buku
          </button>

          <div className="admin-book-detail-state admin-book-detail-error">
            <AlertCircle size={34} />

            <h2>Buku tidak ditemukan</h2>

            <p>
              {error ||
                "Data buku tidak tersedia."}
            </p>

            <button
              type="button"
              onClick={fetchData}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-book-detail-page">
      <div className="admin-book-detail-container">

        {/* KEMBALI */}
        <button
          type="button"
          className="admin-book-detail-back"
          onClick={() =>
            router.push("/admin/buku")
          }
        >
          <ArrowLeft size={17} />
          Kembali ke Manajemen Buku
        </button>

        {/* HEADER BUKU */}
        <section className="admin-book-detail-hero">
          <div className="admin-book-detail-hero-icon">
            <BookOpen size={36} />
          </div>

          <div className="admin-book-detail-hero-content">
            <span className="admin-book-detail-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <span className="admin-book-detail-category">
              {book.category?.name ??
                "Tanpa Kategori"}
            </span>

            <h1>{book.title}</h1>

            <div className="admin-book-detail-author book-author-multiline">
                {book.author}
            </div>
          </div>
        </section>

        {/* INFORMASI BUKU */}
        <section className="admin-book-detail-card">
          <div className="admin-book-detail-section-heading">
            <div>
              <span>INFORMASI BUKU</span>

              <h2>Detail Koleksi</h2>
            </div>
          </div>

          <div className="admin-book-detail-info-grid">

            <div className="admin-book-detail-info-item">
              <span>ISBN</span>

              <strong>
                {book.isbn}
              </strong>
            </div>

            <div className="admin-book-detail-info-item">
              <span>Penulis</span>

              <strong>
                {book.author}
              </strong>
            </div>

            <div className="admin-book-detail-info-item">
              <span>Penerbit</span>

              <strong>
                {book.publisher ?? "-"}
              </strong>
            </div>

            <div className="admin-book-detail-info-item">
              <span>Tahun Terbit</span>

              <strong>
                {book.publicationYear ?? "-"}
              </strong>
            </div>

          </div>

          {book.description && (
            <div className="admin-book-detail-description">
              <span>DESKRIPSI</span>

              <p>
                {book.description}
              </p>
            </div>
          )}
        </section>

        {/* STATISTIK */}
        <section className="admin-book-detail-stats">

          <div className="admin-book-detail-stat-card">
            <div className="admin-book-detail-stat-icon">
              <Layers3 size={20} />
            </div>

            <div>
              <span>Total Eksemplar</span>

              <strong>
                {book.availability.total}
              </strong>
            </div>
          </div>

          <div className="admin-book-detail-stat-card">
            <div className="admin-book-detail-stat-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <span>Tersedia</span>

              <strong>
                {book.availability.available}
              </strong>
            </div>
          </div>

          <div className="admin-book-detail-stat-card">
            <div className="admin-book-detail-stat-icon">
              <BookOpen size={20} />
            </div>

            <div>
              <span>Dipinjam</span>

              <strong>
                {book.availability.borrowed}
              </strong>
            </div>
          </div>

        </section>

        {/* EKSEMPLAR */}
        <section className="admin-book-detail-card">

          <div className="admin-book-detail-section-heading admin-book-copy-heading">

            <div>
              <span>EKSEMPLAR BUKU</span>

              <h2>Kelola Eksemplar</h2>
            </div>

            <button
              type="button"
              className="admin-book-copy-add-button"
              onClick={() => {
                router.push(
                  `/admin/buku/${id}/eksemplar/tambah`,
                );
              }}
            >
              <Plus size={17} />
              Tambah Eksemplar
            </button>

          </div>

          {/* LOADING */}
          {loadingCopies ? (
            <div className="admin-book-copy-loading">
              <RefreshCw
                size={25}
                className="admin-book-spin"
              />

              <p>
                Memuat eksemplar...
              </p>
            </div>

          ) : copies.length === 0 ? (

            /* KOSONG */
            <div className="admin-book-copy-empty">
              <Layers3 size={34} />

              <h3>
                Belum ada eksemplar
              </h3>

              <p>
                Buku ini belum memiliki
                eksemplar. Tambahkan eksemplar
                untuk membuat buku tersedia
                untuk dipinjam.
              </p>

              <button
                type="button"
                onClick={() => {
                  router.push(
                    `/admin/buku/${id}/eksemplar/tambah`,
                  );
                }}
              >
                <Plus size={16} />
                Tambah Eksemplar
              </button>
            </div>

          ) : (

            /* DAFTAR EKSEMPLAR */
            <div className="admin-book-copy-list">

              {copies.map((copy, index) => (
                <article
                  key={copy.id}
                  className="admin-book-copy-row"
                >

                  <div className="admin-book-copy-number">
                    {index + 1}
                  </div>

                  <div className="admin-book-copy-main">

                    <div className="admin-book-copy-barcode">
                      <Barcode size={17} />

                      <strong>
                        {copy.barcode}
                      </strong>
                    </div>

                    <div className="admin-book-copy-location">
                      <MapPin size={15} />

                      <span>
                        {copy.shelfLocation ??
                          "Lokasi rak belum diatur"}
                      </span>
                    </div>

                  </div>

                  <span
                    className={`admin-book-copy-status ${getStatusClass(
                      copy.status,
                    )}`}
                  >
                    {getStatusLabel(
                      copy.status,
                    )}
                  </span>

<button
  type="button"
  className="admin-book-copy-edit-button"
  onClick={() =>
    router.push(
      `/admin/buku/${id}/eksemplar/${copy.id}/edit`,
    )
  }
  aria-label={`Edit eksemplar ${copy.barcode}`}
>
  <Pencil size={15} />
  Edit
</button>

<button
  type="button"
  className="admin-book-copy-delete-button"
  onClick={() => handleDeleteCopy(copy)}
  aria-label={`Hapus eksemplar ${copy.barcode}`}
>
  <Trash2 size={15} />
  Hapus
</button>

                </article>
              ))}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}