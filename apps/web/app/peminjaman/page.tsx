"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  History,
} from "lucide-react";

import { apiFetch } from "../lib/api";

type LoanStatus =
  | "PENDING"
  | "ACTIVE"
  | "OVERDUE"
  | "RETURNED"
  | "CANCELLED"
  | "REJECTED"
  | "LOST"
  | "DAMAGED";

type Loan = {
  id: number;
  borrowedAt: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  fineAmount: number | null;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
  bookCopy?: {
    id: number;
    barcode: string;
    status: string;
    book?: {
      id: number;
      title: string;
      isbn?: string;
      author?: string;
    } | null;
  } | null;
};

type Tab = "ALL" | "ACTIVE" | "OVERDUE" | "HISTORY";

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: LoanStatus) {
  switch (status) {
    case "PENDING":
      return "Menunggu Persetujuan";
    case "ACTIVE":
      return "Sedang Dipinjam";
    case "OVERDUE":
      return "Terlambat";
    case "RETURNED":
      return "Dikembalikan";
    case "CANCELLED":
      return "Dibatalkan";
    case "REJECTED":
      return "Ditolak";
    case "LOST":
      return "Hilang";
    case "DAMAGED":
      return "Rusak";
    default:
      return status;
  }
}

function isHistory(status: LoanStatus) {
  return ["RETURNED", "CANCELLED", "REJECTED", "LOST", "DAMAGED"].includes(
    status,
  );
}

