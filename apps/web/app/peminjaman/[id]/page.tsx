"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  AlertCircle,
  User,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "../../lib/api";

export default function PeminjamanDetailPage() {
  const params = useParams();
  const id = params.id;

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const response = await apiFetch(`/loans/${id}`);

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil detail peminjaman",
          );
        }

        const result = await response.json();

        setLoan(result.data ?? result);
      } catch (error) {
        console.error(
          "Gagal mengambil detail peminjaman:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLoan();
    }
  }, [id]);

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );
  };

  const getStatusLabel = (status: string) => {
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
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <main className="loan-detail-page">
        <div className="loan-detail-container">
          <div className="loan-loading">
            Memuat detail peminjaman...
          </div>
        </div>
      </main>
    );
  }

  if (!loan) {
    return (
      <main className="loan-detail-page">
        <div className="loan-detail-container">
          <button
            className="loan-back"
            onClick={() =>
              (window.location.href = "/peminjaman")
            }
          >
            <ArrowLeft size={18} />
            Kembali
          </button>

          <div className="loan-empty">
            <AlertCircle size={38} />
            <h2>Peminjaman tidak ditemukan</h2>
            <p>
              Data peminjaman tidak dapat ditemukan.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="loan-detail-page">
      <div className="loan-detail-container">
        <button
          className="loan-back"
          onClick={() =>
            (window.location.href = "/peminjaman")
          }
        >
          <ArrowLeft size={18} />
          Kembali ke Peminjaman
        </button>

        <section className="loan-detail-header">
          <div>
            <span className="loan-eyebrow">
              DETAIL PEMINJAMAN
            </span>

            <h1>
              {loan.bookCopy?.book?.title ??
                "Judul tidak tersedia"}
            </h1>

            <p>
              Informasi lengkap mengenai peminjaman
              buku Anda.
            </p>
          </div>

          <div className="loan-detail-status">
            {getStatusLabel(loan.status)}
          </div>
        </section>

       <div className="loan-action-group">
  {loan.status === "PENDING" && (
    <button
      className="loan-action-button loan-action-cancel"
      onClick={async () => {
        const confirmed = window.confirm(
          "Apakah Anda yakin ingin membatalkan peminjaman ini?",
        );

        if (!confirmed) return;

        try {
          const response = await apiFetch(
            `/loans/${loan.id}/cancel`,
            {
              method: "PATCH",
            },
          );

          if (!response.ok) {
            const result = await response
              .json()
              .catch(() => null);

            throw new Error(
              result?.message ??
                "Gagal membatalkan peminjaman",
            );
          }

          const result = await response.json();

          setLoan((current: any) => ({
            ...current,
            status: "CANCELLED",
          }));

          alert(
            result?.message ??
              "Peminjaman berhasil dibatalkan",
          );
        } catch (error: any) {
          console.error(
            "Gagal membatalkan peminjaman:",
            error,
          );

          alert(
            error?.message ??
              "Gagal membatalkan peminjaman",
          );
        }
      }}
    >
      Batalkan Peminjaman
    </button>
  )}

  {loan.status === "ACTIVE" && (
    <button
      className="loan-action-button loan-action-renew"
      onClick={async () => {
        const confirmed = window.confirm(
          "Apakah Anda yakin ingin memperpanjang peminjaman ini selama 7 hari?",
        );

        if (!confirmed) return;

        try {
          const response = await apiFetch(
            `/loans/${loan.id}/renew`,
            {
              method: "PATCH",
            },
          );

if (!response.ok) {
  const result = await response
    .json()
    .catch(() => null);

  alert(
    result?.message ??
      "Gagal memperpanjang peminjaman",
  );

  return;
}

          const result = await response.json();

          setLoan((current: any) => ({
            ...current,
            dueDate:
              result?.loan?.dueDate ??
              current.dueDate,
            renewalCount:
              result?.loan?.renewalCount ??
              current.renewalCount,
            status:
              result?.loan?.status ??
              current.status,
          }));

          alert(
            result?.message ??
              "Peminjaman berhasil diperpanjang",
          );
        } catch (error: any) {
          console.error(
            "Gagal memperpanjang peminjaman:",
            error,
          );

          alert(
            error?.message ??
              "Gagal memperpanjang peminjaman",
          );
        }
      }}
    >
      <RefreshCw size={17} />
      Perpanjang Peminjaman
    </button>
  )}

  {(loan.status === "ACTIVE" ||
    loan.status === "OVERDUE") && (
    <button
      className="loan-action-button loan-action-return"
      disabled={
        loan.returnRequestStatus === "REQUESTED"
      }
      onClick={async () => {
        const confirmed = window.confirm(
          "Ajukan pengembalian buku ini? Buku belum dianggap dikembalikan sampai diserahkan dan diproses oleh petugas perpustakaan.",
        );

        if (!confirmed) return;

        try {
          const response = await apiFetch(
            `/loans/${loan.id}/return-request`,
            {
              method: "POST",
            },
          );

          const result = await response
            .json()
            .catch(() => null);

          if (!response.ok) {
            throw new Error(
              result?.message ??
                "Gagal mengajukan pengembalian",
            );
          }

          setLoan((current: any) => ({
            ...current,
            returnRequestStatus:
              "REQUESTED",
            returnRequestedAt:
              result?.loan?.returnRequestedAt ??
              new Date().toISOString(),
          }));

          alert(
            result?.message ??
              "Pengajuan pengembalian berhasil dibuat. Silakan membawa buku ke perpustakaan pada jam operasional.",
          );
        } catch (error: any) {
          console.error(
            "Gagal mengajukan pengembalian:",
            error,
          );

          alert(
            error?.message ??
              "Gagal mengajukan pengembalian",
          );
        }
      }}
    >
      {loan.returnRequestStatus === "REQUESTED"
        ? "Pengembalian Diajukan"
        : "Ajukan Pengembalian"}
    </button>
  )}
</div>

        <section className="loan-detail-grid">
          <article className="loan-detail-book-card">
            <div className="loan-detail-book-icon">
              <BookOpen size={42} />
            </div>

            <span className="loan-label">BUKU</span>

            <h2>
              {loan.bookCopy?.book?.title ??
                "Judul tidak tersedia"}
            </h2>

            <p>
              {loan.bookCopy?.book?.author ??
                "Penulis tidak tersedia"}
            </p>

            {loan.bookCopy?.barcode && (
              <div className="loan-barcode">
                Barcode: {loan.bookCopy.barcode}
              </div>
            )}
          </article>

          <article className="loan-detail-info-card">

<div className="loan-info-row">
  <div className="loan-info-icon">
    <RefreshCw size={20} />
  </div>

  <div>
    <span>Perpanjangan</span>
    <strong>
      {loan.renewalCount ?? 0}/2 kali
    </strong>
  </div>
</div>

            <div className="loan-info-row">
              <div className="loan-info-icon">
                <User size={20} />
              </div>

              <div>
                <span>Peminjam</span>
                <strong>
                  {loan.user?.fullName ??
                    "Data pengguna tidak tersedia"}
                </strong>
              </div>
            </div>

            <div className="loan-info-row">
              <div className="loan-info-icon">
                <CalendarDays size={20} />
              </div>

              <div>
                <span>Tanggal Pinjam</span>
                <strong>
                  {formatDate(loan.borrowedAt)}
                </strong>
              </div>
            </div>

            <div className="loan-info-row">
              <div className="loan-info-icon">
                <Clock3 size={20} />
              </div>

              <div>
                <span>Jatuh Tempo</span>
                <strong>
                  {formatDate(loan.dueDate)}
                </strong>
              </div>
            </div>

            <div className="loan-info-row">
              <div className="loan-info-icon">
                <AlertCircle size={20} />
              </div>

              <div>
                <span>Denda</span>
                <strong>
                  Rp{" "}
                  {Number(
                    loan.fineAmount ?? 0,
                  ).toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <div className="loan-info-row">
              <div className="loan-info-icon">
                <BookOpen size={20} />
              </div>

              <div>
                <span>Status Buku</span>
                <strong>
                  {loan.bookCopy?.status ?? "-"}
                </strong>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}