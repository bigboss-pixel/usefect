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

import { apiFetch } from "../../../../../../lib/api";

type BookCopy = {
  id: number;
  barcode: string;
  status: string;
  shelfLocation?: string | null;
  bookId?: number;
  book?: {
    id: number;
    title: string;
    isbn: string;
    author: string;
  } | null;
};

export default function EditEksemplarPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;
  const copyId = params.copyId as string;

  const [copy, setCopy] = useState<BookCopy | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [barcode, setBarcode] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");

  const fetchCopy = async () => {
    try {
      setLoadingCopy(true);
      setError("");

      const response = await apiFetch(
        `/book-copies/${copyId}`,
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil informasi eksemplar",
        );
      }

      setCopy(result);
      setBarcode(result.barcode ?? "");
      setShelfLocation(result.shelfLocation ?? "");
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
      setLoadingCopy(false);
    }
  };

  useEffect(() => {
    if (copyId) {
      fetchCopy();
    }
  }, [copyId]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!barcode.trim()) {
      setError("Barcode eksemplar wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(
        `/book-copies/${copyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            barcode: barcode.trim(),
            shelfLocation:
              shelfLocation.trim() || null,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal memperbarui eksemplar",
        );
      }

      alert(
        result?.message ??
          "Eksemplar berhasil diperbarui",
      );

      router.push(`/admin/buku/${id}`);
    } catch (error: any) {
      console.error(
        "Gagal memperbarui eksemplar:",
        error,
      );

      setError(
        error?.message ??
          "Gagal memperbarui eksemplar",
      );
    } finally {
      setLoading(false);
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

  if (loadingCopy) {
    return (
      <main className="admin-book-copy-form-page">
        <div className="admin-book-copy-form-container">
          <div className="admin-book-copy-form-state">
            <RefreshCw
              size={30}
              className="admin-book-spin"
            />

            <p>
              Memuat informasi eksemplar...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!copy) {
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

          <div className="admin-book-copy-form-state">
            <BookOpen size={34} />

            <h2>Eksemplar tidak ditemukan</h2>

            <p>
              {error ||
                "Informasi eksemplar tidak tersedia."}
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

            <h1>Edit Eksemplar</h1>

            <p>
              Perbarui informasi eksemplar fisik
              koleksi buku USEFECT.
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
              BUKU DARI EKSEMPLAR INI
            </span>

            <h2>
              {copy.book?.title ??
                "Informasi buku tidak tersedia"}
            </h2>

            <p>
              ISBN: {copy.book?.isbn ?? "-"}
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

              <div className="admin-book-copy-form-field">
                <label htmlFor="barcode">
                  Barcode Eksemplar<span>*</span>
                </label>

                <div className="admin-book-copy-form-input-wrapper">
                  <Barcode size={17} />

                  <input
                    id="barcode"
                    type="text"
                    value={barcode}
                    onChange={(event) =>
                      setBarcode(event.target.value)
                    }
                    placeholder="Contoh: UMA-BOOK-0001"
                    autoComplete="off"
                  />
                </div>

                <small>
                  Barcode harus unik untuk setiap
                  eksemplar.
                </small>
              </div>

              <div className="admin-book-copy-form-field">
                <label htmlFor="shelfLocation">
                  Lokasi Rak
                </label>

                <div className="admin-book-copy-form-input-wrapper">
                  <MapPin size={17} />

                  <input
                    id="shelfLocation"
                    type="text"
                    value={shelfLocation}
                    onChange={(event) =>
                      setShelfLocation(
                        event.target.value,
                      )
                    }
                    placeholder="Contoh: Rak A-01"
                    autoComplete="off"
                  />
                </div>

                <small>
                  Perbarui lokasi fisik eksemplar
                  di perpustakaan.
                </small>
              </div>

            </div>
          </div>

          {/* STATUS */}
          <div className="admin-book-copy-form-status">
            <div>
              <span>Status Saat Ini</span>

              <strong>
                {getStatusLabel(copy.status)}
              </strong>
            </div>

            <p>
              Status eksemplar tidak diubah melalui
              form ini.
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
                router.push(`/admin/buku/${id}`)
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
                ? "Menyimpan..."
                : "Simpan Perubahan"}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}