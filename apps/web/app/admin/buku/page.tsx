"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Eye,
  Filter,
  History,
  Layers3,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
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
  createdAt?: string | null;

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

const ITEMS_PER_PAGE = 8;

export default function AdminBukuPage() {
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const [selectedBook, setSelectedBook] =
    useState<Book | null>(null);

  const [page, setPage] = useState(1);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError("");

      const query =
        search.trim() !== ""
          ? `&search=${encodeURIComponent(search.trim())}`
          : "";

      // API maksimal 100 data per request.
      // Ambil seluruh halaman API untuk mendapatkan
      // seluruh koleksi buku.
      const firstResponse = await apiFetch(
        `/books?limit=100&page=1${query}`,
      );

      const firstResult =
        await firstResponse.json();

      if (!firstResponse.ok) {
        throw new Error(
          firstResult?.message ??
            "Gagal mengambil data buku",
        );
      }

      const firstData: Book[] =
        firstResult?.data ?? [];

      const totalPages =
        Number(
          firstResult?.pagination?.totalPages ?? 1,
        );

      let allBooks = [...firstData];

      if (totalPages > 1) {
        const remainingPages =
          await Promise.all(
            Array.from(
              { length: totalPages - 1 },
              (_, index) => index + 2,
            ).map(async (apiPage) => {
              const response =
                await apiFetch(
                  `/books?limit=100&page=${apiPage}${query}`,
                );

              const result =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  result?.message ??
                    `Gagal mengambil halaman buku ${apiPage}`,
                );
              }

              return (result?.data ?? []) as Book[];
            }),
          );

        allBooks = [
          ...allBooks,
          ...remainingPages.flat(),
        ];
      }

      setBooks(allBooks);
      setPage(1);

      if (allBooks.length > 0) {
        setSelectedBook(allBooks[0]);
      } else {
        setSelectedBook(null);
      }
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

  const formatNumber = (value: number) =>
    Number(value ?? 0).toLocaleString("id-ID");

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        books
          .map((book) => book.category?.name)
          .filter(Boolean),
      ),
    ) as string[];
  }, [books]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        books.flatMap(
          (book) => book.availability.locations ?? [],
        ),
      ),
    ).filter(Boolean);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const categoryMatch =
        !categoryFilter ||
        book.category?.name === categoryFilter;

      const statusMatch =
        !statusFilter ||
        (statusFilter === "available"
          ? book.availability.isAvailable
          : !book.availability.isAvailable);

      const locationMatch =
        !locationFilter ||
        (book.availability.locations ?? []).includes(
          locationFilter,
        );

      return (
        categoryMatch &&
        statusMatch &&
        locationMatch
      );
    });
  }, [books, categoryFilter, statusFilter, locationFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBooks.length / ITEMS_PER_PAGE),
  );

  const visibleBooks = filteredBooks.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const totalCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.availability.total ?? 0),
    0,
  );

  const availableCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.availability.available ?? 0),
    0,
  );

  const borrowedCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.availability.borrowed ?? 0),
    0,
  );

  const unavailableBooks = books.filter(
    (book) => !book.availability.isAvailable,
  ).length;

  const now = new Date();

  const thisMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  // Total koleksi yang sudah ada sampai akhir bulan lalu.
  const totalBooksLastMonth = books.filter((book) => {
    if (!book.createdAt) return false;

    return new Date(book.createdAt) < thisMonthStart;
  }).length;

  // Total koleksi saat ini.
  const totalBooksCurrent = books.length;

  const totalBooksGrowthPercentage =
    totalBooksLastMonth > 0
      ? Math.round(
          ((totalBooksCurrent -
            totalBooksLastMonth) /
            totalBooksLastMonth) *
            100,
        )
      : 0;

  const availablePercentage =
    totalCopies > 0
      ? Math.round((availableCopies / totalCopies) * 100)
      : 0;

  const borrowedPercentage =
    totalCopies > 0
      ? Math.round((borrowedCopies / totalCopies) * 100)
      : 0;

  const unavailablePercentage =
    books.length > 0
      ? Math.round((unavailableBooks / books.length) * 100)
      : 0;

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setLocationFilter("");
    setPage(1);
  };

  const selectBook = (book: Book) => {
    setSelectedBook(book);
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="admin-book-page">
      <div className="admin-book-container">

        {/* HEADER */}
        <header className="admin-book-header">

          <div>
            <div className="admin-book-eyebrow">
              ADMIN / PUSTAKAWAN
            </div>

            <h1>Manajemen Buku</h1>

            <p>
              Kelola koleksi buku dan ekosistem pengetahuan USEFECT.
            </p>
          </div>

          <button
            className="admin-book-add-button"
            onClick={() =>
              router.push("/admin/buku/tambah")
            }
          >
            <Plus size={17} />
            Tambah Buku
          </button>

        </header>

        {/* STATISTICS */}
        {!loading && !error && (
          <section className="admin-book-stat-grid">

            <div className="admin-book-stat-card">
              <div className="admin-book-stat-icon blue">
                <BookOpen size={20} />
              </div>

              <div className="admin-book-stat-content">
                <span>Total Buku</span>
                <strong>{formatNumber(books.length)}</strong>
              </div>

              <small className="admin-book-stat-meta">
                <span
                  className={`admin-book-stat-percent ${
                    totalBooksGrowthPercentage >= 0
                      ? "positive"
                      : "danger"
                  }`}
                >
                  {totalBooksGrowthPercentage >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(totalBooksGrowthPercentage)}%
                </span>
                <span>dari bulan lalu</span>
              </small>
            </div>

            <div className="admin-book-stat-card">
              <div className="admin-book-stat-icon green">
                <CheckCircle2 size={20} />
              </div>

              <div className="admin-book-stat-content">
                <span>Tersedia</span>
                <strong>
                  {formatNumber(availableCopies)}
                </strong>
              </div>

              <small className="admin-book-stat-meta">
                <span className="admin-book-stat-percent positive">
                  ↑ {availablePercentage}%
                </span>
                <span>dari total</span>
              </small>
            </div>

            <div className="admin-book-stat-card">
              <div className="admin-book-stat-icon amber">
                <Layers3 size={20} />
              </div>

              <div className="admin-book-stat-content">
                <span>Dipinjam</span>
                <strong>
                  {formatNumber(borrowedCopies)}
                </strong>
              </div>

              <small className="admin-book-stat-meta">
                <span className="admin-book-stat-percent warning">
                  ↑ {borrowedPercentage}%
                </span>
                <span>dari total</span>
              </small>
            </div>

            <div className="admin-book-stat-card">
              <div className="admin-book-stat-icon red">
                <AlertCircle size={20} />
              </div>

              <div className="admin-book-stat-content">
                <span>Tidak Tersedia</span>
                <strong>
                  {formatNumber(unavailableBooks)}
                </strong>
              </div>

              <small className="admin-book-stat-meta">
                <span className="admin-book-stat-percent danger">
                  ↑ {unavailablePercentage}%
                </span>
                <span>dari total</span>
              </small>
            </div>

          </section>
        )}

        {/* FILTER BAR */}
        {!loading && !error && (
          <section className="admin-book-filter-bar">

            {/* FILTER KOLEKSI */}
            <div className="admin-book-filter-left">

              <div className="admin-book-search">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Cari judul, penulis, atau ISBN..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <select
                className="admin-book-filter-select"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Kategori</option>

                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>

              <select
                className="admin-book-filter-select"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Status</option>
                <option value="available">
                  Tersedia
                </option>
                <option value="unavailable">
                  Tidak Tersedia
                </option>
              </select>

              <select
                className="admin-book-filter-select"
                value={locationFilter}
                onChange={(event) => {
                  setLocationFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Rak</option>

                {locations.map((location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                ))}
              </select>

            </div>

            {/* ACTION FILTER — DI ATAS PANEL DETAIL */}
            <div className="admin-book-filter-right">

              <button
                className="admin-book-filter-button"
                onClick={fetchBooks}
                disabled={loading}
              >
                <Filter size={15} />
                Filter
              </button>

              <button
                className="admin-book-reset-button"
                onClick={resetFilters}
              >
                <RotateCcw size={14} />
                Reset
              </button>

            </div>

          </section>
        )}

        {/* LOADING */}
        {loading && (
          <div className="admin-book-state">
            <RefreshCw
              size={28}
              className="admin-book-spin"
            />

            <p>Memuat data buku...</p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="admin-book-state admin-book-error">
            <AlertCircle size={32} />

            <h2>Gagal memuat buku</h2>

            <p>{error}</p>

            <button onClick={fetchBooks}>
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

              <h2>Buku belum tersedia</h2>

              <p>
                Belum ada koleksi buku yang dapat
                ditampilkan.
              </p>
            </div>
          )}

        {/* MANAGEMENT */}
        {!loading &&
          !error &&
          books.length > 0 && (
            <section className="admin-book-management">

              {/* TABLE */}
              <div className="admin-book-table-panel">

                <div className="admin-book-table-header">

                  <div>
                    <h2>Daftar Koleksi</h2>

                    <p>
                      Menampilkan{" "}
                      <strong>
                        {formatNumber(
                          filteredBooks.length,
                        )}
                      </strong>{" "}
                      judul buku.
                    </p>
                  </div>

                  <span className="admin-book-count">
                    {formatNumber(totalCopies)} eksemplar
                  </span>

                </div>

                <div className="admin-book-table-wrap">

                  <table className="admin-book-table">

                    <thead>
                      <tr>
                        <th className="book-col">Buku</th>
                        <th>Kategori</th>
                        <th>Tahun</th>
                        <th>Stok</th>
                        <th>Status</th>
                        <th className="action-col">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleBooks.map((book) => (
                        <tr
                          key={book.id}
                          className={
                            selectedBook?.id === book.id
                              ? "admin-book-row-selected"
                              : ""
                          }
                          onClick={() =>
                            selectBook(book)
                          }
                        >

                          <td>
                            <div className="admin-book-table-book">

                              <div className="admin-book-table-cover">
                                <BookOpen size={19} />
                              </div>

                              <div className="admin-book-table-title">
                                <strong>
                                  {book.title}
                                </strong>

                                <span>
                                  {book.author}
                                </span>

                                <small>
                                  ISBN {book.isbn}
                                </small>
                              </div>

                            </div>
                          </td>

                          <td>
                            <span className="admin-book-category-badge">
                              {book.category?.name ??
                                "Tanpa Kategori"}
                            </span>
                          </td>

                          <td>
                            {book.publicationYear ?? "-"}
                          </td>

                          <td>
                            <div className="admin-book-stock">
                              <strong>
                                {formatNumber(
                                  book.availability
                                    .available,
                                )}
                              </strong>

                              <span>
                                /{" "}
                                {formatNumber(
                                  book.availability.total,
                                )}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                book.availability
                                  .isAvailable
                                  ? "admin-book-status available"
                                  : "admin-book-status unavailable"
                              }
                            >
                              <i />

                              {book.availability
                                .isAvailable
                                ? "Tersedia"
                                : "Tidak tersedia"}
                            </span>
                          </td>

                          <td>
                            <div className="admin-book-row-actions">

                              <button
                                title="Lihat detail"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectBook(book);
                                }}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                title="Edit buku"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  router.push(
                                    `/admin/buku/${book.id}/edit`,
                                  );
                                }}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                title="Aksi lainnya"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectBook(book);
                                }}
                              >
                                <MoreHorizontal size={15} />
                              </button>

                            </div>
                          </td>

                        </tr>
                      ))}

                      {visibleBooks.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="admin-book-no-results"
                          >
                            Tidak ada buku yang sesuai
                            dengan filter.
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

                {/* PAGINATION */}
                <div className="admin-book-pagination">

                  <span>
                    Menampilkan{" "}
                    {filteredBooks.length === 0
                      ? 0
                      : (page - 1) *
                          ITEMS_PER_PAGE +
                        1}
                    –
                    {Math.min(
                      page * ITEMS_PER_PAGE,
                      filteredBooks.length,
                    )}{" "}
                    dari{" "}
                    {formatNumber(
                      filteredBooks.length,
                    )}{" "}
                    buku
                  </span>

          <div className="admin-book-page-buttons">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={15} />
            </button>

            {(() => {
              const pageNumbers: (number | "ellipsis")[] = [];

              if (totalPages <= 7) {
                for (let number = 1; number <= totalPages; number++) {
                  pageNumbers.push(number);
                }
              } else if (page <= 4) {
                pageNumbers.push(1, 2, 3, 4, 5, "ellipsis", totalPages);
              } else if (page >= totalPages - 3) {
                pageNumbers.push(
                  1,
                  "ellipsis",
                  totalPages - 4,
                  totalPages - 3,
                  totalPages - 2,
                  totalPages - 1,
                  totalPages,
                );
              } else {
                pageNumbers.push(
                  1,
                  "ellipsis",
                  page - 1,
                  page,
                  page + 1,
                  "ellipsis",
                  totalPages,
                );
              }

              return pageNumbers.map((number, index) =>
                number === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="admin-book-page-ellipsis"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={number}
                    type="button"
                    className={page === number ? "active" : ""}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ),
              );
            })()}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              <ChevronRight size={15} />
            </button>
          </div>

                  <select
                    className="admin-book-page-size"
                    value={ITEMS_PER_PAGE}
                    disabled
                  >
                    <option value={8}>
                      8 per halaman
                    </option>
                  </select>

                </div>

              </div>

              {/* DETAIL PANEL */}
              <aside className="admin-book-detail-panel">

                {selectedBook ? (
                  <>
                    <div className="admin-book-detail-heading">
                      <span>DETAIL BUKU</span>

                      <button
                        onClick={() =>
                          setSelectedBook(null)
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="admin-book-detail-main">

                      <div className="admin-book-detail-cover">
                        <BookOpen size={38} />
                      </div>

                      <div className="admin-book-detail-title">
                        <span>
                          {selectedBook.category?.name ??
                            "Tanpa Kategori"}
                        </span>

                        <h2>
                          {selectedBook.title}
                        </h2>

                        <p>
                          ISBN {selectedBook.isbn}
                        </p>
                      </div>

                    </div>

                    <div className="admin-book-detail-divider" />

                    <div className="admin-book-detail-info">

                      <div>
                        <span>Penulis</span>

                        <strong className="multiline">
                          {selectedBook.author}
                        </strong>
                      </div>

                      <div>
                        <span>Penerbit</span>

                        <strong>
                          {selectedBook.publisher ?? "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Tahun Terbit</span>

                        <strong>
                          {selectedBook.publicationYear ??
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>Kategori</span>

                        <strong>
                          {selectedBook.category?.name ??
                            "Tanpa Kategori"}
                        </strong>
                      </div>

                      <div>
                        <span>Total Eksemplar</span>

                        <strong>
                          {formatNumber(
                            selectedBook.availability.total,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Tersedia</span>

                        <strong>
                          {formatNumber(
                            selectedBook.availability.available,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Sedang Dipinjam</span>

                        <strong>
                          {formatNumber(
                            selectedBook.availability.borrowed,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Lokasi</span>

                        <strong>
                          {selectedBook.availability
                            .locations?.length
                            ? selectedBook.availability.locations.join(
                                ", ",
                              )
                            : "-"}
                        </strong>
                      </div>

                    </div>

                    <div className="admin-book-detail-status">
                      <span>Status</span>

                      <strong
                        className={
                          selectedBook.availability
                            .isAvailable
                            ? "available"
                            : "unavailable"
                        }
                      >
                        <i />

                        {selectedBook.availability
                          .isAvailable
                          ? "Tersedia"
                          : "Tidak tersedia"}
                      </strong>
                    </div>

                    <div className="admin-book-detail-actions">

                      <button
                        className="primary"
                        onClick={() =>
                          router.push(
                            `/admin/buku/${selectedBook.id}/edit`,
                          )
                        }
                      >
                        <Pencil size={15} />
                        Edit Data Buku
                      </button>

                      <div className="admin-book-detail-action-row">

                        <button
                          onClick={() => {
                            router.push(
                              `/admin/buku/${selectedBook.id}`,
                            );
                          }}
                        >
                          <Eye size={15} />
                          Lihat Detail
                        </button>

                        <button
                          onClick={() => {
                            alert(
                              "Fitur tambah eksemplar akan dihubungkan ke modul eksemplar.",
                            );
                          }}
                        >
                          <CopyPlus size={15} />
                          Tambah Eksemplar
                        </button>

                      </div>

                      <div className="admin-book-detail-action-row">

                        <button
                          onClick={() => {
                            alert(
                              "Riwayat buku akan dihubungkan ke audit transaksi.",
                            );
                          }}
                        >
                          <History size={15} />
                          Lihat Riwayat
                        </button>

                        <button
                          className="danger"
                          onClick={() => {
                            alert(
                              "Hapus buku akan dihubungkan setelah alur penghapusan backend siap.",
                            );
                          }}
                        >
                          <Trash2 size={15} />
                          Hapus Buku
                        </button>

                      </div>

                    </div>
                  </>
                ) : (
                  <div className="admin-book-detail-empty">

                    <div className="admin-book-detail-empty-icon">
                      <BookOpen size={30} />
                    </div>

                    <h3>Pilih sebuah buku</h3>

                    <p>
                      Pilih buku pada tabel untuk
                      melihat informasi lengkapnya.
                    </p>

                  </div>
                )}

              </aside>

            </section>
          )}

      </div>
    </main>
  );
}
