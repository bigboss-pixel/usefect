"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  RefreshCw,
  User,
  Mail,
  Barcode,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "../../../lib/api";
import { useUsefectDialog } from "../../../../components/UsefectDialogProvider";

type Loan = {
  id: number;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  status: string;
  fineAmount: number;
  renewalCount: number;

  user?: {
    id: number;
    fullName: string;
    email: string;
  };

  bookCopy?: {
    id: number;
    barcode: string;
    status: string;

    book?: {
      id: number;
      title: string;
      author: string;
      isbn?: string;
    };
  };
};

export default function AdminLoanDetailPage() {
  const { showAlert, showConfirm } = useUsefectDialog();

  const params = useParams();
  const id = params.id;

  const [loan, setLoan] =
    useState<Loan | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `/loans/${id}`,
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil detail peminjaman",
        );
      }

      setLoan(
        result?.data ??
          result,
      );
    } catch (error: any) {
      console.error(
        "Gagal mengambil detail peminjaman:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil detail peminjaman",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLoan();
    }
  }, [id]);

  const handleAction = async (
    action:
      | "approve"
      | "reject"
      | "return"
      | "lost"
      | "damaged",
    message: string,
  ) => {
    if (!loan) return;

    const actionTitles: Record<typeof action, string> = {
      approve: "Setujui Peminjaman",
      reject: "Tolak Peminjaman",
      return: "Kembalikan Buku",
      lost: "Tandai Buku Hilang",
      damaged: "Tandai Buku Rusak",
    };

    const confirmed = await showConfirm(message, {
      title: actionTitles[action],
      type: "warning",
      confirmLabel: "Lanjutkan",
      cancelLabel: "Batal",
    });

    if (!confirmed) return;

    try {
      setProcessing(true);

      const response = await apiFetch(
        `/loans/${loan.id}/${action}`,
        {
          method: "PATCH",
        },
      );

      const result =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal memproses peminjaman",
        );
      }

      await showAlert(
        result?.message ??
          "Peminjaman berhasil diproses",
        {
          title: "Peminjaman Berhasil Diproses",
          type: "success",
        },
      );

      await fetchLoan();
    } catch (error: any) {
      console.error(
        "Gagal memproses peminjaman:",
        error,
      );

      await showAlert(
        error?.message ??
          "Gagal memproses peminjaman",
        {
          title: "Gagal Memproses Peminjaman",
          type: "error",
        },
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (
    date?: string | null,
  ) => {
    if (!date) return "-";

    return new Date(
      date,
    ).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );
  };

  const formatFine = (
    amount: number,
  ) => {
    return `Rp ${Number(
      amount ?? 0,
    ).toLocaleString("id-ID")}`;
  };

  const getStatusLabel = (
    status: string,
  ) => {
    const labels: Record<
      string,
      string
    > = {
      PENDING:
        "Menunggu Persetujuan",
      ACTIVE:
        "Sedang Dipinjam",
      OVERDUE:
        "Terlambat",
      RETURNED:
        "Dikembalikan",
      CANCELLED:
        "Dibatalkan",
      REJECTED:
        "Ditolak",
      LOST:
        "Hilang",
      DAMAGED:
        "Rusak",
    };

    return (
      labels[status] ??
      status
    );
  };

  if (loading) {
    return (
      <main className="admin-loan-detail-page">
        <div className="admin-loan-detail-state">
          <RefreshCw size={30} />

          <p>
            Memuat detail peminjaman...
          </p>
        </div>
      </main>
    );
  }

  if (error || !loan) {
    return (
      <main className="admin-loan-detail-page">
        <div className="admin-loan-detail-state admin-loan-detail-error">
          <AlertCircle size={34} />

          <h2>
            Gagal memuat detail
          </h2>

          <p>
            {error ||
              "Data peminjaman tidak ditemukan."}
          </p>

          <button
            onClick={() =>
              window.history.back()
            }
          >
            Kembali
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-loan-detail-page">
      <div className="admin-loan-detail-container">

        <button
          className="admin-loan-detail-back"
          onClick={() =>
            window.history.back()
          }
        >
          <ArrowLeft size={17} />
          Kembali ke Manajemen Peminjaman
        </button>

        <header className="admin-loan-detail-header">
          <div>
            <span className="admin-loan-detail-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>
              Detail Peminjaman
            </h1>

            <p>
              Informasi lengkap peminjaman
              #{loan.id}.
            </p>
          </div>

          <span
            className={`admin-loan-detail-status status-${loan.status.toLowerCase()}`}
          >
            {getStatusLabel(
              loan.status,
            )}
          </span>
        </header>

        <section className="admin-loan-detail-grid">

          <article className="admin-loan-detail-book-card">

            <div className="admin-loan-detail-book-icon">
              <BookOpen size={34} />
            </div>

            <span className="admin-loan-detail-label">
              INFORMASI BUKU
            </span>

            <h2>
              {loan.bookCopy
                ?.book
                ?.title ??
                "Judul tidak tersedia"}
            </h2>

            <p>
              {loan.bookCopy
                ?.book
                ?.author ??
                "Penulis tidak tersedia"}
            </p>

            <div className="admin-loan-detail-barcode">
              <Barcode size={16} />

              <span>
                {loan.bookCopy
                  ?.barcode ??
                  "-"}
              </span>
            </div>

          </article>

          <article className="admin-loan-detail-info-card">

            <div className="admin-loan-detail-info-item">
              <User size={19} />

              <div>
                <span>
                  Peminjam
                </span>

                <strong>
                  {loan.user
                    ?.fullName ??
                    "-"}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <Mail size={19} />

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {loan.user
                    ?.email ??
                    "-"}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <CalendarDays size={19} />

              <div>
                <span>
                  Tanggal Pinjam
                </span>

                <strong>
                  {formatDate(
                    loan.borrowedAt,
                  )}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <Clock3 size={19} />

              <div>
                <span>
                  Jatuh Tempo
                </span>

                <strong>
                  {formatDate(
                    loan.dueDate,
                  )}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <CalendarDays size={19} />

              <div>
                <span>
                  Tanggal Dikembalikan
                </span>

                <strong>
                  {formatDate(
                    loan.returnedAt,
                  )}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <RefreshCw size={19} />

              <div>
                <span>
                  Perpanjangan
                </span>

                <strong>
                  {loan.renewalCount ??
                    0}
                  /2 kali
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <CircleDollarSign size={19} />

              <div>
                <span>
                  Denda
                </span>

                <strong>
                  {formatFine(
                    loan.fineAmount,
                  )}
                </strong>
              </div>
            </div>

            <div className="admin-loan-detail-info-item">
              <BookOpen size={19} />

              <div>
                <span>
                  Status Copy Buku
                </span>

                <strong>
                  {loan.bookCopy
                    ?.status ??
                    "-"}
                </strong>
              </div>
            </div>

          </article>

        </section>

        {loan.status === "PENDING" && (
          <section className="admin-loan-detail-actions">

            <div>
              <span className="admin-loan-detail-actions-label">
                AKSI PEMINJAMAN
              </span>

              <p>
                Pengajuan ini menunggu
                persetujuan pustakawan.
              </p>
            </div>

            <div className="admin-loan-detail-actions-buttons">

              <button
                className="admin-loan-detail-approve"
                disabled={processing}
                onClick={() =>
                  handleAction(
                    "approve",
                    "Apakah Anda yakin ingin menyetujui peminjaman ini?",
                  )
                }
              >
                {processing
                  ? "Memproses..."
                  : "Setujui Peminjaman"}
              </button>

              <button
                className="admin-loan-detail-reject"
                disabled={processing}
                onClick={() =>
                  handleAction(
                    "reject",
                    "Apakah Anda yakin ingin menolak pengajuan peminjaman ini?",
                  )
                }
              >
                {processing
                  ? "Memproses..."
                  : "Tolak Peminjaman"}
              </button>

            </div>

          </section>
        )}

        {(loan.status === "ACTIVE" ||
          loan.status === "OVERDUE") && (
          <section className="admin-loan-detail-actions">

            <div>
              <span className="admin-loan-detail-actions-label">
                AKSI PEMINJAMAN
              </span>

              <p>
                Kelola status buku yang
                sedang dipinjam oleh
                pengguna.
              </p>
            </div>

            <div className="admin-loan-detail-actions-buttons">

              <button
                className="admin-loan-detail-return"
                disabled={processing}
                onClick={() =>
                  handleAction(
                    "return",
                    "Apakah Anda yakin buku ini sudah dikembalikan?",
                  )
                }
              >
                {processing
                  ? "Memproses..."
                  : "Kembalikan Buku"}
              </button>

              <button
                className="admin-loan-detail-lost"
                disabled={processing}
                onClick={() =>
                  handleAction(
                    "lost",
                    "Apakah Anda yakin ingin menandai buku ini sebagai hilang?",
                  )
                }
              >
                {processing
                  ? "Memproses..."
                  : "Tandai Hilang"}
              </button>

              <button
                className="admin-loan-detail-damaged"
                disabled={processing}
                onClick={() =>
                  handleAction(
                    "damaged",
                    "Apakah Anda yakin ingin menandai buku ini sebagai rusak?",
                  )
                }
              >
                {processing
                  ? "Memproses..."
                  : "Tandai Rusak"}
              </button>

            </div>

          </section>
        )}

      </div>
    </main>
  );
}