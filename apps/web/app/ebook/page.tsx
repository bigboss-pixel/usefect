"use client";

import { useEffect, useState } from "react";

import SiteHeader from "../../components/SiteHeader";
import {
  Search,
  SlidersHorizontal,
  BookOpen,
  Download,
  Globe2,
  Sparkles,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const ebookCategories = [
  "Semua",
  "Teknik Industri",
  "Teknologi",
  "Manajemen",
  "Ekonomi",
  "Hukum",
  "Pendidikan",
  "Sains",
];

type EBook = {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publicationYear: number | null;
  category: string | null;
  language: string;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  fileType: string | null;
  license: string | null;
  source: string | null;
  accessType: string;
  status: string;
  uploadedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  username: string | null;
  roles: string[];
};

type EBookResponse = {
  data: EBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type EBookForm = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: string;
  category: string;
  language: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
  fileType: string;
  license: string;
  source: string;
  accessType: string;
  status: string;
};

const emptyForm: EBookForm = {
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  publicationYear: "",
  category: "",
  language: "Indonesia",
  description: "",
  coverUrl: "",
  fileUrl: "",
  fileType: "PDF",
  license: "",
  source: "",
  accessType: "READ_ONLY",
  status: "DRAFT",
};

export default function EbookPage() {
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [myEbooks, setMyEbooks] = useState<EBook[]>([]);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [showMyEbooks, setShowMyEbooks] =
    useState(false);

  const [activeCategory, setActiveCategory] =
    useState("Semua");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMyEbooks, setLoadingMyEbooks] =
    useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingEbook, setEditingEbook] =
    useState<EBook | null>(null);
  const [form, setForm] = useState<EBookForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001";

  const isAdmin =
    currentUser?.roles.includes("ADMIN") ?? false;

  const isSuperAdmin =
    currentUser?.roles.includes("SUPER_ADMIN") ?? false;

  const canModerate =
    isAdmin || isSuperAdmin;

  async function loadEbooks() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (activeCategory !== "Semua") {
        params.set("category", activeCategory);
      }

      const query = params.toString();

      const response = await fetch(
        `${apiUrl}/ebooks${query ? `?${query}` : ""}`,
      );

      if (!response.ok) {
        throw new Error(
          "Gagal mengambil koleksi E-Book.",
        );
      }

      const result =
        (await response.json()) as EBookResponse;

      setEbooks(result.data ?? []);
    } catch {
      setError(
        "Koleksi E-Book belum dapat dimuat. Silakan coba lagi.",
      );
      setEbooks([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyEbooks() {
    if (!currentUser) {
      setMyEbooks([]);
      return;
    }

    try {
      setLoadingMyEbooks(true);

      const response = await fetch(
        `${apiUrl}/ebooks/my`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setMyEbooks([]);
        return;
      }

      const result =
        (await response.json()) as EBook[];

      setMyEbooks(result);
    } catch {
      setMyEbooks([]);
    } finally {
      setLoadingMyEbooks(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        const response = await fetch(
          `${apiUrl}/auth/me`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setCurrentUser(null);
          setMyEbooks([]);
          return;
        }

        const user =
          (await response.json()) as CurrentUser;

        setCurrentUser(user);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setCurrentUser(null);
        setMyEbooks([]);
      }
    }

    loadCurrentUser();

    return () => controller.abort();
  }, [apiUrl]);

  useEffect(() => {
    loadEbooks();
  }, [search, activeCategory]);

  useEffect(() => {
    if (currentUser) {
      loadMyEbooks();
    }
  }, [currentUser]);

  function openCreateForm() {
    setEditingEbook(null);
    setForm(emptyForm);
    setActionError("");
    setShowForm(true);
  }

  function openEditForm(ebook: EBook) {
    if (
      !currentUser ||
      ebook.uploadedByUserId !== currentUser.id
    ) {
      return;
    }

    setEditingEbook(ebook);

    setForm({
      title: ebook.title,
      author: ebook.author,
      isbn: ebook.isbn ?? "",
      publisher: ebook.publisher ?? "",
      publicationYear:
        ebook.publicationYear?.toString() ?? "",
      category: ebook.category ?? "",
      language: ebook.language,
      description: ebook.description ?? "",
      coverUrl: ebook.coverUrl ?? "",
      fileUrl: ebook.fileUrl ?? "",
      fileType: ebook.fileType ?? "PDF",
      license: ebook.license ?? "",
      source: ebook.source ?? "",
      accessType: ebook.accessType,
      status: ebook.status,
    });

    setActionError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingEbook(null);
    setForm(emptyForm);
    setActionError("");
  }

  function updateForm(
    field: keyof EBookForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!currentUser) {
      setActionError(
        "Silakan login terlebih dahulu.",
      );
      return;
    }

    try {
      setSaving(true);
      setActionError("");

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        author: form.author.trim(),
        language: form.language.trim(),
        accessType: form.accessType,
        status: form.status,
      };

      const optionalFields = [
        "isbn",
        "publisher",
        "category",
        "description",
        "coverUrl",
        "fileUrl",
        "license",
        "source",
      ] as const;

      for (const field of optionalFields) {
        const value = form[field].trim();

        if (value) {
          payload[field] = value;
        }
      }

      if (form.publicationYear.trim()) {
        payload.publicationYear =
          Number(form.publicationYear);
      }

      if (form.fileType) {
        payload.fileType = form.fileType;
      }

      const url = editingEbook
        ? `${apiUrl}/ebooks/${editingEbook.id}`
        : `${apiUrl}/ebooks`;

      const response = await fetch(url, {
        method: editingEbook ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menyimpan E-Book.",
        );
      }

      closeForm();

      await Promise.all([
        loadEbooks(),
        loadMyEbooks(),
      ]);

      setShowMyEbooks(!editingEbook || showMyEbooks);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan E-Book.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ebook: EBook) {
    if (!currentUser) {
      return;
    }

    const owner =
      ebook.uploadedByUserId === currentUser.id;

    const allowed =
      owner || canModerate;

    if (!allowed) {
      return;
    }

    const confirmed = window.confirm(
      `Hapus E-Book "${ebook.title}"?\n\nTindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(ebook.id);
      setActionError("");

      const response = await fetch(
        `${apiUrl}/ebooks/${ebook.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menghapus E-Book.",
        );
      }

      await Promise.all([
        loadEbooks(),
        loadMyEbooks(),
      ]);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus E-Book.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const displayedEbooks = showMyEbooks
    ? myEbooks
    : ebooks;

  return (
    <main className="ebook-page">
      <SiteHeader />

      <section className="ebook-hero">
        <div className="ebook-hero-content">
          <span className="ebook-eyebrow">
            USEFECT · KNOWLEDGE HUB
          </span>

          <h1>
            E-Book Library
          </h1>

          <p>
            Jelajahi koleksi ebook digital dari berbagai bidang ilmu,
            bahasa, dan sumber pengetahuan dari seluruh dunia.
          </p>

          <div className="ebook-search">
            <Search size={20} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari judul, penulis, ISBN, atau topik..."
            />

            <button type="button">
              Cari
            </button>
          </div>

          <div className="ebook-hero-meta">
            <span>
              <BookOpen size={16} />
              Koleksi Digital
            </span>

            <span>
              <Globe2 size={16} />
              Global Knowledge
            </span>

            <span>
              <Sparkles size={16} />
              Open &amp; Licensed
            </span>
          </div>
        </div>
      </section>

      <section className="ebook-content">
        <div className="ebook-toolbar">
          <div>
            <span className="ebook-section-label">
              KNOWLEDGE COLLECTION
            </span>

            <h2>
              {showMyEbooks
                ? "E-Book Saya"
                : "Jelajahi E-Book"}
            </h2>

            <p>
              {showMyEbooks
                ? "Kelola koleksi E-Book yang Anda tambahkan."
                : "Temukan buku digital yang dapat dibaca langsung melalui USEFECT Knowledge Hub."}
            </p>
          </div>

          <div className="ebook-toolbar-actions">
            {currentUser && (
              <button
                className="ebook-add-button"
                type="button"
                onClick={openCreateForm}
              >
                <Plus size={17} />
                Tambah E-Book
              </button>
            )}

            <button
              className="ebook-filter-button"
              type="button"
            >
              <SlidersHorizontal size={17} />
              Filter
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="ebook-categories">
          {ebookCategories.map((category) => (
            <button
              type="button"
              className={
                !showMyEbooks &&
                category === activeCategory
                  ? "ebook-category active"
                  : "ebook-category"
              }
              key={category}
              onClick={() => {
                setShowMyEbooks(false);
                setActiveCategory(category);
              }}
            >
              {category}
            </button>
          ))}

          {currentUser && (
            <button
              type="button"
              className={
                showMyEbooks
                  ? "ebook-category active"
                  : "ebook-category"
              }
              onClick={() => setShowMyEbooks(true)}
            >
              E-Book Saya
            </button>
          )}
        </div>

        {actionError && (
          <div className="ebook-action-error">
            {actionError}
          </div>
        )}

        <div className="ebook-grid">
          {showMyEbooks && loadingMyEbooks && (
            <div>
              Memuat E-Book Anda...
            </div>
          )}

          {!showMyEbooks && loading && (
            <div>
              Memuat koleksi E-Book...
            </div>
          )}

          {!showMyEbooks &&
            !loading &&
            error && (
              <div>
                {error}
              </div>
            )}

          {!showMyEbooks &&
            !loading &&
            !error &&
            ebooks.length === 0 && (
              <div>
                Belum ada E-Book yang sesuai dengan pencarian.
              </div>
            )}

          {showMyEbooks &&
            !loadingMyEbooks &&
            myEbooks.length === 0 && (
              <div>
                Anda belum menambahkan E-Book.
              </div>
            )}

          {!showMyEbooks &&
            !loading &&
            !error &&
            displayedEbooks.map((ebook) => (
              <EbookCard
                key={ebook.id}
                ebook={ebook}
                currentUser={currentUser}
                canModerate={canModerate}
                deletingId={deletingId}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))}

          {showMyEbooks &&
            !loadingMyEbooks &&
            displayedEbooks.map((ebook) => (
              <EbookCard
                key={ebook.id}
                ebook={ebook}
                currentUser={currentUser}
                canModerate={canModerate}
                deletingId={deletingId}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))}
        </div>
      </section>

      {showForm && (
        <div
          className="ebook-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div
            className="ebook-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ebook-form-title"
          >
            <div className="ebook-modal-header">
              <div>
                <span className="ebook-section-label">
                  KNOWLEDGE COLLECTION
                </span>

                <h2 id="ebook-form-title">
                  {editingEbook
                    ? "Edit E-Book"
                    : "Tambah E-Book"}
                </h2>
              </div>

              <button
                className="ebook-modal-close"
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="ebook-form"
              onSubmit={handleSubmit}
            >
              <div className="ebook-form-grid">
                <label>
                  Judul *
                  <input
                    required
                    minLength={2}
                    maxLength={300}
                    value={form.title}
                    onChange={(event) =>
                      updateForm(
                        "title",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Penulis *
                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={form.author}
                    onChange={(event) =>
                      updateForm(
                        "author",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  ISBN
                  <input
                    minLength={10}
                    maxLength={20}
                    value={form.isbn}
                    onChange={(event) =>
                      updateForm(
                        "isbn",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Publisher
                  <input
                    value={form.publisher}
                    onChange={(event) =>
                      updateForm(
                        "publisher",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Tahun Terbit
                  <input
                    type="number"
                    min={1000}
                    value={form.publicationYear}
                    onChange={(event) =>
                      updateForm(
                        "publicationYear",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Kategori
                  <input
                    value={form.category}
                    placeholder="Contoh: Teknologi"
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Bahasa
                  <input
                    value={form.language}
                    onChange={(event) =>
                      updateForm(
                        "language",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  License
                  <input
                    value={form.license}
                    placeholder="Contoh: Open Access"
                    onChange={(event) =>
                      updateForm(
                        "license",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  File Type
                  <select
                    value={form.fileType}
                    onChange={(event) =>
                      updateForm(
                        "fileType",
                        event.target.value,
                      )
                    }
                  >
                    <option value="PDF">PDF</option>
                    <option value="EPUB">EPUB</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </label>

                <label>
                  Access Type
                  <select
                    value={form.accessType}
                    onChange={(event) =>
                      updateForm(
                        "accessType",
                        event.target.value,
                      )
                    }
                  >
                    <option value="READ_ONLY">
                      Read Only
                    </option>
                    <option value="DOWNLOAD">
                      Download
                    </option>
                    <option value="READ_AND_DOWNLOAD">
                      Read &amp; Download
                    </option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value,
                      )
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_REVIEW">
                      Pending Review
                    </option>
                    <option value="LICENSE_VERIFIED">
                      License Verified
                    </option>
                    <option value="TRANSLATING">
                      Translating
                    </option>
                    <option value="TRANSLATION_REVIEW">
                      Translation Review
                    </option>
                    <option value="PUBLISHED">
                      Published
                    </option>
                    <option value="SUSPENDED">
                      Suspended
                    </option>
                  </select>
                </label>

                <label>
                  Source
                  <input
                    value={form.source}
                    placeholder="Sumber / URL sumber"
                    onChange={(event) =>
                      updateForm(
                        "source",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="ebook-form-full">
                  Cover URL
                  <input
                    type="url"
                    value={form.coverUrl}
                    placeholder="https://..."
                    onChange={(event) =>
                      updateForm(
                        "coverUrl",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="ebook-form-full">
                  File URL
                  <input
                    type="url"
                    value={form.fileUrl}
                    placeholder="https://..."
                    onChange={(event) =>
                      updateForm(
                        "fileUrl",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="ebook-form-full">
                  Deskripsi
                  <textarea
                    rows={5}
                    maxLength={5000}
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div className="ebook-form-footer">
                <button
                  className="ebook-form-cancel"
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="ebook-form-submit"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingEbook
                      ? "Simpan Perubahan"
                      : "Tambah E-Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function EbookCard({
  ebook,
  currentUser,
  canModerate,
  deletingId,
  onEdit,
  onDelete,
}: {
  ebook: EBook;
  currentUser: CurrentUser | null;
  canModerate: boolean;
  deletingId: number | null;
  onEdit: (ebook: EBook) => void;
  onDelete: (ebook: EBook) => void;
}) {
  const isOwner =
    currentUser?.id === ebook.uploadedByUserId;

  const canEdit = isOwner;
  const canDelete =
    isOwner || canModerate;

  return (
    <article className="ebook-card">
      <div className="ebook-cover">
        <small>
          USEFECT E-BOOK
        </small>

        <strong>
          {ebook.title}
        </strong>

        <span>
          {ebook.category ??
            "Knowledge Collection"}
        </span>
      </div>

      <div className="ebook-card-body">
        <span className="ebook-license">
          {ebook.license ??
            "License belum ditentukan"}
        </span>

        <h3>
          {ebook.title}
        </h3>

        <p className="ebook-author">
          {ebook.author}
        </p>

        <div className="ebook-card-meta">
          <span>
            {ebook.publicationYear ??
              "Tahun tidak tersedia"}
          </span>

          <span>
            {ebook.language}
          </span>
        </div>

        <div className="ebook-card-actions">
          <button
            type="button"
            onClick={() => {
              window.location.href = `/ebook/${ebook.id}/baca`;
            }}
          >
            <BookOpen size={15} />
            Baca
          </button>

          {(ebook.accessType ===
            "DOWNLOAD" ||
            ebook.accessType ===
              "READ_AND_DOWNLOAD") &&
            ebook.fileUrl && (
              <a
                href={ebook.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={15} />
                Download
              </a>
            )}

          {canEdit && (
            <button
              type="button"
              className="ebook-icon-action"
              onClick={() =>
                onEdit(ebook)
              }
              title="Edit E-Book"
              aria-label="Edit E-Book"
            >
              <Pencil size={15} />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              className="ebook-icon-action danger"
              onClick={() =>
                onDelete(ebook)
              }
              disabled={
                deletingId === ebook.id
              }
              title="Hapus E-Book"
              aria-label="Hapus E-Book"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
