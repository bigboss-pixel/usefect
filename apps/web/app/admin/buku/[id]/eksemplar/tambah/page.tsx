"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Barcode,
  BookOpen,
  MapPin,
  Save,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "../../../../../lib/api";

type Book = {
  id: number;
  title: string;
  isbn: string;
  author: string;
  publisher?: string | null;
  publicationYear?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
};

type BookCopy = {
  id: number;
  barcode: string;
  status: string;
  shelfLocation?: string | null;
  bookId: number;
};

export default function TambahEksemplarPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loadingBook, setLoadingBook] = useState(true);
  const [loadingCopies, setLoadingCopies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);

  const automaticShelfLocation =
    copies.find(
      (copy) =>
        copy.shelfLocation &&
        copy.shelfLocation.trim(),
    )?.shelfLocation?.trim() ?? null;

  const fetchBook = async () => {
    try {
      setLoadingBook(true);
      setError("");

      const response = await apiFetch(
        `/books/${id}`,
      );

      const result =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil informasi buku",
        );
      }

      setBook(result);
    } catch (error: any) {
      console.error(
        "Gagal mengambil buku:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil informasi buku",
      );
    } finally {
      setLoadingBook(false);
    }
  };

  const fetchCopies = async () => {
    try {
      setLoadingCopies(true);

      const response = await apiFetch(
        "/book-copies",
      );

      const result =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil informasi eksemplar",
        );
      }

      const allCopies: BookCopy[] =
        Array.isArray(result)
          ? result
          : result?.data ?? [];

      setCopies(
        allCopies.filter(
          (copy) =>
            Number(copy.bookId) ===
            Number(id),
        ),
      );
    } catch (error: any) {
      console.error(
        "Gagal mengambil eksemplar:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil informasi eksemplar",
      );
    } finally {
      setLoadingCopies(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBook();
      fetchCopies();
    }
  }, [id]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      setError(
        "Jumlah eksemplar harus antara 1 sampai 100.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(
        `/book-copies/bulk/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity,
          }),
        },
      );

      const result =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menambahkan eksemplar",
        );
      }

      alert(
        result?.message ??
          `${quantity} eksemplar berhasil ditambahkan`,
      );

      router.push(`/admin/buku/${id}`);
    } catch (error: any) {
      console.error(
        "Gagal menambahkan eksemplar:",
        error,
      );

      setError(
        error?.message ??
          "Gagal menambahkan eksemplar",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingBook || loadingCopies) {
    return (
      <main className="admin-book-copy-form-page">
        <div className="admin-book-copy-form-container">
          <div className="admin-book-copy-form-state">
            <RefreshCw
              size={30}
              className="admin-book-spin"
            />

            <p>
              Memuat informasi buku...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="admin-book-copy-form-page">
        <div className="admin-book-copy-form-container">
          <button
            type="button"
            className="admin-book-copy-form-back"
            onClick={() =>
              router.push("/admin/buku")
            }
          >
            <ArrowLeft size={17} />
            Kembali ke Manajemen Buku
          </button>

          <div className="admin-book-copy-form-state">
            <BookOpen size={34} />

            <h2>
              Buku tidak ditemukan
            </h2>

            <p>
              {error ||
                "Informasi buku tidak tersedia."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-book-copy-form-page">
      <div className="admin-book-copy-form-container">
        <button
          type="button"
          className="admin-book-copy-form-back"
          onClick={() =>
            router.push(`/admin/buku/${id}`)
          }
        >
          <ArrowLeft size={17} />
          Kembali ke Detail Buku
        </button>

        <header className="admin-book-copy-form-header">
          <div>
            <span className="admin-book-copy-form-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>
              Tambah Banyak Eksemplar
            </h1>

            <p>
              Tambahkan beberapa eksemplar fisik
              sekaligus untuk koleksi buku
              perpustakaan UMA.
            </p>
          </div>

          <div className="admin-book-copy-form-icon">
            <Barcode size={30} />
          </div>
        </header>

        {/* INFORMASI BUKU */}
        <section className="admin-book-copy-form-book">
          <div className="admin-book-copy-form-book-icon">
            <BookOpen size={22} />
          </div>

          <div>
            <span>
              BUKU YANG AKAN DITAMBAHKAN EKSEMPLARNYA
            </span>

            <h2>{book.title}</h2>

            <p>
              ISBN: {book.isbn}
              {" • "}
              {book.category?.name ??
                "Tanpa Kategori"}
            </p>
          </div>
        </section>

        {/* FORM */}
        <form
          className="admin-book-copy-form-card"
          onSubmit={handleSubmit}
        >
          <div className="admin-book-copy-form-section">
            <span className="admin-book-copy-form-section-label">
              DATA EKSEMPLAR
            </span>

            <div className="admin-book-copy-form-grid">
              {/* JUMLAH */}
              <div className="admin-book-copy-form-field">
                <label htmlFor="quantity">
                  Jumlah Eksemplar
                  <span>*</span>
                </label>

                <div className="admin-book-copy-form-input-wrapper">
                  <BookOpen size={17} />

                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="Contoh: 5"
                  />
                </div>

                <small>
                  Masukkan jumlah eksemplar yang
                  ingin ditambahkan sekaligus.
                  Maksimal 100 eksemplar.
                </small>
              </div>

              {/* LOKASI OTOMATIS */}
              <div className="admin-book-copy-form-field">
                <label>
                  Lokasi Rak
                </label>

                <div className="admin-book-copy-form-input-wrapper">
                  <MapPin size={17} />

                  <input
                    type="text"
                    value={
                      automaticShelfLocation ??
                      ""
                    }
                    placeholder={
                      automaticShelfLocation
                        ? undefined
                        : "Belum ditentukan"
                    }
                    readOnly
                  />
                </div>

                <small>
                  Lokasi rak ditentukan otomatis
                  berdasarkan eksemplar buku yang
                  sudah tersedia.
                </small>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="admin-book-copy-form-status">
            <div>
              <span>Status Awal</span>

              <strong>
                Tersedia
              </strong>
            </div>

            <p>
              Semua eksemplar baru otomatis dibuat
              dengan status{" "}
              <b>AVAILABLE</b>.
            </p>
          </div>

          {/* BARCODE */}
          <div className="admin-book-copy-form-status">
            <div>
              <span>Barcode</span>

              <strong>
                Otomatis
              </strong>
            </div>

            <p>
              Sistem akan membuat barcode secara
              otomatis berdasarkan urutan
              eksemplar buku.
            </p>
          </div>

          {error && (
            <div className="admin-book-copy-form-error">
              {error}
            </div>
          )}

          <div className="admin-book-copy-form-actions">
            <button
              type="button"
              className="admin-book-copy-form-cancel"
              disabled={loading}
              onClick={() =>
                router.push(
                  `/admin/buku/${id}`,
                )
              }
            >
              Batal
            </button>

            <button
              type="submit"
              className="admin-book-copy-form-submit"
              disabled={loading}
            >
              <Save size={17} />

              {loading
                ? "Menambahkan..."
                : `Tambahkan ${quantity} Eksemplar`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}