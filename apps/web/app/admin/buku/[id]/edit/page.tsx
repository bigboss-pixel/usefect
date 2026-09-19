"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Save,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "../../../../lib/api";

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

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
  categoryId?: number | null;
};

export default function EditBukuPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [form, setForm] = useState({
    title: "",
    isbn: "",
    author: "",
    publisher: "",
    publicationYear: "",
    categoryId: "",
    description: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBook, setLoadingBook] = useState(true);
  const [loadingCategories, setLoadingCategories] =
    useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBook = async () => {
    try {
      setLoadingBook(true);
      setError("");

      const response = await apiFetch(`/books/${id}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil data buku",
        );
      }

      const book: Book = result;

      setForm({
        title: book.title ?? "",
        isbn: book.isbn ?? "",
        author: book.author ?? "",
        publisher: book.publisher ?? "",
        publicationYear:
          book.publicationYear?.toString() ?? "",
        categoryId:
          book.categoryId?.toString() ??
          book.category?.id?.toString() ??
          "",
        description: book.description ?? "",
      });
    } catch (error: any) {
      console.error("Gagal mengambil buku:", error);

      setError(
        error?.message ?? "Gagal mengambil data buku",
      );
    } finally {
      setLoadingBook(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await apiFetch("/categories");
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil kategori",
        );
      }

      setCategories(
        Array.isArray(result)
          ? result
          : result?.data ?? [],
      );
    } catch (error: any) {
      console.error("Gagal mengambil kategori:", error);

      setError(
        error?.message ?? "Gagal mengambil kategori",
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchBook();
    fetchCategories();
  }, [id]);

  const handleChange = (
    field: string,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (
      !form.title.trim() ||
      !form.isbn.trim() ||
      !form.author.trim() ||
      !form.categoryId
    ) {
      setError(
        "Judul, ISBN, penulis, dan kategori wajib diisi.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(`/books/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          isbn: form.isbn.trim(),
          author: form.author.trim(),
          publisher:
            form.publisher.trim() || null,
          publicationYear: form.publicationYear
            ? Number(form.publicationYear)
            : null,
          description:
            form.description.trim() || null,
          categoryId: Number(form.categoryId),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal memperbarui buku",
        );
      }

      alert(
        result?.message ??
          "Buku berhasil diperbarui",
      );

      router.push(`/admin/buku/${id}`);
    } catch (error: any) {
      console.error(
        "Gagal memperbarui buku:",
        error,
      );

      setError(
        error?.message ??
          "Gagal memperbarui buku",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingBook) {
    return (
      <main className="admin-book-form-page">
        <div className="admin-book-form-container">
          <div className="admin-book-copy-form-state">
            <RefreshCw
              size={30}
              className="admin-book-spin"
            />

            <p>Memuat data buku...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-book-form-page">
      <div className="admin-book-form-container">

        <button
          type="button"
          className="admin-book-form-back"
          onClick={() =>
            router.push(`/admin/buku/${id}`)
          }
        >
          <ArrowLeft size={17} />
          Kembali ke Detail Buku
        </button>

        <header className="admin-book-form-header">
          <div>
            <span className="admin-book-form-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>Edit Buku</h1>

            <p>
              Perbarui informasi koleksi buku
              perpustakaan UMA.
            </p>
          </div>

          <div className="admin-book-form-icon">
            <BookOpen size={30} />
          </div>
        </header>

        <form
          className="admin-book-form-card"
          onSubmit={handleSubmit}
        >
          <div className="admin-book-form-section">
            <span className="admin-book-form-section-label">
              INFORMASI UTAMA
            </span>

            <div className="admin-book-form-grid">

              {/* JUDUL */}
              <div className="admin-book-form-field admin-book-form-field-full">
                <label htmlFor="title">
                  Judul Buku<span>*</span>
                </label>

                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    handleChange(
                      "title",
                      event.target.value,
                    )
                  }
                  placeholder="Masukkan judul buku"
                />
              </div>

              {/* ISBN */}
              <div className="admin-book-form-field">
                <label htmlFor="isbn">
                  ISBN<span>*</span>
                </label>

                <input
                  id="isbn"
                  type="text"
                  value={form.isbn}
                  onChange={(event) =>
                    handleChange(
                      "isbn",
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: 978-602-1234-56-7"
                />
              </div>

              {/* PENULIS */}
<div className="admin-book-form-field">
  <label htmlFor="author">
    Penulis<span>*</span>
  </label>
  <textarea
    id="author"
    rows={4}
    value={form.author}
    onChange={(event) =>
      handleChange(
        "author",
        event.target.value,
      )
    }
    placeholder={"Masukkan nama penulis, satu penulis per baris"}
  />
  <small>
    Jika ada beberapa penulis, masukkan satu penulis pada setiap baris.
  </small>
</div>

              {/* PENERBIT */}
              <div className="admin-book-form-field">
                <label htmlFor="publisher">
                  Penerbit
                </label>

                <input
                  id="publisher"
                  type="text"
                  value={form.publisher}
                  onChange={(event) =>
                    handleChange(
                      "publisher",
                      event.target.value,
                    )
                  }
                  placeholder="Nama penerbit"
                />
              </div>

              {/* TAHUN */}
              <div className="admin-book-form-field">
                <label htmlFor="publicationYear">
                  Tahun Terbit
                </label>

                <input
                  id="publicationYear"
                  type="number"
                  min="1000"
                  max="9999"
                  value={form.publicationYear}
                  onChange={(event) =>
                    handleChange(
                      "publicationYear",
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: 2026"
                />
              </div>

              {/* KATEGORI */}
              <div className="admin-book-form-field">
                <label htmlFor="categoryId">
                  Kategori<span>*</span>
                </label>

                <select
                  id="categoryId"
                  value={form.categoryId}
                  onChange={(event) =>
                    handleChange(
                      "categoryId",
                      event.target.value,
                    )
                  }
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories
                      ? "Memuat kategori..."
                      : "Pilih kategori"}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                {loadingCategories && (
                  <small className="admin-book-form-loading">
                    <RefreshCw size={12} />
                    Mengambil data kategori...
                  </small>
                )}

                {!loadingCategories &&
                  categories.length === 0 && (
                    <small>
                      Belum ada kategori tersedia.
                    </small>
                  )}
              </div>

              {/* DESKRIPSI */}
              <div className="admin-book-form-field admin-book-form-field-full">
                <label htmlFor="description">
                  Deskripsi
                </label>

                <textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(event) =>
                    handleChange(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Masukkan deskripsi buku..."
                />
              </div>

            </div>
          </div>

          {error && (
            <div className="admin-book-form-error">
              {error}
            </div>
          )}

          <div className="admin-book-form-actions">

            <button
              type="button"
              className="admin-book-form-cancel"
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
              className="admin-book-form-submit"
              disabled={
                loading ||
                loadingCategories
              }
            >
              <Save size={17} />

              {loading
                ? "Menyimpan..."
                : "Simpan Perubahan"}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}