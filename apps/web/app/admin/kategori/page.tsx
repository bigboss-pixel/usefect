"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import SiteHeader from "../../../components/SiteHeader";
import { apiFetch } from "../../lib/api";

type Category = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminKategoriPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Category | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await apiFetch("/categories");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil data kategori",
        );
      }

      setCategories(
        Array.isArray(result)
          ? result
          : result?.data ?? [],
      );
    } catch (error: any) {
      console.error("Gagal mengambil kategori:", error);

      setPageError(
        error?.message ?? "Gagal mengambil data kategori",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return categories;

    return categories.filter((category) =>
      `${category.name} ${category.description ?? ""}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [categories, search]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setFormError("");
    setPageError("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description ?? "");
    setFormError("");
    setPageError("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCategory(null);
    setName("");
    setDescription("");
    setFormError("");
  };

  const saveCategory = async () => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 2) {
      setFormError("Nama kategori minimal 2 karakter.");
      return;
    }

    if (cleanName.length > 100) {
      setFormError("Nama kategori maksimal 100 karakter.");
      return;
    }

    if (cleanDescription.length > 500) {
      setFormError("Deskripsi maksimal 500 karakter.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setPageError("");

      const isEdit = editingCategory !== null;

      const response = await apiFetch(
        isEdit
          ? `/categories/${editingCategory.id}`
          : "/categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            description: cleanDescription || undefined,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            `Gagal ${
              isEdit ? "memperbarui" : "membuat"
            } kategori`,
        );
      }

      setModalOpen(false);
      setEditingCategory(null);
      setName("");
      setDescription("");
      setFormError("");

      setSuccessMessage(
        isEdit
          ? "Kategori berhasil diperbarui."
          : "Kategori berhasil dibuat.",
      );

      await fetchCategories();
    } catch (error: any) {
      console.error("Gagal menyimpan kategori:", error);

      setFormError(
        error?.message ?? "Gagal menyimpan kategori",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setDeleteTarget(category);
    setPageError("");
    setSuccessMessage("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const deleteCategory = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setPageError("");

      const response = await apiFetch(
        `/categories/${deleteTarget.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal menghapus kategori",
        );
      }

      const deletedName = deleteTarget.name;

      setDeleteTarget(null);
      setSuccessMessage(
        `Kategori "${deletedName}" berhasil dihapus.`,
      );

      await fetchCategories();
    } catch (error: any) {
      console.error("Gagal menghapus kategori:", error);

      setPageError(
        error?.message ?? "Gagal menghapus kategori",
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <SiteHeader />

      <main className="category-admin-page">
        <section className="category-admin-hero">
          <div className="category-admin-hero-glow" />

          <div className="category-admin-hero-content">
            <div className="category-admin-breadcrumb">
              <span>ADMIN</span>
              <ChevronRight size={13} />
              <span>PUSTAKAWAN</span>
              <ChevronRight size={13} />
              <strong>KATEGORI</strong>
            </div>

            <div className="category-admin-title-row">
              <div>
                <div className="category-admin-eyebrow">
                  <FolderTree size={15} />
                  COLLECTION MANAGEMENT
                </div>

                <h1>
                  Manajemen
                  <em>Kategori</em>
                </h1>

                <p>
                  Kelola struktur kategori koleksi USEFECT
                  agar katalog tetap rapi, terorganisir,
                  dan mudah ditemukan.
                </p>
              </div>

              <button
                type="button"
                className="category-admin-primary-button"
                onClick={openCreateModal}
              >
                <Plus size={18} />
                <span>Tambah Kategori</span>
              </button>
            </div>
          </div>
        </section>

        <section className="category-admin-content">
          {successMessage && (
            <div className="category-admin-alert success">
              <CheckCircle2 size={17} />
              <span>{successMessage}</span>

              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                aria-label="Tutup pesan"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {pageError && (
            <div className="category-admin-alert error">
              <span>{pageError}</span>

              <button
                type="button"
                onClick={() => setPageError("")}
                aria-label="Tutup pesan"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="category-admin-stats">
            <div className="category-admin-stat-card">
              <div className="category-admin-stat-icon blue">
                <Layers3 size={20} />
              </div>

              <div>
                <span>Total Kategori</span>
                <strong>{categories.length}</strong>
              </div>
            </div>

            <div className="category-admin-stat-card">
              <div className="category-admin-stat-icon gold">
                <BookOpen size={20} />
              </div>

              <div>
                <span>Hasil Ditampilkan</span>
                <strong>{filteredCategories.length}</strong>
              </div>
            </div>

            <div className="category-admin-stat-card">
              <div className="category-admin-stat-icon cyan">
                <FolderTree size={20} />
              </div>

              <div>
                <span>Status Sistem</span>
                <strong>Aktif</strong>
              </div>
            </div>
          </div>

          <div className="category-admin-panel">
            <div className="category-admin-panel-header">
              <div>
                <div className="category-admin-section-label">
                  COLLECTION TAXONOMY
                </div>

                <h2>Daftar Kategori</h2>

                <p>
                  Kategori yang tersedia untuk koleksi buku
                  USEFECT.
                </p>
              </div>

              <button
                type="button"
                className="category-admin-refresh"
                onClick={fetchCategories}
                disabled={loading}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="category-admin-toolbar">
              <div className="category-admin-search">
                <Search size={17} />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari nama atau deskripsi kategori..."
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Hapus pencarian"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="category-admin-result-count">
                {filteredCategories.length} kategori
              </div>
            </div>

            {loading ? (
              <div className="category-admin-loading">
                <div className="category-admin-spinner" />
                <span>Memuat kategori...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="category-admin-empty">
                <div className="category-admin-empty-icon">
                  <FolderTree size={28} />
                </div>

                <h3>
                  {search
                    ? "Kategori tidak ditemukan"
                    : "Belum ada kategori"}
                </h3>

                <p>
                  {search
                    ? "Coba gunakan kata kunci pencarian yang berbeda."
                    : "Buat kategori pertama untuk mulai mengatur koleksi buku."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="category-admin-empty-button"
                  >
                    <Plus size={16} />
                    Tambah Kategori
                  </button>
                )}
              </div>
            ) : (
              <div className="category-admin-list">
                <div className="category-admin-list-head">
                  <span>KATEGORI</span>
                  <span>DESKRIPSI</span>
                  <span>DIBUAT</span>
                  <span>AKSI</span>
                </div>

                {filteredCategories.map(
                  (category, index) => (
                    <article
                      key={category.id}
                      className="category-admin-item"
                    >
                      <div className="category-admin-name-cell">
                        <div className="category-admin-index">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="category-admin-folder">
                          <FolderTree size={18} />
                        </div>

                        <div className="category-admin-name">
                          <strong>{category.name}</strong>
                          <span>
                            ID kategori #{category.id}
                          </span>
                        </div>
                      </div>

                      <div className="category-admin-description">
                        {category.description ? (
                          <span>{category.description}</span>
                        ) : (
                          <span className="muted">
                            Tidak ada deskripsi kategori.
                          </span>
                        )}
                      </div>

                      <div className="category-admin-date">
                        <CalendarDays size={15} />
                        <span>
                          {formatDate(category.createdAt)}
                        </span>
                      </div>

                      <div className="category-admin-actions">
                        <button
                          type="button"
                          className="category-admin-action edit"
                          onClick={() =>
                            openEditModal(category)
                          }
                          title="Edit kategori"
                        >
                          <Pencil size={16} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="category-admin-action delete"
                          onClick={() =>
                            confirmDelete(category)
                          }
                          title="Hapus kategori"
                        >
                          <Trash2 size={16} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {modalOpen && (
        <div
          className="category-admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="category-admin-modal">
            <div className="category-admin-modal-top">
              <div className="category-admin-modal-icon">
                {editingCategory ? (
                  <Pencil size={19} />
                ) : (
                  <Plus size={21} />
                )}
              </div>

              <button
                type="button"
                className="category-admin-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Tutup"
              >
                <X size={19} />
              </button>
            </div>

            <div className="category-admin-modal-heading">
              <span>
                {editingCategory
                  ? "EDIT CATEGORY"
                  : "NEW CATEGORY"}
              </span>

              <h2>
                {editingCategory
                  ? "Edit Kategori"
                  : "Tambah Kategori"}
              </h2>

              <p>
                {editingCategory
                  ? "Perbarui informasi kategori koleksi."
                  : "Buat kategori baru untuk mengelompokkan koleksi buku."}
              </p>
            </div>

            <div className="category-admin-form">
              <label>
                <span>
                  Nama Kategori
                  <b>*</b>
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Contoh: Teknologi"
                  maxLength={100}
                  autoFocus
                />

                <small>{name.length}/100</small>
              </label>

              <label>
                <span>
                  Deskripsi
                  <i>Opsional</i>
                </span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Jelaskan isi atau cakupan kategori..."
                  maxLength={500}
                  rows={4}
                />

                <small>{description.length}/500</small>
              </label>

              {formError && (
                <div className="category-admin-form-error">
                  <X size={15} />
                  {formError}
                </div>
              )}

              <div className="category-admin-modal-actions">
                <button
                  type="button"
                  className="category-admin-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="category-admin-save-button"
                  onClick={saveCategory}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingCategory
                        ? "Simpan Perubahan"
                        : "Buat Kategori"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="category-admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div className="category-admin-delete-modal">
            <div className="category-admin-delete-icon">
              <Trash2 size={22} />
            </div>

            <span className="category-admin-modal-kicker">
              DELETE CATEGORY
            </span>

            <h2>Hapus kategori?</h2>

            <p>
              Kamu akan menghapus kategori{" "}
              <strong>“{deleteTarget.name}”</strong>.
              Kategori yang masih digunakan oleh buku
              tetap akan dilindungi oleh sistem.
            </p>

            <div className="category-admin-delete-actions">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Batal
              </button>

              <button
                type="button"
                className="danger"
                onClick={deleteCategory}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="button-spinner" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Hapus Kategori
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
