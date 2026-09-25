"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  User,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import { useUsefectDialog } from "../../../components/UsefectDialogProvider";

type Loan = {
  id: number;
  borrowedAt: string;
  dueDate: string;
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
    };
  };
};

export default function AdminPeminjamanPage() {
  const { showAlert, showConfirm } = useUsefectDialog();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] =
  useState<number | null>(null);
    const [rejectingId, setRejectingId] =
  useState<number | null>(null);
    const [error, setError] = useState("");

  const fetchPendingLoans = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        "/loans?status=PENDING&limit=100",
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil data peminjaman",
        );
      }

      setLoans(result.data ?? []);
    } catch (error: any) {
      console.error(
        "Gagal mengambil peminjaman:",
        error,
      );

      setError(
        error?.message ??
          "Gagal mengambil data peminjaman",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLoans();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );
  };

  const approveLoan = async (id: number) => {
    const confirmed = await showConfirm(
      "Apakah Anda yakin ingin menyetujui peminjaman ini?",
      {
        title: "Setujui Peminjaman",
        type: "warning",
        confirmLabel: "Setujui",
        cancelLabel: "Batal",
      },
    );

    if (!confirmed) return;

    try {
      setApprovingId(id);

      const response = await apiFetch(
        `/loans/${id}/approve`,
        {
          method: "PATCH",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menyetujui peminjaman",
        );
      }

      setLoans((current) =>
        current.filter(
          (loan) => loan.id !== id,
        ),
      );

      await showAlert(
        result?.message ??
          "Peminjaman berhasil disetujui",
        {
          title: "Peminjaman Disetujui",
          type: "success",
        },
      );
    } catch (error: any) {
      console.error(
        "Gagal menyetujui peminjaman:",
        error,
      );

      await showAlert(
        error?.message ??
          "Gagal menyetujui peminjaman",
        {
          title: "Gagal Menyetujui Peminjaman",
          type: "error",
        },
      );
    } finally {
      setApprovingId(null);
    }
  };

const rejectLoan = async (id: number) => {
  const confirmed = await showConfirm(
    "Apakah Anda yakin ingin menolak pengajuan peminjaman ini?",
    {
      title: "Tolak Peminjaman",
      type: "warning",
      confirmLabel: "Tolak",
      cancelLabel: "Batal",
    },
  );

  if (!confirmed) return;

  try {
    setRejectingId(id);

    const response = await apiFetch(
      `/loans/${id}/reject`,
      {
        method: "PATCH",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ??
          "Gagal menolak peminjaman",
      );
    }

    setLoans((current) =>
      current.filter(
        (loan) => loan.id !== id,
      ),
    );

    await showAlert(
      result?.message ??
        "Peminjaman berhasil ditolak",
      {
        title: "Peminjaman Ditolak",
        type: "success",
      },
    );
  } catch (error: any) {
    console.error(
      "Gagal menolak peminjaman:",
      error,
    );

    await showAlert(
      error?.message ??
        "Gagal menolak peminjaman",
      {
        title: "Gagal Menolak Peminjaman",
        type: "error",
      },
    );
  } finally {
    setRejectingId(null);
  }
};

  return (
    <main className="admin-loan-page">
      <div className="admin-loan-container">
        <header className="admin-loan-header">
          <div>
            <span className="admin-loan-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>Persetujuan Peminjaman</h1>

            <p>
              Kelola pengajuan peminjaman buku
              yang menunggu persetujuan.
            </p>
          </div>

          <button
            className="admin-loan-refresh"
            onClick={fetchPendingLoans}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Segarkan
          </button>
        </header>

        {loading ? (
          <div className="admin-loan-state">
            <RefreshCw size={28} />
            <p>
              Memuat pengajuan peminjaman...
            </p>
          </div>
        ) : error ? (
          <div className="admin-loan-state admin-loan-error">
            <Clock3 size={32} />

            <h2>Gagal memuat data</h2>

            <p>{error}</p>

            <button
              className="admin-loan-retry"
              onClick={fetchPendingLoans}
            >
              Coba Lagi
            </button>
          </div>
        ) : loans.length === 0 ? (
          <div className="admin-loan-state">
            <CheckCircle2 size={42} />

            <h2>Tidak ada pengajuan</h2>

            <p>
              Saat ini tidak ada peminjaman
              yang menunggu persetujuan.
            </p>
          </div>
        ) : (
          <section className="admin-loan-list">
            <div className="admin-loan-list-header">
              <span>
                {loans.length} pengajuan menunggu
              </span>
            </div>

            {loans.map((loan) => (
              <article
                key={loan.id}
                className="admin-loan-card"
              >
                <div className="admin-loan-book-icon">
                  <BookOpen size={28} />
                </div>

                <div className="admin-loan-main">
                  <span className="admin-loan-label">
                    PENGAJUAN PEMINJAMAN
                  </span>

                  <h2>
                    {loan.bookCopy?.book?.title ??
                      "Judul tidak tersedia"}
                  </h2>

                  <p>
                    {loan.bookCopy?.book?.author ??
                      "Penulis tidak tersedia"}
                  </p>

                  <div className="admin-loan-meta">
                    <div>
                      <User size={16} />

                      <span>
                        {loan.user?.fullName ??
                          "Pengguna tidak tersedia"}
                      </span>
                    </div>

                    <div>
                      <Clock3 size={16} />

                      <span>
                        Jatuh tempo:{" "}
                        {formatDate(
                          loan.dueDate,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="admin-loan-barcode">
                    Barcode:{" "}
                    {loan.bookCopy?.barcode ??
                      "-"}
                  </div>
                </div>

                <div className="admin-loan-side">
                  <span className="admin-loan-status">
                    Menunggu Persetujuan
                  </span>

                  <button
                    className="admin-loan-approve"
                    onClick={() =>
                      approveLoan(loan.id)
                    }
                    disabled={
                      approvingId === loan.id
                    }
                  >
                    <CheckCircle2 size={17} />

                    {approvingId === loan.id
                      ? "Memproses..."
                      : "Setujui"}
                  </button>

<button
  className="admin-loan-reject"
  onClick={() =>
    rejectLoan(loan.id)
  }
  disabled={
    rejectingId === loan.id
  }
>
  <Clock3 size={17} />

  {rejectingId === loan.id
    ? "Memproses..."
    : "Tolak"}
</button>

                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}