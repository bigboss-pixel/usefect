"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Plus,
  Eye,
  Pencil,
  RefreshCw,
  Layers3,
} from "lucide-react";

import { apiFetch } from "../../lib/api";

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

export default function AdminBukuPage() {
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError("");

      const query =
        search.trim() !== ""
          ? `&search=${encodeURIComponent(
              search.trim(),
            )}`
          : "";

      const response = await apiFetch(
        `/books?limit=100${query}`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil data buku",
        );
      }

      setBooks(result?.data ?? []);
    } catch (error: any) {
      console.error(
        "Gagal mengambil buku:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil data buku",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const formatNumber = (value: number) => {
    return Number(
      value ?? 0,
    ).toLocaleString("id-ID");
  };

  return (
    <main className="admin-book-page">
      <div className="admin-book-container">

        {/* HEADER */}
        <header className="admin-book-header">
          <div>
            <span className="admin-book-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>
              Manajemen Buku
            </h1>

            <p>
              Kelola koleksi buku dan
              eksemplar perpustakaan UMA.
            </p>
          </div>

          <button
            className="admin-book-add-button"
            onClick={() =>
              router.push(
                "/admin/buku/tambah",
              )
            }
          >
            <Plus size={18} />
            Tambah Buku
          </button>
        </header>

        {/* TOOLBAR */}
        <section className="admin-book-toolbar">

          <div className="admin-book-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Cari judul, penulis, atau ISBN..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          <button
            className="admin-book-refresh-button"
            onClick={fetchBooks}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "admin-book-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </section>

        {/* LOADING */}
        {loading && (
          <div className="admin-book-state">
            <RefreshCw
              size={30}
              className="admin-book-spin"
            />

            <p>
              Memuat data buku...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="admin-book-state admin-book-error">
            <p>{error}</p>

            <button
              onClick={fetchBooks}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          books.length === 0 && (
            <div className="admin-book-state">
              <BookOpen size={34} />

              <h2>
                Buku tidak ditemukan
              </h2>

              <p>
                Tidak ada buku yang sesuai
                dengan pencarian.
              </p>
            </div>
          )}

        {/* BOOK LIST */}
        {!loading &&
          !error &&
          books.length > 0 && (
            <section className="admin-book-grid">

              {books.map((book) => (
                <article
                  key={book.id}
                  className="admin-book-card"
                >

                  {/* TOP */}
                  <div className="admin-book-card-top">

                    <div className="admin-book-icon">
                      <BookOpen size={25} />
                    </div>

                    <span
                      className={
                        book.availability
                          .isAvailable
                          ? "admin-book-available"
                          : "admin-book-unavailable"
                      }
                    >
                      {book.availability
                        .isAvailable
                        ? "Tersedia"
                        : "Tidak tersedia"}
                    </span>

                  </div>

                  {/* CATEGORY */}
                  <span className="admin-book-category">
                    {book.category?.name ??
                      "Tanpa Kategori"}
                  </span>

                  {/* TITLE */}
                  <h2>
                    {book.title}
                  </h2>

                 <div className="admin-book-author book-author-multiline">
                    {book.author}
                  </div>

                  {/* META */}
                  <div className="admin-book-meta">

                    <div>
                      <span>
                        ISBN
                      </span>

                      <strong>
                        {book.isbn}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Tahun
                      </span>

                      <strong>
                        {book.publicationYear ??
                          "-"}
                      </strong>
                    </div>

                  </div>

                  {/* STATS */}
                  <div className="admin-book-stats">

                    <div>
                      <Layers3
                        size={16}
                      />

                      <span>
                        Total
                      </span>

                      <strong>
                        {formatNumber(
                          book.availability
                            .total,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Tersedia
                      </span>

                      <strong>
                        {formatNumber(
                          book.availability
                            .available,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Dipinjam
                      </span>

                      <strong>
                        {formatNumber(
                          book.availability
                            .borrowed,
                        )}
                      </strong>
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="admin-book-actions">

                    <button
                      className="admin-book-detail-button"
                      onClick={() =>
                        router.push(
                          `/admin/buku/${book.id}`,
                        )
                      }
                    >
                      <Eye size={16} />
                      Detail
                    </button>

                    <button
                      className="admin-book-edit-button"
                      onClick={() =>
                        router.push(
                          `/admin/buku/${book.id}/edit`,
                        )
                      }
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                  </div>

                </article>
              ))}

            </section>
          )}

      </div>
    </main>
  );
}