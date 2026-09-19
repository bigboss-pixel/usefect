"use client";

import { useState, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  LibraryBig,
  CheckCircle2,
} from "lucide-react";

type Book = {
  id: number;
  title: string;
  isbn: string;
  author: string;
  category: string;
  publicationYear: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number,
};

const categories = [
  { id: "", name: "Semua Kategori" },
  { id: "2", name: "Teknologi" },
  { id: "4", name: "QA Category" },
];

export default function KatalogPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [publicationYear, setPublicationYear] = useState("Semua Tahun");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("publicationYear");
  const [sortOrder, setSortOrder] = useState("desc");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);

       const params = new URLSearchParams();

        params.set("page", String(currentPage));
        params.set("limit", "10");

        if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
        }

          if (publicationYear !== "Semua Tahun") {
          params.set("publicationYear", publicationYear);
          }

          if (availableOnly) {
            params.set("isAvailable", "true");
          }

          params.set("sortBy", sortBy);
          params.set("sortOrder", sortOrder);

        const response = await fetch(
        `http://localhost:3001/books?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data buku");
        }

        const result = await response.json();

        setBooks(
          result.data.map((book: any) => ({
            id: book.id,
            title: book.title,
            isbn: book.isbn,
            author: book.author,
            category: book.category?.name ?? "Tanpa Kategori",
            publicationYear: book.publicationYear ?? 0,
            totalCopies: book.availability?.total ?? 0,
            availableCopies: book.availability?.available ?? 0,
            borrowedCopies: book.availability?.borrowed ?? 0,
          })),
        );

          setTotalPages(result.pagination?.totalPages ?? 1);

      } catch (error) {
        console.error("Gagal mengambil buku:", error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    }, 
      [currentPage,
      searchQuery,
      category,
      publicationYear,
      availableOnly,
      sortBy,
      sortOrder,
    ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search");

    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, []);

  const filteredBooks = books;

  const handleSearch = () => {
  setCurrentPage(1);
  setSearchQuery(search.trim());

  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (category) {
  params.set("categoryId", category);
}

  window.history.pushState(
    {},
    "",
    `/katalog${params.toString() ? `?${params}` : ""}`,
  );
};

  return (
    <main className="catalog-page">

      {/* ================= HEADER ================= */}

      <header className="catalog-header">

        <div className="catalog-brand">

          <a href="/" className="catalog-logo">
            UMA
          </a>

          <div className="catalog-brand-divider" />

          <div>
            <strong>Perpustakaan Digital</strong>
            <span>Universitas Medan Area</span>
          </div>

        </div>

        <nav className="catalog-nav">

          <a href="/">
            Beranda
          </a>

          <a href="/katalog" className="active">
            Katalog
          </a>
          <a href="/reservasi">
            Reservasi
          </a>

          <a href="#">
            Jurnal
          </a>

          <a href="#">
            Penelitian
          </a>

          <a href="#">
            E-Book
          </a>

          <a href="#">
            Layanan
          </a>

        </nav>

        <div className="catalog-user">

          <div className="catalog-avatar">
            DH
          </div>

          <div>
            <strong>Dedi Halawa</strong>
            <span>Mahasiswa</span>
          </div>

          <ChevronDown size={16} />

        </div>

      </header>


      {/* ================= PAGE INTRO ================= */}

      <section className="catalog-hero">

        <div>

          <div className="catalog-eyebrow">
            <LibraryBig size={17} />
            OPAC · ONLINE PUBLIC ACCESS CATALOG
          </div>

          <h1>
            Temukan Koleksi
            <br />
            <em>Perpustakaan UMA</em>
          </h1>

          <p>
            Jelajahi koleksi buku, referensi akademik, dan
            sumber pengetahuan Universitas Medan Area.
          </p>

        </div>

      </section>


      {/* ================= SEARCH ================= */}

      <section className="catalog-search-section">

        <div className="catalog-search-box">

          <Search size={22} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Cari judul buku, penulis, ISBN, atau topik..."
          />

          <button onClick={handleSearch}>
            Cari
          </button>

        </div>

      </section>


      {/* ================= CONTENT ================= */}

      <section className="catalog-content">

        {/* FILTER */}

        <aside className="catalog-filter">

          <div className="filter-heading">
            <SlidersHorizontal size={18} />
            <strong>Filter Koleksi</strong>
          </div>


          <div className="filter-group">

            <label>
              Kategori
            </label>

            <div className="filter-select">

<select
  value={category}
  onChange={(event) => {
    setCategory(event.target.value);
    setCurrentPage(1);
  }}
>
  {categories.map((item) => (
    <option key={item.id} value={item.id}>
      {item.name}
    </option>
  ))}
</select>

              <ChevronDown size={15} />

            </div>

          </div>


          <div className="filter-group">

            <label>
              Tahun Terbit
            </label>

            <div className="filter-select">

                <select
                  value={publicationYear}
                  onChange={(event) => {
                  setPublicationYear(event.target.value);
                  setCurrentPage(1);
                  }}
                  >
                    <option value="Semua Tahun">
                    Semua Tahun
                    </option>

                    <option value="2026">
                    2026
                    </option>

                    <option value="2025">
                    2025
                    </option>

                    <option value="2024">
                    2024
                    </option>

                    <option value="2023">
                    2023
                    </option>

                    <option value="2022">
                    2022
                    </option>

                    <option value="2021">
                    2021
                    </option>

                    <option value="2020">
                    2020
                    </option>
                  </select>

              <ChevronDown size={15} />

            </div>

          </div>


          <div className="filter-group">

            <label>
              Ketersediaan
            </label>

            <label className="availability-check">

              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) => {
                setAvailableOnly(event.target.checked);
                setCurrentPage(1);
                }}
              />

              <span>
                Hanya buku tersedia
              </span>

            </label>

          </div>


          <div className="filter-info">

            <BookOpen size={19} />

            <div>
              <strong>
                Koleksi UMA
              </strong>

              <span>
                Buku yang tersedia dapat
                diajukan untuk peminjaman.
              </span>
            </div>

          </div>

        </aside>


        {/* RESULTS */}

        <div className="catalog-results">

          <div className="results-header">

            <div>

              <span>
                HASIL PENCARIAN
              </span>

              <h2>
                {search
                  ? `Hasil untuk "${search}"`
                  : "Semua Koleksi"}
              </h2>

              <p>
                Menampilkan{" "}
                <strong>
                  {filteredBooks.length}
                </strong>{" "}
                koleksi buku
              </p>

            </div>


            <div className="sort-box">

              <span>
                Urutkan:
              </span>

  <select
  value={`${sortBy}-${sortOrder}`}
  onChange={(event) => {
    const value = event.target.value;

    if (value === "publicationYear-desc") {
      setSortBy("publicationYear");
      setSortOrder("desc");
    }

    if (value === "title-asc") {
      setSortBy("title");
      setSortOrder("asc");
    }

    if (value === "author-asc") {
      setSortBy("author");
      setSortOrder("asc");
    }

    setCurrentPage(1);
  }}
  >
  <option value="publicationYear-desc">
    Terbaru
  </option>

  <option value="title-asc">
    Judul A-Z
  </option>

  <option value="author-asc">
    Penulis A-Z
  </option>
</select>

              <ChevronDown size={14} />

            </div>

          </div>


          {/* BOOK LIST */}

          <div className="catalog-books">

            {loading ? (

              <div className="catalog-empty">
                Memuat koleksi...
              </div>

            ) : filteredBooks.length === 0 ? (

              <div className="catalog-empty">

                <Search size={36} />

                <h3>
                  Buku tidak ditemukan
                </h3>

                <p>
                  Coba gunakan kata kunci lain.
                </p>

              </div>

            ) : (

              filteredBooks.map((book) => (

                <article
                  className="catalog-book-card"
                  key={book.id}
                >

                  <div
                    className={`catalog-book-cover cover-${book.id}`}
                  >

                    <small>
                      UNIVERSITAS
                      <br />
                      MEDAN AREA
                    </small>

                    <strong>
                      {book.title}
                    </strong>

                    <span>
                      PERPUSTAKAAN DIGITAL
                    </span>

                  </div>


                  <div className="catalog-book-info">

                    <div className="catalog-book-top">

                      <div>

                        <span className="book-category">
                          {book.category}
                        </span>

                        <h3>
                          {book.title}
                        </h3>

                        <p className="book-author">
                          {book.author}
                        </p>

                      </div>


                      <button
                        className="favorite-button"
                        aria-label={`Favorit ${book.title}`}
                      >
                        <Heart size={18} />
                      </button>

                    </div>


                    <div className="book-meta">

                      <span>
                        ISBN {book.isbn}
                      </span>

                      <span>
                        {book.publicationYear}
                      </span>

                    </div>


                    <div className="book-availability">

                      <div>

                        <span>
                          Total
                        </span>

                        <strong>
                          {book.totalCopies}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Tersedia
                        </span>

                        <strong>
                          {book.availableCopies}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Dipinjam
                        </span>

                        <strong>
                          {book.borrowedCopies}
                        </strong>

                      </div>

                    </div>


                    <div className="catalog-book-footer">

                      {book.availableCopies > 0 ? (

                        <span className="book-status available">
                          <CheckCircle2 size={15} />
                          Tersedia
                        </span>

                      ) : (

                        <span className="book-status unavailable">
                          Tidak tersedia
                        </span>

                      )}


                      <a
                        href={`/katalog/${book.id}`}
                        className="detail-button"
                      >
                        Lihat Detail
                        <ChevronRight size={16} />
                      </a>

                    </div>

                  </div>

                </article>

              ))

            )}

          </div>

          {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="catalog-pagination">

                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    disabled={currentPage === 1}
                    >
                    <ChevronLeft size={17} />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;

                    return (
                    <button
                      key={page}
                      className={currentPage === page ? "selected" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                    );
                  })}

                  <button
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(page + 1, totalPages),
                    )
                  }
                  disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={17} />
                  </button>

                </div>
              )}

        </div>

      </section>

    </main>
  );
}