function daysUntilDue(date: string | null) {
  if (!date) return null;

  const now = new Date();
  const due = new Date(date);

  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default function PeminjamanPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [error, setError] = useState("");

  const fetchLoans = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch("/loans?limit=100&sortBy=createdAt&order=desc");

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil data peminjaman",
        );
      }

      setLoans(result.data ?? []);
    } catch (error: any) {
      console.error("Gagal mengambil peminjaman:", error);
      setError(error?.message ?? "Gagal mengambil data peminjaman");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const statistics = useMemo(() => {
    const active = loans.filter((loan) => loan.status === "ACTIVE").length;
    const overdue = loans.filter((loan) => loan.status === "OVERDUE").length;
    const history = loans.filter((loan) => isHistory(loan.status)).length;

    const dueSoon = loans.filter(
      (loan) =>
        loan.status === "ACTIVE" &&
        loan.dueDate !== null,
    ).length;

    return {
      active,
      overdue,
      history,
      dueSoon,
    };
  }, [loans]);

  const filteredLoans = useMemo(() => {
    switch (activeTab) {
      case "ACTIVE":
        return loans.filter((loan) => loan.status === "ACTIVE");
      case "OVERDUE":
        return loans.filter((loan) => loan.status === "OVERDUE");
      case "HISTORY":
        return loans.filter((loan) => isHistory(loan.status));
      default:
        return loans;
    }
  }, [activeTab, loans]);

  const handleRenew = async (loan: Loan) => {
    if (renewingId !== null) return;

    const confirmed = window.confirm(
      `Perpanjang peminjaman "${loan.bookCopy?.book?.title ?? "buku ini"}" selama 7 hari?`,
    );

    if (!confirmed) return;

    try {
      setRenewingId(loan.id);

      const response = await apiFetch(`/loans/${loan.id}/renew`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal memperpanjang peminjaman",
        );
      }

      alert(
        result?.message ??
          "Peminjaman berhasil diperpanjang selama 7 hari.",
      );

      await fetchLoans(true);
    } catch (error: any) {
      console.error("Gagal memperpanjang peminjaman:", error);
      alert(error?.message ?? "Gagal memperpanjang peminjaman");
    } finally {
      setRenewingId(null);
    }
  };

  return (
    <main className="loan-page">
      <div className="loan-container">
        <button
          className="loan-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        <section className="loan-header">
          <div>
            <span className="loan-eyebrow">
              USEFECT DIGITAL LIBRARY
            </span>

            <h1>Peminjaman Saya</h1>

            <p>
              Kelola peminjaman aktif, pantau jatuh tempo,
              perpanjang buku, dan lihat riwayat Anda.
            </p>
          </div>

          <div className="loan-header-actions">
            <button
              className={`loan-refresh ${refreshing ? "is-loading" : ""}`}
              onClick={() => fetchLoans(true)}
              disabled={refreshing}
            >
              <RefreshCw size={16} />
              {refreshing ? "Memuat..." : "Refresh"}
            </button>

            <div className="loan-header-icon">
              <BookOpen size={30} />
            </div>
          </div>
        </section>

        <section className="loan-stats">
          <button
            className={`loan-stat ${activeTab === "ACTIVE" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ACTIVE")}
          >
            <BookOpen size={19} />
            <div>
              <span>SEDANG DIPINJAM</span>
              <strong>{statistics.active}</strong>
            </div>
          </button>

          <button
            className={`loan-stat ${statistics.dueSoon > 0 ? "is-warning" : ""}`}
            onClick={() => setActiveTab("ACTIVE")}
          >
            <Clock3 size={19} />
            <div>
              <span>JATUH TEMPO</span>
              <strong>{statistics.dueSoon}</strong>
            </div>
          </button>

          <button
            className={`loan-stat ${activeTab === "OVERDUE" ? "is-danger" : ""}`}
            onClick={() => setActiveTab("OVERDUE")}
          >
            <AlertCircle size={19} />
            <div>
              <span>TERLAMBAT</span>
              <strong>{statistics.overdue}</strong>
            </div>
          </button>

          <button
            className={`loan-stat ${activeTab === "HISTORY" ? "is-active" : ""}`}
            onClick={() => setActiveTab("HISTORY")}
          >
            <History size={19} />
            <div>
              <span>RIWAYAT</span>
              <strong>{statistics.history}</strong>
            </div>
          </button>
        </section>

        <section className="loan-tabs">
          <button
            className={activeTab === "ALL" ? "active" : ""}
            onClick={() => setActiveTab("ALL")}
          >
            Semua
          </button>

          <button
            className={activeTab === "ACTIVE" ? "active" : ""}
            onClick={() => setActiveTab("ACTIVE")}
          >
            Sedang Dipinjam
          </button>

          <button
            className={activeTab === "OVERDUE" ? "active" : ""}
            onClick={() => setActiveTab("OVERDUE")}
          >
            Terlambat
          </button>

          <button
            className={activeTab === "HISTORY" ? "active" : ""}
            onClick={() => setActiveTab("HISTORY")}
          >
            Riwayat
          </button>
        </section>

        {loading ? (
          <div className="loan-empty">
            <Clock3 size={38} />
            <h2>Memuat data peminjaman...</h2>
          </div>
        ) : error ? (
          <div className="loan-error">
            <AlertCircle size={22} />
            <span>{error}</span>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="loan-empty">
            <BookOpen size={38} />

            <h2>
              {activeTab === "HISTORY"
                ? "Belum ada riwayat"
                : activeTab === "OVERDUE"
                  ? "Tidak ada peminjaman terlambat"
                  : activeTab === "ACTIVE"
                    ? "Tidak ada peminjaman aktif"
                    : "Belum ada peminjaman"}
            </h2>

            <p>
              {activeTab === "ALL"
                ? "Ajukan buku melalui katalog untuk mulai meminjam."
                : "Data untuk kategori ini belum tersedia."}
            </p>
          </div>
        ) : (
          <section className="loan-list">
            {filteredLoans.map((loan) => {
              const days = daysUntilDue(loan.dueDate);
              const canRenew =
                loan.status === "ACTIVE" && renewingId !== loan.id;

              return (
                <article
                  className={`loan-card loan-card-${loan.status.toLowerCase()}`}
                  key={loan.id}
                >
                  <div className="loan-card-main">
                    <div className="loan-book-icon">
                      <BookOpen size={24} />
                    </div>

                    <div className="loan-book-info">
                      <span className="loan-label">PEMINJAMAN #{loan.id}</span>

                      <h2>
                        {loan.bookCopy?.book?.title ??
                          "Judul tidak tersedia"}
                      </h2>

                      <p>
                        {loan.bookCopy?.book?.author ??
                          "Penulis tidak tersedia"}
                      </p>

                      {loan.bookCopy?.barcode && (
                        <small>
                          Barcode: {loan.bookCopy.barcode}
                        </small>
                      )}
                    </div>

                    <div
                      className={`loan-status loan-status-${String(
                        loan.status,
                      ).toLowerCase()}`}
                    >
                      {getStatusLabel(loan.status)}
                    </div>

                    <button
                      className="loan-detail-button"
                      onClick={() => {
                        window.location.href = `/peminjaman/${loan.id}`;
                      }}
                    >
                      Detail
                    </button>
                  </div>

                  <div className="loan-card-details">
                    <div className="loan-detail">
                      <CalendarDays size={18} />

                      <div>
                        <span>Tanggal Pinjam</span>
                        <strong>{formatDate(loan.borrowedAt)}</strong>
                      </div>
                    </div>

                    <div
                      className={`loan-detail ${
                        loan.status === "OVERDUE" ||
                        (loan.status === "ACTIVE" &&
                          days !== null &&
                          days <= 3)
                          ? "is-due"
                          : ""
                      }`}
                    >
                      <Clock3 size={18} />

                      <div>
                        <span>Jatuh Tempo</span>
                        <strong>{formatDate(loan.dueDate)}</strong>

                        {loan.status === "ACTIVE" &&
                          days !== null && (
                            <small>
                              {days < 0
                                ? `${Math.abs(days)} hari terlambat`
                                : days === 0
                                  ? "Jatuh tempo hari ini"
                                  : `${days} hari tersisa`}
                            </small>
                          )}
                      </div>
                    </div>

                    <div className="loan-detail">
                      {loan.returnedAt ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}

                      <div>
                        <span>
                          {loan.returnedAt
                            ? "Dikembalikan"
                            : "Denda"}
                        </span>

                        <strong>
                          {loan.returnedAt
                            ? formatDate(loan.returnedAt)
                            : `Rp ${Number(
                                loan.fineAmount ?? 0,
                              ).toLocaleString("id-ID")}`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {loan.status === "ACTIVE" && (
                    <div className="loan-card-footer">
                      <div className="loan-footer-info">
                        <Clock3 size={16} />
                        <span>
                          {days !== null && days >= 0
                            ? `Peminjaman aktif · ${days} hari menuju jatuh tempo`
                            : "Peminjaman aktif"}
                        </span>
                      </div>

                      <button
                        className="loan-renew-button"
                        onClick={() => handleRenew(loan)}
                        disabled={!canRenew}
                      >
                        <RefreshCw
                          size={15}
                          className={
                            renewingId === loan.id
                              ? "loan-renew-spin"
                              : ""
                          }
                        />
                        {renewingId === loan.id
                          ? "Memperpanjang..."
                          : "Perpanjang 7 Hari"}
                      </button>
                    </div>
                  )}

                  {loan.status === "OVERDUE" && (
                    <div className="loan-card-footer overdue-footer">
                      <div className="loan-footer-info">
                        <AlertCircle size={16} />
                        <span>
                          Peminjaman melewati tanggal jatuh tempo.
                        </span>
                      </div>
                    </div>
                  )}

                  {loan.status === "RETURNED" && (
                    <div className="loan-card-footer returned-footer">
                      <div className="loan-footer-info">
                        <CheckCircle2 size={16} />
                        <span>
                          Buku telah dikembalikan ke perpustakaan.
                        </span>
                      </div>
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
