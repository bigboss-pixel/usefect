"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type ReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";

type Reservation = {
  id: number;
  userId: number;
  bookId: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  approvedAt?: string | null;
  pickedUpAt?: string | null;
  book?: {
    id: number;
    title: string;
    isbn?: string;
    author?: string;
  } | null;
};

const statusConfig: Record<
  ReservationStatus,
  {
    label: string;
    description: string;
  }
> = {
  PENDING: {
    label: "Menunggu",
    description: "Menunggu persetujuan perpustakaan",
  },
  APPROVED: {
    label: "Disetujui",
    description: "Reservasi telah disetujui",
  },
  READY_FOR_PICKUP: {
    label: "Siap Diambil",
    description: "Buku siap diambil di perpustakaan",
  },
  PICKED_UP: {
    label: "Sudah Diambil",
    description: "Reservasi sudah menjadi peminjaman",
  },
  CANCELLED: {
    label: "Dibatalkan",
    description: "Reservasi dibatalkan",
  },
  REJECTED: {
    label: "Ditolak",
    description: "Reservasi ditolak perpustakaan",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    description: "Masa berlaku reservasi telah berakhir",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function canCancel(status: ReservationStatus) {
  return (
    status === "PENDING" ||
    status === "APPROVED" ||
    status === "READY_FOR_PICKUP"
  );
}

export default function ReservasiPage() {
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");

  const fetchReservations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch("/reservations");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil data reservasi",
        );
      }

      const data: Reservation[] = Array.isArray(result)
        ? result
        : result?.data ?? [];

      setReservations(
        [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
      );
    } catch (error: any) {
      console.error("Gagal mengambil reservasi:", error);

      setError(
        error?.message ?? "Gagal mengambil data reservasi",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const statistics = useMemo(
    () => ({
      pending: reservations.filter(
        (item) => item.status === "PENDING",
      ).length,

      ready: reservations.filter(
        (item) =>
          item.status === "READY_FOR_PICKUP" ||
          item.status === "APPROVED",
      ).length,

      pickedUp: reservations.filter(
        (item) => item.status === "PICKED_UP",
      ).length,
    }),
    [reservations],
  );

  const handleCancel = async (reservation: Reservation) => {
    const confirmed = window.confirm(
      `Batalkan reservasi buku "${
        reservation.book?.title ?? `Buku #${reservation.bookId}`
      }"?`,
    );

    if (!confirmed) return;

    try {
      setCancellingId(reservation.id);

      const response = await apiFetch(
        `/reservations/${reservation.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal membatalkan reservasi",
        );
      }

      alert(
        result?.message ?? "Reservasi berhasil dibatalkan",
      );

      await fetchReservations(true);
    } catch (error: any) {
      console.error("Gagal membatalkan reservasi:", error);

      alert(
        error?.message ?? "Gagal membatalkan reservasi",
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="library-page reservation-page">
      <header className="top-header">
        <div className="brand-area">
          <a href="/" className="uma-logo">
            UMA
          </a>

          <div className="brand-divider" />

          <div className="library-brand">
            <strong>Perpustakaan Digital</strong>
            <small>Knowledge Today, A Better Tomorrow</small>
          </div>
        </div>

        <nav className="desktop-nav">
          <a href="/">Beranda</a>
          <a href="/katalog">Katalog</a>
          <a href="/peminjaman">Peminjaman</a>
          <a href="/reservasi" className="active">
            Reservasi
          </a>
        </nav>

        <div className="header-actions">
          <a
            href="/reservasi"
            className="profile-mini"
            aria-label="Reservasi Saya"
          >
            <div className="avatar">RS</div>
          </a>
        </div>
      </header>

      <div className="content-container">
        <section className="reservation-header">
          <div className="reservation-eyebrow">
            <BookOpen size={15} />
            RESERVASI SAYA
          </div>

          <div className="reservation-heading">
            <div>
              <h1 className="reservation-title">
                Reservasi Saya
              </h1>

              <p className="reservation-subtitle">
                Pantau pengajuan reservasi buku Anda.
              </p>
            </div>

            <button
              className={`reservation-refresh${
                refreshing ? " spinning" : ""
              }`}
              onClick={() => fetchReservations(true)}
              disabled={refreshing}
            >
              <RefreshCw size={16} />

              {refreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="reservation-stats">
          <div className="student-card reservation-stat">
            <Clock3
              className="reservation-stat-icon"
              color="#d97706"
            />

            <div className="reservation-stat-content">
              <span className="reservation-stat-label">
                MENUNGGU
              </span>

              <strong className="reservation-stat-number">
                {statistics.pending}
              </strong>

              <small className="reservation-stat-description">
                Menunggu persetujuan
              </small>
            </div>
          </div>

          <div className="student-card reservation-stat">
            <CheckCircle2
              className="reservation-stat-icon"
              color="#0f766e"
            />

            <div className="reservation-stat-content">
              <span className="reservation-stat-label">
                SIAP DIAMBIL
              </span>

              <strong className="reservation-stat-number">
                {statistics.ready}
              </strong>

              <small className="reservation-stat-description">
                Menunggu kedatangan Anda
              </small>
            </div>
          </div>

          <div className="student-card reservation-stat">
            <BookOpen
              className="reservation-stat-icon"
              color="#2563eb"
            />

            <div className="reservation-stat-content">
              <span className="reservation-stat-label">
                SUDAH DIAMBIL
              </span>

              <strong className="reservation-stat-number">
                {statistics.pickedUp}
              </strong>

              <small className="reservation-stat-description">
                Sudah menjadi peminjaman
              </small>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="reservation-empty">
            <Clock3 size={40} color="#94a3b8" />

            <h2>Memuat reservasi...</h2>
          </div>
        ) : error ? (
          <div className="reservation-error">
            {error}
          </div>
        ) : reservations.length === 0 ? (
          <div className="reservation-empty">
            <BookOpen size={42} color="#94a3b8" />

            <h2>Belum ada reservasi</h2>

            <p>
              Ajukan peminjaman melalui katalog buku.
            </p>
          </div>
        ) : (
          <section className="reservation-list">
            {reservations.map((reservation) => {
              const config =
                statusConfig[reservation.status];

              const cancelling =
                cancellingId === reservation.id;

              return (
                <article
                  key={reservation.id}
                  className={`reservation-card status-${reservation.status.toLowerCase()}`}
                >
                  <div className="reservation-card-inner">
                    <div className="reservation-book">
                      <div className="reservation-book-icon">
                        <BookOpen size={25} />
                      </div>

                      <div className="reservation-book-info">
                        <div className="reservation-meta-top">
                          <span className="reservation-number">
                            RESERVASI #{reservation.id}
                          </span>

                          <span className="reservation-status">
                            {config.label}
                          </span>
                        </div>

                        <h2 className="reservation-book-title">
                          {reservation.book?.title ??
                            `Buku #${reservation.bookId}`}
                        </h2>

                        <p className="reservation-book-author">
                          {reservation.book?.author ??
                            "Penulis tidak tersedia"}
                        </p>
                      </div>
                    </div>

                    {canCancel(reservation.status) && (
                      <button
                        className="reservation-cancel"
                        onClick={() =>
                          handleCancel(reservation)
                        }
                        disabled={cancelling}
                      >
                        <XCircle size={15} />

                        {cancelling
                          ? "Membatalkan..."
                          : "Batalkan"}
                      </button>
                    )}
                  </div>

                  <div className="reservation-details">
                    <div>
                      <span className="reservation-detail-label">
                        DIAJUKAN
                      </span>

                      <strong className="reservation-detail-value">
                        {formatDate(
                          reservation.createdAt,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="reservation-detail-label">
                        BERLAKU SAMPAI
                      </span>

                      <strong className="reservation-detail-value">
                        {formatDate(
                          reservation.expiresAt,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="reservation-detail-label">
                        STATUS
                      </span>

                      <strong className="reservation-detail-value">
                        {config.description}
                      </strong>
                    </div>
                  </div>

                  {reservation.status ===
                    "READY_FOR_PICKUP" && (
                    <div className="reservation-ready">
                      <MapPin size={16} />

                      Silakan datang ke perpustakaan
                      dan ambil buku sesuai lokasi
                      rak.
                    </div>
                  )}

                  {reservation.status ===
                    "PICKED_UP" && (
                    <div className="reservation-ready">
                      <CheckCircle2 size={16} />

                      Reservasi sudah menjadi
                      peminjaman aktif.
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
