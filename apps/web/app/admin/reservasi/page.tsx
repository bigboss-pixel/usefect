"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Grid2X2,
  Heart,
  House,
  Info,
  LibraryBig,
  LogOut,
  Menu,
  Newspaper,
  RefreshCw,
  Search,
  Settings,
  User,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { apiFetch } from "../../lib/api";

type ReservationStatus =
  | "ALL"
  | "PENDING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";

type Reservation = {
  id: number;
  userId: number;
  bookId: number;
  status: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  pickedUpAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;

  user?: {
    id: number;
    fullName: string;
    email: string;
    username?: string | null;
  };

  book?: {
    id: number;
    title: string;
    isbn?: string | null;
    author?: string | null;
  };
};

const statusOptions: {
  value: ReservationStatus;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "Semua",
  },
  {
    value: "PENDING",
    label: "Menunggu",
  },
  {
    value: "READY_FOR_PICKUP",
    label: "Siap Diambil",
  },
  {
    value: "PICKED_UP",
    label: "Sudah Diambil",
  },
  {
    value: "CANCELLED",
    label: "Dibatalkan",
  },
  {
    value: "REJECTED",
    label: "Ditolak",
  },
  {
    value: "EXPIRED",
    label: "Kedaluwarsa",
  },
];

function getStatusLabel(status: string) {
  return (
    statusOptions.find(
      (item) => item.value === status,
    )?.label ?? status
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function AdminReservasiPage() {
  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [status, setStatus] =
    useState<ReservationStatus>("ALL");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [pickupReservation, setPickupReservation] =
    useState<Reservation | null>(null);

  const [userId, setUserId] =
    useState("");

  const [barcode, setBarcode] =
    useState("");

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      if (status !== "ALL") {
        params.set(
          "status",
          status,
        );
      }

      const response =
        await apiFetch(
          `/reservations?${params.toString()}`,
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil data reservasi",
        );
      }

      const data =
        Array.isArray(result)
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
      console.error(
        "Gagal mengambil reservasi:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil data reservasi",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [status]);

  const filteredReservations =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return reservations;
      }

      return reservations.filter(
        (reservation) =>
          String(
            reservation.id,
          ).includes(keyword) ||
          String(
            reservation.userId,
          ).includes(keyword) ||
          reservation.user?.fullName
            ?.toLowerCase()
            .includes(keyword) ||
          reservation.user?.email
            ?.toLowerCase()
            .includes(keyword) ||
          reservation.book?.title
            ?.toLowerCase()
            .includes(keyword),
      );
    }, [
      reservations,
      search,
    ]);

  const handleApprove = async (
    id: number,
  ) => {
    if (
      !window.confirm(
        "Setujui reservasi ini?",
      )
    ) {
      return;
    }

    try {
      setProcessingId(id);

      const response =
        await apiFetch(
          `/reservations/${id}/approve`,
          {
            method: "PATCH",
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menyetujui reservasi",
        );
      }

      alert(
        result?.message ??
          "Reservasi berhasil disetujui",
      );

      await fetchReservations();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal menyetujui reservasi",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (
    id: number,
  ) => {
    if (
      !window.confirm(
        "Tolak reservasi ini?",
      )
    ) {
      return;
    }

    try {
      setProcessingId(id);

      const response =
        await apiFetch(
          `/reservations/${id}/reject`,
          {
            method: "PATCH",
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menolak reservasi",
        );
      }

      alert(
        result?.message ??
          "Reservasi berhasil ditolak",
      );

      await fetchReservations();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal menolak reservasi",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openPickupModal = (
    reservation: Reservation,
  ) => {
    setPickupReservation(
      reservation,
    );

    setUserId(
      String(reservation.userId),
    );

    setBarcode("");
  };

  const closePickupModal = () => {
    setPickupReservation(null);
    setUserId("");
    setBarcode("");
  };

  const handlePickup = async () => {
    if (!pickupReservation) {
      return;
    }

    const parsedUserId =
      Number(userId);

    if (
      !Number.isInteger(
        parsedUserId,
      ) ||
      parsedUserId <= 0
    ) {
      alert(
        "KTM / User ID tidak valid.",
      );
      return;
    }

    if (!barcode.trim()) {
      alert(
        "Barcode buku wajib diisi.",
      );
      return;
    }

    try {
      setProcessingId(
        pickupReservation.id,
      );

      const response =
        await apiFetch(
          `/reservations/${pickupReservation.id}/pickup`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId:
                parsedUserId,
              barcode:
                barcode.trim(),
            }),
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal memproses pickup",
        );
      }

      alert(
        result?.message ??
          "Pickup berhasil diproses",
      );

      closePickupModal();

      await fetchReservations();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal memproses pickup",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount =
    reservations.filter(
      (item) =>
        item.status ===
        "PENDING",
    ).length;

  const readyCount =
    reservations.filter(
      (item) =>
        item.status ===
        "READY_FOR_PICKUP",
    ).length;

  const pickedUpCount =
    reservations.filter(
      (item) =>
        item.status ===
        "PICKED_UP",
    ).length;

  return (
   <main className="library-page admin-reservation-page">

      {/* ================= HEADER ================= */}

      <header className="top-header">

        <div className="brand-area">

          <div className="uma-logo">
            <span>UMA</span>
          </div>

          <div className="brand-divider" />

          <div>
            <div className="university-name">
              UNIVERSITAS
              <br />
              MEDAN AREA
            </div>
          </div>

          <div className="brand-divider second" />

          <div className="library-brand">
            <strong>
              Perpustakaan Digital
            </strong>

            <small>
              Knowledge Today, A Better Tomorrow
            </small>
          </div>

        </div>

        <nav className="desktop-nav">

          <a href="/">
            <House
              size={16}
              strokeWidth={2}
            />
            Beranda
          </a>

          <a href="/katalog">
            <Search
              size={16}
              strokeWidth={2}
            />
            Katalog
          </a>

          <a href="#">
            <Newspaper
              size={16}
              strokeWidth={2}
            />
            Jurnal
          </a>

          <a href="#">
            <BookOpen
              size={16}
              strokeWidth={2}
            />
            E-Book
          </a>

          <a
            className="active"
            href="/peminjaman"
          >
            <Grid2X2
              size={16}
              strokeWidth={2}
            />
            Layanan
          </a>

          <a href="#">
            <Info
              size={16}
              strokeWidth={2}
            />
            Tentang
          </a>

        </nav>

        <div className="header-actions">

          <button
            className="icon-button"
            aria-label="Cari"
          >
            <Search
              size={19}
              strokeWidth={2}
            />
          </button>

          <button
            className="icon-button notification"
            aria-label="Notifikasi"
          >
            <Bell
              size={19}
              strokeWidth={2}
            />
            <span />
          </button>

          <div className="profile-menu-wrapper">

            <button className="profile-mini">

              <div className="avatar">
                DH
              </div>

              <div className="profile-text">
                <strong>
                  Administrator
                </strong>

                <small>
                  Perpustakaan UMA
                </small>
              </div>

              <ChevronDown
                size={16}
              />

            </button>

          </div>

          <button
            className="mobile-menu"
            aria-label="Menu"
          >
            <Menu size={21} />
          </button>

        </div>

      </header>


      {/* ================= CONTENT ================= */}

      <section className="content-container">

        {/* PAGE INTRO */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >

          <div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              <LibraryBig size={16} />

              ADMINISTRASI PERPUSTAKAAN
            </div>

            <h1
              style={{
                margin: 0,
                color: "#172033",
                fontSize: "32px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Manajemen Reservasi
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#718096",
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              Kelola reservasi buku dan
              proses pengambilan menjadi
              peminjaman.
            </p>

          </div>

          <button
            className="admin-refresh-button"
            onClick={
            fetchReservations
            }
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding:
                "11px 16px",
              borderRadius: "12px",
              border:
                "1px solid rgba(37,99,235,.14)",
              background:
                "rgba(255,255,255,.8)",
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow:
                "0 8px 24px rgba(30,64,175,.08)",
            }}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </div>


        {/* ================= STATISTICS ================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >

          <div
            style={{
              padding: "20px",
              borderRadius: "20px",
              border:
                "1px solid rgba(37,99,235,.10)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,.96), rgba(239,246,255,.88))",
              boxShadow:
                "0 12px 32px rgba(30,64,175,.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <span
                style={{
                  color: "#718096",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                MENUNGGU
              </span>

              <Clock3
                size={19}
                color="#d97706"
              />
            </div>

            <strong
              style={{
                display:
                  "block",
                marginTop: "8px",
                color: "#172033",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {pendingCount}
            </strong>

            <span
              style={{
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              Menunggu persetujuan
            </span>
          </div>


          <div
            style={{
              padding: "20px",
              borderRadius: "20px",
              border:
                "1px solid rgba(16,185,129,.12)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,.96), rgba(236,253,245,.88))",
              boxShadow:
                "0 12px 32px rgba(16,185,129,.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <span
                style={{
                  color: "#718096",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                SIAP DIAMBIL
              </span>

              <CheckCircle2
                size={19}
                color="#059669"
              />
            </div>

            <strong
              style={{
                display:
                  "block",
                marginTop: "8px",
                color: "#172033",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {readyCount}
            </strong>

            <span
              style={{
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              Menunggu pickup
            </span>
          </div>


          <div
            style={{
              padding: "20px",
              borderRadius: "20px",
              border:
                "1px solid rgba(37,99,235,.10)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,.96), rgba(239,246,255,.88))",
              boxShadow:
                "0 12px 32px rgba(30,64,175,.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <span
                style={{
                  color: "#718096",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                SUDAH DIAMBIL
              </span>

              <BookOpen
                size={19}
                color="#2563eb"
              />
            </div>

            <strong
              style={{
                display:
                  "block",
                marginTop: "8px",
                color: "#172033",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {pickedUpCount}
            </strong>

            <span
              style={{
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              Berhasil menjadi peminjaman
            </span>
          </div>

        </div>


        {/* ================= FILTER ================= */}

        <section
          style={{
            padding: "16px",
            borderRadius: "20px",
            border:
              "1px solid rgba(15,23,42,.07)",
            background:
              "rgba(255,255,255,.82)",
            boxShadow:
              "0 10px 30px rgba(15,23,42,.05)",
            marginBottom: "20px",
            backdropFilter:
              "blur(16px)",
          }}
        >

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "14px",
            }}
          >

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
              }}
            >

              {statusOptions.map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    onClick={() =>
                      setStatus(
                        option.value,
                      )
                    }
                    style={{
                      border: "none",
                      borderRadius:
                        "10px",
                      padding:
                        "9px 13px",
                      background:
                        status ===
                        option.value
                          ? "#2563eb"
                          : "#f4f6fa",
                      color:
                        status ===
                        option.value
                          ? "#fff"
                          : "#667085",
                      fontSize:
                        "12px",
                      fontWeight: 700,
                      cursor:
                        "pointer",
                      boxShadow:
                        status ===
                        option.value
                          ? "0 7px 18px rgba(37,99,235,.20)"
                          : "none",
                    }}
                  >
                    {option.label}
                  </button>
                ),
              )}

            </div>


            <div
              style={{
                position:
                  "relative",
                width:
                  "min(100%, 340px)",
              }}
            >

              <Search
                size={16}
                style={{
                  position:
                    "absolute",
                  left: "13px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: "#98a2b3",
                }}
              />

              <input
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Cari reservasi, peminjam, buku..."
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius:
                    "11px",
                  background:
                    "#f8fafc",
                  padding:
                    "10px 13px 10px 38px",
                  outline: "none",
                  color: "#344054",
                  fontSize:
                    "12px",
                }}
              />

            </div>

          </div>

        </section>


        {/* ================= ERROR ================= */}

        {error && (
          <div
            style={{
              marginBottom:
                "20px",
              padding:
                "13px 16px",
              borderRadius:
                "14px",
              border:
                "1px solid #fecaca",
              background:
                "#fef2f2",
              color:
                "#b91c1c",
              fontSize:
                "13px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}


        {/* ================= RESERVATIONS ================= */}

        <section
          style={{
            display: "flex",
            flexDirection:
              "column",
            gap: "14px",
          }}
        >

          {loading ? (

            <div
              style={{
                padding:
                  "60px 20px",
                borderRadius:
                  "22px",
                background:
                  "rgba(255,255,255,.8)",
                border:
                  "1px solid rgba(15,23,42,.06)",
                textAlign:
                  "center",
                color:
                  "#98a2b3",
                fontSize:
                  "13px",
              }}
            >
              Memuat data reservasi...
            </div>

          ) : filteredReservations.length === 0 ? (

            <div
              style={{
                padding:
                  "70px 20px",
                borderRadius:
                  "22px",
                background:
                  "rgba(255,255,255,.82)",
                border:
                  "1px dashed #d8dee9",
                textAlign:
                  "center",
              }}
            >
              <BookOpen
                size={40}
                color="#cbd5e1"
                style={{
                  margin:
                    "0 auto",
                }}
              />

              <h2
                style={{
                  margin:
                    "15px 0 5px",
                  color:
                    "#344054",
                  fontSize:
                    "17px",
                  fontWeight:
                    800,
                }}
              >
                Belum ada reservasi
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#98a2b3",
                  fontSize:
                    "13px",
                }}
              >
                Tidak ada data yang
                sesuai dengan filter.
              </p>
            </div>

          ) : (

            filteredReservations.map(
              (reservation) => {

                const isProcessing =
                  processingId ===
                  reservation.id;

                let statusBackground =
                  "#f4f6fa";

                let statusColor =
                  "#667085";

                if (
                  reservation.status ===
                  "READY_FOR_PICKUP"
                ) {
                  statusBackground =
                    "#ecfdf3";
                  statusColor =
                    "#047857";
                }

                if (
                  reservation.status ===
                  "PICKED_UP"
                ) {
                  statusBackground =
                    "#eff6ff";
                  statusColor =
                    "#2563eb";
                }

                if (
                  reservation.status ===
                  "PENDING"
                ) {
                  statusBackground =
                    "#fffbeb";
                  statusColor =
                    "#b45309";
                }

                if (
                  reservation.status ===
                    "CANCELLED" ||
                  reservation.status ===
                    "REJECTED" ||
                  reservation.status ===
                    "EXPIRED"
                ) {
                  statusBackground =
                    "#fef2f2";
                  statusColor =
                    "#b91c1c";
                }

                return (
                  <article
                    key={
                      reservation.id
                    }
                    style={{
                      position:
                        "relative",
                      overflow:
                        "hidden",
                      borderRadius:
                        "22px",
                      border:
                        "1px solid rgba(15,23,42,.07)",
                      background:
                        "rgba(255,255,255,.88)",
                      boxShadow:
                        "0 12px 32px rgba(15,23,42,.055)",
                      padding:
                        "22px",
                      backdropFilter:
                        "blur(14px)",
                    }}
                  >

                    <div
                      style={{
                        position:
                          "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        background:
                          reservation.status ===
                          "READY_FOR_PICKUP"
                            ? "#10b981"
                            : reservation.status ===
                              "PENDING"
                            ? "#f59e0b"
                            : "#2563eb",
                      }}
                    />

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: "22px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <div
                        style={{
                          minWidth:
                            "260px",
                          flex: 1,
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            alignItems:
                              "center",
                            gap: "7px",
                          }}
                        >

                          <span
                            style={{
                              borderRadius:
                                "8px",
                              padding:
                                "6px 9px",
                              background:
                                "#f4f6f8",
                              color:
                                "#667085",
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              letterSpacing:
                                ".04em",
                            }}
                          >
                            RESERVASI #
                            {
                              reservation.id
                            }
                          </span>

                          <span
                            style={{
                              borderRadius:
                                "8px",
                              padding:
                                "6px 9px",
                              background:
                                statusBackground,
                              color:
                                statusColor,
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                            }}
                          >
                            {getStatusLabel(
                              reservation.status,
                            )}
                          </span>

                        </div>


                        <div
                          style={{
                            display:
                              "flex",
                            gap: "13px",
                            marginTop:
                              "17px",
                          }}
                        >

                          <div
                            style={{
                              width:
                                "44px",
                              height:
                                "56px",
                              flexShrink: 0,
                              borderRadius:
                                "10px",
                              background:
                                "linear-gradient(145deg,#2563eb,#1d4ed8)",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              color:
                                "#fff",
                              boxShadow:
                                "0 8px 20px rgba(37,99,235,.18)",
                            }}
                          >
                            <BookOpen
                              size={21}
                              strokeWidth={
                                1.7
                              }
                            />
                          </div>

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >

                            <h2
                              style={{
                                margin:
                                  0,
                                color:
                                  "#1d2939",
                                fontSize:
                                  "17px",
                                fontWeight:
                                  800,
                                lineHeight:
                                  1.4,
                              }}
                            >
                              {reservation
                                .book
                                ?.title ??
                                `Buku #${reservation.bookId}`}
                            </h2>

                            <p
                              style={{
                                margin:
                                  "4px 0 0",
                                color:
                                  "#667085",
                                fontSize:
                                  "12px",
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {reservation
                                .book
                                ?.author ??
                                "Penulis tidak tersedia"}
                            </p>

                            {reservation
                              .book
                              ?.isbn && (
                              <p
                                style={{
                                  margin:
                                    "4px 0 0",
                                  color:
                                    "#98a2b3",
                                  fontSize:
                                    "10px",
                                }}
                              >
                                ISBN:{" "}
                                {
                                  reservation
                                    .book
                                    .isbn
                                }
                              </p>
                            )}

                          </div>

                        </div>


                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(2,minmax(0,1fr))",
                            gap: "10px",
                            marginTop:
                              "18px",
                          }}
                        >

                          <div
                            style={{
                              padding:
                                "13px",
                              borderRadius:
                                "13px",
                              background:
                                "#f8fafc",
                            }}
                          >

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                                color:
                                  "#98a2b3",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  800,
                                letterSpacing:
                                  ".05em",
                              }}
                            >
                              <User
                                size={13}
                              />

                              PEMINJAM
                            </div>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "5px",
                                color:
                                  "#344054",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {reservation
                                .user
                                ?.fullName ??
                                `User #${reservation.userId}`}
                            </strong>

                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "2px",
                                color:
                                  "#98a2b3",
                                fontSize:
                                  "10px",
                              }}
                            >
                              {reservation
                                .user
                                ?.email ??
                                "-"}
                            </span>

                          </div>


                          <div
                            style={{
                              padding:
                                "13px",
                              borderRadius:
                                "13px",
                              background:
                                "#f8fafc",
                            }}
                          >

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                                color:
                                  "#98a2b3",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  800,
                                letterSpacing:
                                  ".05em",
                              }}
                            >
                              <Clock3
                                size={13}
                              />

                              BERLAKU SAMPAI
                            </div>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "5px",
                                color:
                                  "#344054",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {formatDate(
                                reservation.expiresAt,
                              )}
                            </strong>

                          </div>

                        </div>

                        <p
                          style={{
                            margin:
                              "13px 0 0",
                            color:
                              "#b0b8c4",
                            fontSize:
                              "10px",
                          }}
                        >
                          Dibuat{" "}
                          {formatDate(
                            reservation.createdAt,
                          )}
                        </p>

                      </div>


                      {/* ACTIONS */}

                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: "8px",
                          width:
                            "170px",
                          flexShrink:
                            0,
                        }}
                      >

                        {reservation.status ===
                          "PENDING" && (
                          <>
                            <button
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleApprove(
                                  reservation.id,
                                )
                              }
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                gap: "7px",
                                border:
                                  "none",
                                borderRadius:
                                  "11px",
                                padding:
                                  "11px 14px",
                                background:
                                  "#2563eb",
                                color:
                                  "#fff",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  800,
                                cursor:
                                  "pointer",
                                boxShadow:
                                  "0 7px 18px rgba(37,99,235,.18)",
                                opacity:
                                  isProcessing
                                    ? 0.5
                                    : 1,
                              }}
                            >
                              <CheckCircle2
                                size={15}
                              />

                              Setujui
                            </button>

                            <button
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleReject(
                                  reservation.id,
                                )
                              }
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                gap: "7px",
                                border:
                                  "1px solid #fecaca",
                                borderRadius:
                                  "11px",
                                padding:
                                  "11px 14px",
                                background:
                                  "#fff7f7",
                                color:
                                  "#b91c1c",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  800,
                                cursor:
                                  "pointer",
                                opacity:
                                  isProcessing
                                    ? 0.5
                                    : 1,
                              }}
                            >
                              <XCircle
                                size={15}
                              />

                              Tolak
                            </button>
                          </>
                        )}


                        {reservation.status ===
                          "READY_FOR_PICKUP" && (
                          <button
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              openPickupModal(
                                reservation,
                              )
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              gap: "7px",
                              border:
                                "none",
                              borderRadius:
                                "11px",
                              padding:
                                "12px 14px",
                              background:
                                "linear-gradient(135deg,#2563eb,#1d4ed8)",
                              color:
                                "#fff",
                              fontSize:
                                "12px",
                              fontWeight:
                                800,
                              cursor:
                                "pointer",
                              boxShadow:
                                "0 8px 20px rgba(37,99,235,.20)",
                            }}
                          >
                            <CheckCircle2
                              size={15}
                            />

                            Proses Pickup

                            <ArrowRight
                              size={14}
                            />
                          </button>
                        )}

                        {reservation.status ===
                          "PICKED_UP" && (
                          <div
                            style={{
                              padding:
                                "12px",
                              borderRadius:
                                "11px",
                              background:
                                "#eff6ff",
                              color:
                                "#2563eb",
                              fontSize:
                                "11px",
                              fontWeight:
                                700,
                              textAlign:
                                "center",
                            }}
                          >
                            ✓ Peminjaman aktif
                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                );
              },
            )
          )}

        </section>

      </section>


      {/* ================= PICKUP MODAL ================= */}

      {pickupReservation && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex: 100,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            background:
              "rgba(15,23,42,.48)",
            backdropFilter:
              "blur(10px)",
          }}
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePickupModal();
            }
          }}
        >

          <div
            style={{
              width:
                "min(100%, 520px)",
              borderRadius:
                "26px",
              border:
                "1px solid rgba(255,255,255,.55)",
              background:
                "rgba(255,255,255,.96)",
              boxShadow:
                "0 30px 80px rgba(15,23,42,.22)",
              overflow:
                "hidden",
            }}
          >

            <div
              style={{
                padding:
                  "20px 22px",
                background:
                  "linear-gradient(135deg,#eff6ff,#ffffff)",
                borderBottom:
                  "1px solid #edf1f5",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
              }}
            >

              <div>

                <div
                  style={{
                    color:
                      "#2563eb",
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                    letterSpacing:
                      ".08em",
                  }}
                >
                  RESERVATION PICKUP
                </div>

                <h2
                  style={{
                    margin:
                      "4px 0 0",
                    color:
                      "#172033",
                    fontSize:
                      "20px",
                    fontWeight:
                      800,
                  }}
                >
                  Proses Pengambilan
                </h2>

              </div>

              <button
                onClick={
                  closePickupModal
                }
                style={{
                  width:
                    "34px",
                  height:
                    "34px",
                  border: "none",
                  borderRadius:
                    "10px",
                  background:
                    "#f1f5f9",
                  color:
                    "#64748b",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor:
                    "pointer",
                }}
              >
                <X size={18} />
              </button>

            </div>


            <div
              style={{
                padding:
                  "22px",
              }}
            >

              <div
                style={{
                  padding:
                    "16px",
                  borderRadius:
                    "16px",
                  background:
                    "linear-gradient(135deg,#eff6ff,#f8fbff)",
                  border:
                    "1px solid #dbeafe",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",
                    gap: "13px",
                  }}
                >

                  <div
                    style={{
                      width:
                        "46px",
                      height:
                        "58px",
                      borderRadius:
                        "10px",
                      background:
                        "linear-gradient(145deg,#2563eb,#1d4ed8)",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      color:
                        "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen
                      size={21}
                    />
                  </div>

                  <div>
                    <span
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "10px",
                        fontWeight:
                          700,
                      }}
                    >
                      RESERVASI #
                      {
                        pickupReservation.id
                      }
                    </span>

                    <h3
                      style={{
                        margin:
                          "4px 0 0",
                        color:
                          "#172033",
                        fontSize:
                          "15px",
                        fontWeight:
                          800,
                        lineHeight:
                          1.4,
                      }}
                    >
                      {pickupReservation
                        .book
                        ?.title ??
                        `Buku #${pickupReservation.bookId}`}
                    </h3>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "11px",
                      }}
                    >
                      Pemilik:{" "}
                      {pickupReservation
                        .user
                        ?.fullName ??
                        `User #${pickupReservation.userId}`}
                    </p>
                  </div>

                </div>

              </div>


              <div
                style={{
                  marginTop:
                    "20px",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "15px",
                }}
              >

                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      color:
                        "#344054",
                      fontSize:
                        "12px",
                      fontWeight:
                        800,
                    }}
                  >
                    KTM / USER ID
                  </span>

                  <input
                    value={userId}
                    onChange={(
                      event,
                    ) =>
                      setUserId(
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    inputMode="numeric"
                    placeholder="Scan KTM atau masukkan User ID"
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #dfe5ec",
                      borderRadius:
                        "12px",
                      padding:
                        "12px 14px",
                      background:
                        "#f8fafc",
                      outline:
                        "none",
                      color:
                        "#344054",
                      fontSize:
                        "13px",
                    }}
                  />
                </label>


                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      color:
                        "#344054",
                      fontSize:
                        "12px",
                      fontWeight:
                        800,
                    }}
                  >
                    BARCODE BUKU
                  </span>

                  <input
                    value={barcode}
                    onChange={(
                      event,
                    ) =>
                      setBarcode(
                        event.target.value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        handlePickup();
                      }
                    }}
                    placeholder="Scan barcode buku"
                    autoFocus
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #dfe5ec",
                      borderRadius:
                        "12px",
                      padding:
                        "12px 14px",
                      background:
                        "#f8fafc",
                      outline:
                        "none",
                      color:
                        "#344054",
                      fontSize:
                        "13px",
                      fontWeight:
                        600,
                    }}
                  />
                </label>

              </div>


              <div
                style={{
                  marginTop:
                    "22px",
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1.4fr",
                  gap: "9px",
                }}
              >

                <button
                  onClick={
                    closePickupModal
                  }
                  style={{
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "12px",
                    padding:
                      "12px",
                    background:
                      "#fff",
                    color:
                      "#64748b",
                    fontSize:
                      "12px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                  }}
                >
                  Batal
                </button>

                <button
                  disabled={
                    processingId ===
                    pickupReservation.id
                  }
                  onClick={
                    handlePickup
                  }
                  style={{
                    border:
                      "none",
                    borderRadius:
                      "12px",
                    padding:
                      "12px",
                    background:
                      "linear-gradient(135deg,#2563eb,#1d4ed8)",
                    color:
                      "#fff",
                    fontSize:
                      "12px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                    boxShadow:
                      "0 8px 20px rgba(37,99,235,.20)",
                    opacity:
                      processingId ===
                      pickupReservation.id
                        ? 0.6
                        : 1,
                  }}
                >
                  {processingId ===
                  pickupReservation.id
                    ? "Memproses..."
                    : "Konfirmasi Pickup"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}