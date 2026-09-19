"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Save,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "../../../lib/api";

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

export default function TambahBukuPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    isbn: "",
    author: "",
    publisher: "",
    publicationYear: "",
    categoryId: "",
    description: "",
  });

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await apiFetch(
        "/categories",
      );

      const result =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil kategori",
        );
      }

      setCategories(
        Array.isArray(result)
          ? result
          : result?.data ?? [],
      );
    } catch (error: any) {
      console.error(
        "Gagal mengambil kategori:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil kategori",
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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

      const response = await apiFetch(
        "/books",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: form.title.trim(),

            isbn: form.isbn.trim(),

            author: form.author.trim(),

            publisher:
              form.publisher.trim() || null,

            publicationYear:
              form.publicationYear
                ? Number(
                    form.publicationYear,
                  )
                : null,

            description:
              form.description.trim() || null,

            categoryId:
              Number(form.categoryId),
          }),
        },
      );

      const result =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menambahkan buku",
        );
      }

      alert(
        result?.message ??
          "Buku berhasil ditambahkan",
      );

      router.push("/admin/buku");
    } catch (error: any) {
      console.error(
        "Gagal menambahkan buku:",
        error,
      );

      setError(
        error?.message ??
          "Gagal menambahkan buku",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-book-form-page">
      <div className="admin-book-form-container">

        <button
          type="button"
          className="admin-book-form-back"
          onClick={() =>
            router.push("/admin/buku")
          }
        >
          <ArrowLeft size={17} />
          Kembali ke Manajemen Buku
        </button>

        <header className="admin-book-form-header">
          <div>
            <span className="admin-book-form-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>
              Tambah Buku
            </h1>

            <p>
              Tambahkan koleksi buku baru
              ke perpustakaan UMA.
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

              <div className="admin-book-form-field admin-book-form-field-full">
                <label htmlFor="title">
                  Judul Buku
                  <span>*</span>
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

              <div className="admin-book-form-field">
                <label htmlFor="isbn">
                  ISBN
                  <span>*</span>
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

              <div className="admin-book-form-field">
                <label htmlFor="publicationYear">
                  Tahun Terbit
                </label>

                <input
                  id="publicationYear"
                  type="number"
                  min="1000"
                  max="9999"
                  value={
                    form.publicationYear
                  }
                  onChange={(event) =>
                    handleChange(
                      "publicationYear",
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: 2026"
                />
              </div>

              <div className="admin-book-form-field">
                <label htmlFor="categoryId">
                  Kategori
                  <span>*</span>
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

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>

                {loadingCategories && (
                  <small className="admin-book-form-loading">
                    <RefreshCw
                      size={12}
                    />
                    Mengambil data kategori...
                  </small>
                )}

                {!loadingCategories &&
                  categories.length === 0 && (
                    <small>
                      Belum ada kategori
                      tersedia.
                    </small>
                  )}
              </div>

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
                router.push("/admin/buku")
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
                : "Simpan Buku"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}