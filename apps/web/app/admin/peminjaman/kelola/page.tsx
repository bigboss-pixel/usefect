"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserCodeReader,
  BrowserMultiFormatReader,
  BrowserQRCodeReader,
  IScannerControls,
} from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";
import {
  BookOpen,
  Clock3,
  RefreshCw,
  Search,
  ScanLine,
  User,
} from "lucide-react";

import { apiFetch } from "../../../lib/api";

type LoanStatus =
  | "ALL"
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
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  returnRequestedAt?: string | null;
  returnRequestStatus?: string;
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

const statusOptions: {
  value: LoanStatus;
  label: string;
}[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "ACTIVE", label: "Sedang Dipinjam" },
  { value: "OVERDUE", label: "Terlambat" },
  { value: "RETURNED", label: "Dikembalikan" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "LOST", label: "Hilang" },
  { value: "DAMAGED", label: "Rusak" },
];

export default function AdminKelolaPeminjamanPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [returnRequests, setReturnRequests] =
    useState<Loan[]>([]);
  const [returnRequestsLoading, setReturnRequestsLoading] =
    useState(false);

  const [status, setStatus] =
    useState<LoanStatus>("ALL");

  const [search, setSearch] = useState("");
  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [processingId, setProcessingId] =
  useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] =
    useState(1);

  const [memberQrToken, setMemberQrToken] =
    useState("");

  const [transactionIsbn, setTransactionIsbn] =
    useState("");

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [returnIsbn, setReturnIsbn] =
    useState("");

  const [returnLoanId, setReturnLoanId] =
    useState<number | null>(null);

  const [returnPreview, setReturnPreview] =
    useState<any | null>(null);

  const [returnCondition, setReturnCondition] =
    useState<"GOOD" | "DAMAGED" | "LOST">("GOOD");

  const [returnShelfConfirmed, setReturnShelfConfirmed] =
    useState(false);

  const [returnLoading, setReturnLoading] =
    useState(false);

  const [scannerOpen, setScannerOpen] =
    useState(false);

  const [scannerMode, setScannerMode] =
    useState<
      "QR" | "BARCODE" | "RETURN_ISBN"
    >("QR");

  const [cameras, setCameras] =
    useState<MediaDeviceInfo[]>([]);

  const [selectedCameraId, setSelectedCameraId] =
    useState("");

  const [scannerError, setScannerError] =
    useState("");

  const scannerVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const scannerControlsRef =
    useRef<IScannerControls | null>(null);

  const scannerReaderRef =
    useRef<BrowserCodeReader | null>(null);
  const scannerCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const stopScanner = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    const video = scannerVideoRef.current;

    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    scannerReaderRef.current = null;
    setScannerOpen(false);
    setScannerError("");
  };

  const startScanner = async (
    mode:
      | "QR"
      | "BARCODE"
      | "RETURN_ISBN",
  ) => {
    try {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;

      setScannerMode(mode);
      setScannerError("");
      setScannerOpen(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Browser ini tidak mendukung akses kamera.",
        );
      }

      const permissionStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
        });

      permissionStream
        .getTracks()
        .forEach((track) => track.stop());

      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      setCameras(videoDevices);

      const cameraId =
        selectedCameraId ||
        videoDevices[0]?.deviceId ||
        "";

      if (!cameraId) {
        throw new Error("Kamera tidak ditemukan.");
      }

      setSelectedCameraId(cameraId);

      await new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      const video = scannerVideoRef.current;

      if (!video) {
        throw new Error(
          "Video scanner belum siap. Silakan coba lagi.",
        );
      }

      const hints = new Map<any, any>();

      if (mode === "QR") {
        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          [BarcodeFormat.QR_CODE],
        );

        hints.set(
          DecodeHintType.TRY_HARDER,
          true,
        );
      }

      const reader =
        mode === "QR"
          ? new BrowserQRCodeReader(hints)
          : new BrowserMultiFormatReader();

      scannerReaderRef.current = reader;

      const cameraConstraints: MediaStreamConstraints = {
        video: {
          deviceId: {
            exact: cameraId,
          },
          width: {
            ideal: 1920,
            min: 1280,
          },
          height: {
            ideal: 1080,
            min: 720,
          },
          frameRate: {
            ideal: 30,
            min: 15,
          },
          ...(mode === "QR"
            ? {
                focusMode:
                  "continuous" as any,
              }
            : {}),
        },
      };

      const controls =
        await reader.decodeFromConstraints(
          cameraConstraints,
          video,
          (result) => {
            if (!result) return;

            const value =
              result.getText().trim();

            if (!value) return;

            if (mode === "QR") {
              if (!value.startsWith("UMAQR1.")) {
                setScannerError(
                  "QR terbaca, tetapi bukan QR anggota UMA.",
                );
                return;
              }

              setMemberQrToken(value);
            } else {
              if (value.startsWith("UMAQR1.")) {
                setScannerError(
                  "Kode ini adalah QR anggota, bukan barcode buku.",
                );
                return;
              }

              if (mode === "RETURN_ISBN") {
                setReturnIsbn(value);
              } else {
                setTransactionIsbn(value);
              }
            }

            stopScanner();
          },
        );

      scannerControlsRef.current = controls;

      // ======================================================
      // QR SMALL-CODE FALLBACK
      // Crop area tengah + upscale + TRY_HARDER
      // ======================================================
      if (mode === "QR") {
        const canvas = document.createElement("canvas");

        scannerCanvasRef.current = canvas;

        const scanCroppedQr = () => {
          if (
            !scannerVideoRef.current ||
            !scannerControlsRef.current
          ) {
            return;
          }

          const currentVideo =
            scannerVideoRef.current;

          if (
            currentVideo.readyState <
              HTMLMediaElement.HAVE_CURRENT_DATA ||
            currentVideo.videoWidth === 0 ||
            currentVideo.videoHeight === 0
          ) {
            requestAnimationFrame(scanCroppedQr);
            return;
          }

          const sourceWidth =
            currentVideo.videoWidth;

          const sourceHeight =
            currentVideo.videoHeight;

          // Area tengah 75% agar QR yang sedikit
          // keluar dari tengah tetap bisa tertangkap.
          const cropSize =
            Math.min(
              sourceWidth,
              sourceHeight,
            ) * 0.75;

          const sourceX =
            (sourceWidth - cropSize) / 2;

          const sourceY =
            (sourceHeight - cropSize) / 2;

          // Upscale 3x.
          const scale = 3;

          canvas.width =
            Math.round(cropSize * scale);

          canvas.height =
            Math.round(cropSize * scale);

          const context =
            canvas.getContext("2d", {
              willReadFrequently: true,
            });

          if (!context) {
            requestAnimationFrame(scanCroppedQr);
            return;
          }

          context.imageSmoothingEnabled = false;

          context.drawImage(
            currentVideo,
            sourceX,
            sourceY,
            cropSize,
            cropSize,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          try {
            const result =
              reader.decodeFromCanvas(canvas);

            const value =
              result.getText().trim();

            if (
              value.startsWith("UMAQR1.")
            ) {
              setMemberQrToken(value);
              stopScanner();
              return;
            }
          } catch {
            // QR belum terbaca.
          }

          requestAnimationFrame(scanCroppedQr);
        };

        requestAnimationFrame(scanCroppedQr);
      }
    } catch (error: any) {
      console.error(
        "Scanner error:",
        error,
      );

      setScannerError(
        error?.message ??
          "Kamera tidak dapat digunakan.",
      );
    }
  };
  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop();

      const video =
        scannerVideoRef.current;

      if (video?.srcObject) {
        const stream =
          video.srcObject as MediaStream;

        stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  const limit = 10;

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (search.trim()) {
        params.set(
          "search",
          search.trim(),
        );
      }

      params.set(
        "page",
        String(page),
      );

      params.set(
        "limit",
        String(limit),
      );

      params.set(
        "sortBy",
        "createdAt",
      );

      params.set(
        "order",
        "desc",
      );

      const response = await apiFetch(
        `/loans?${params.toString()}`,
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil data peminjaman",
        );
      }

      setLoans(result.data ?? []);

      setTotal(
        result.pagination?.total ?? 0,
      );

      setTotalPages(
        result.pagination?.totalPages ?? 1,
      );
    } catch (error: any) {
      console.error(
        "Gagal mengambil data peminjaman:",
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

  const fetchReturnRequests = async () => {
    try {
      setReturnRequestsLoading(true);

      const params = new URLSearchParams();

      params.set(
        "returnRequestStatus",
        "REQUESTED",
      );

      params.set(
        "page",
        "1",
      );

      params.set(
        "limit",
        "100",
      );

      params.set(
        "sortBy",
        "createdAt",
      );

      params.set(
        "order",
        "desc",
      );

      const response = await apiFetch(
        `/loans?${params.toString()}`,
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil pengajuan pengembalian",
        );
      }

      setReturnRequests(
        result.data ?? [],
      );
    } catch (error: any) {
      console.error(
        "Gagal mengambil pengajuan pengembalian:",
        error,
      );

      setReturnRequests([]);
    } finally {
      setReturnRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchReturnRequests();
  }, [status, page]);

  const handleLoanAction = async (
  id: number,
  action:
    | "approve"
    | "reject"
    | "return"
    | "lost"
    | "damaged",
  message: string,
) => {
  const confirmed = window.confirm(
    message,
  );

  if (!confirmed) return;

  try {
    setProcessingId(id);

    const response = await apiFetch(
      `/loans/${id}/${action}`,
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

    alert(
      result?.message ??
        "Peminjaman berhasil diproses",
    );

    await fetchLoans();
  } catch (error: any) {
    console.error(
      "Gagal memproses peminjaman:",
      error,
    );

    alert(
      error?.message ??
        "Gagal memproses peminjaman",
    );
  } finally {
    setProcessingId(null);
  }
};

  const handleSearch = () => {
    setPage(1);
    fetchLoans();
  };

  const handleStaffTransaction = async () => {
    if (!memberQrToken.trim()) {
      alert("QR anggota belum diisi");
      return;
    }

    if (!transactionIsbn.trim()) {
      alert("ISBN / barcode buku belum diisi");
      return;
    }

    try {
      setTransactionLoading(true);

      const response = await apiFetch(
        "/loans/staff-transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberQrToken:
              memberQrToken.trim(),
            isbn:
              transactionIsbn.trim(),
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
            "Transaksi peminjaman gagal",
        );
      }

      alert(
        result?.message ??
          "Peminjaman berhasil dibuat",
      );

      setMemberQrToken("");
      setTransactionIsbn("");

      await fetchLoans();
    } catch (error: any) {
      console.error(
        "Gagal memproses transaksi staff:",
        error,
      );

      alert(
        error?.message ??
          "Transaksi peminjaman gagal",
      );
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleReturnPreview = async () => {
    if (!memberQrToken.trim()) {
      alert("QR anggota belum diisi");
      return;
    }

    if (!returnIsbn.trim()) {
      alert("ISBN buku belum diisi");
      return;
    }

    try {
      setReturnLoading(true);

      const response = await apiFetch(
        "/loans/staff-return-preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberQrToken:
              memberQrToken.trim(),
            isbn:
              returnIsbn.trim(),
            ...(returnLoanId !== null
              ? { loanId: returnLoanId }
              : {}),
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
            "Data pengembalian tidak ditemukan",
        );
      }

      setReturnPreview(result);
      setReturnCondition("GOOD");
      setReturnShelfConfirmed(false);
    } catch (error: any) {
      console.error(
        "Gagal mengambil preview pengembalian:",
        error,
      );

      setReturnPreview(null);

      alert(
        error?.message ??
          "Gagal mengambil data pengembalian",
      );
    } finally {
      setReturnLoading(false);
    }
  };


  const handleReturnTransaction = async () => {
    if (!memberQrToken.trim()) {
      alert("QR anggota belum diisi");
      return;
    }

    if (!returnIsbn.trim()) {
      alert("ISBN buku belum diisi");
      return;
    }

    if (!returnPreview) {
      alert("Silakan cari data buku terlebih dahulu");
      return;
    }

    if (
      returnCondition === "GOOD" &&
      !returnShelfConfirmed
    ) {
      alert(
        "Konfirmasi bahwa buku sudah ditaruh di rak.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Proses pengembalian buku ini?",
      );

    if (!confirmed) return;

    try {
      setReturnLoading(true);

      const response = await apiFetch(
        "/loans/staff-return",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberQrToken:
              memberQrToken.trim(),
            isbn:
              returnIsbn.trim(),
            condition:
              returnCondition,
            shelfConfirmed:
              returnShelfConfirmed,
            ...(returnLoanId !== null
              ? { loanId: returnLoanId }
              : {}),
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
            "Pengembalian buku gagal",
        );
      }

      alert(
        result?.message ??
          "Buku berhasil dikembalikan",
      );

      setReturnIsbn("");
      setReturnPreview(null);
      setReturnCondition("GOOD");
      setReturnShelfConfirmed(false);

      await fetchLoans();
    } catch (error: any) {
      console.error(
        "Gagal memproses pengembalian:",
        error,
      );

      alert(
        error?.message ??
          "Pengembalian buku gagal",
      );
    } finally {
      setReturnLoading(false);
    }
  };


  const formatDate = (
    date: string,
  ) => {
    return new Date(
      date,
    ).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
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
    value: string,
  ) => {
    const found =
      statusOptions.find(
        (item) =>
          item.value === value,
      );

    return (
      found?.label ?? value
    );
  };

  return (
    <main className="admin-manage-loan-page">
      <div className="admin-manage-loan-container">

        <header className="admin-manage-loan-header">
          <div>
            <span className="admin-manage-loan-eyebrow">
              ADMIN / PUSTAKAWAN
            </span>

            <h1>
              Manajemen Peminjaman
            </h1>

            <p>
              Pantau dan kelola seluruh
              aktivitas peminjaman buku.
            </p>
          </div>

          <button
            className="admin-manage-loan-refresh"
            onClick={fetchLoans}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Segarkan
          </button>
        </header>

        <section className="admin-manage-loan-toolbar">

          <div className="admin-manage-loan-search">
            <Search size={18} />

            <input
              type="text"
              value={search}
              placeholder="Cari judul, peminjam, email, atau barcode..."
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  handleSearch();
                }
              }}
            />

            <button
              onClick={handleSearch}
            >
              Cari
            </button>
          </div>

          <div className="admin-manage-loan-filters">
            {statusOptions.map(
              (item) => (
                <button
                  key={item.value}
                  className={
                    status ===
                    item.value
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatus(
                      item.value,
                    );
                    setPage(1);
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>

        </section>

        <section
          className="admin-manage-loan-transaction admin-manage-loan-return-section"
        >

          <div className="admin-manage-loan-transaction-header">
            <div>
              <span className="admin-manage-loan-eyebrow">
                PENGAJUAN ONLINE
              </span>

              <h2>
                Pengajuan Pengembalian
              </h2>

              <p>
                Pengguna dapat mengajukan pengembalian secara online.
                Buku tetap harus dibawa ke perpustakaan untuk menyelesaikan
                pengembalian secara fisik.
              </p>
            </div>

            <div className="admin-manage-loan-transaction-icon">
              <ScanLine size={24} />
            </div>
          </div>

          {returnRequestsLoading ? (
            <div className="admin-manage-loan-empty">
              Memuat pengajuan pengembalian...
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="admin-manage-loan-empty">
              Tidak ada pengajuan pengembalian yang menunggu.
            </div>
          ) : (
            <div className="admin-manage-loan-return-preview">

              {returnRequests.map((request) => (
                <div
                  key={request.id}
                  className="admin-manage-loan-return-request-card"
                >

                  <div className="admin-manage-loan-return-info">

                    <div>
                      <span>PEMINJAM</span>
                      <strong>
                        {request.user?.fullName ?? "-"}
                      </strong>
                      <small>
                        {request.user?.email ?? "-"}
                      </small>
                    </div>

                    <div>
                      <span>BUKU</span>
                      <strong>
                        {request.bookCopy?.book?.title ?? "-"}
                      </strong>
                      <small>
                        ISBN:{" "}
                        {request.bookCopy?.book?.isbn ?? "-"}
                      </small>
                    </div>

                    <div>
                      <span>DIAJUKAN</span>
                      <strong>
                        {request.returnRequestedAt
                          ? formatDate(
                              request.returnRequestedAt,
                            )
                          : "-"}
                      </strong>
                    </div>

                    <div>
                      <span>JATUH TEMPO</span>
                      <strong>
                        {request.dueDate
                          ? formatDate(
                              request.dueDate,
                            )
                          : "-"}
                      </strong>
                    </div>

                  </div>

                  <div className="admin-manage-loan-return-shelf">
                    <span>STATUS</span>
                    <strong>
                      ⏳ Menunggu Buku
                    </strong>
                  </div>

                  <a
                    href="#pengembalian-buku-section"
                    className="admin-manage-loan-transaction-submit"
                    onClick={() => {
                      setMemberQrToken("");
                      setReturnLoanId(request.id);
                      setReturnIsbn(
                        request.bookCopy?.book?.isbn ?? "",
                      );
                      setReturnPreview(null);
                    }}
                  >
                    <ScanLine size={17} />
                    Proses Pengembalian
                  </a>

                </div>
              ))}

            </div>
          )}

        </section>

        <section className="admin-manage-loan-transaction">

          <div className="admin-manage-loan-transaction-header">
            <div>
              <span className="admin-manage-loan-eyebrow">
                TRANSAKSI FISIK
              </span>

              <h2>
                Peminjaman Langsung
              </h2>

              <p>
                Scan QR anggota dan barcode buku untuk
                membuat transaksi peminjaman.
              </p>
            </div>

            <div className="admin-manage-loan-transaction-icon">
              <ScanLine size={24} />
            </div>
          </div>

          <div className="admin-manage-loan-transaction-form">

            <div className="admin-manage-loan-transaction-field">
              <label>
                QR Anggota
              </label>

              <div className="admin-manage-loan-scan-input">
                <input
                  type="text"
                  value={memberQrToken}
                  placeholder="Scan QR anggota..."
                  onChange={(event) =>
                    setMemberQrToken(
                      event.target.value,
                    )
                  }
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="admin-manage-loan-camera-button"
                  onClick={() => startScanner("QR")}
                  title="Scan QR anggota dengan kamera"
                >
                  <ScanLine size={18} />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            <div className="admin-manage-loan-transaction-field">
              <label>
                ISBN / Barcode Buku
              </label>

              <div className="admin-manage-loan-scan-input">
                <input
                  type="text"
                  value={transactionIsbn}
                  placeholder="Scan ISBN / barcode belakang buku..."
                  onChange={(event) =>
                    setTransactionIsbn(
                      event.target.value,
                    )
                  }
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="admin-manage-loan-camera-button"
                  onClick={() => startScanner("BARCODE")}
                  title="Scan ISBN / barcode buku dengan kamera"
                >
                  <ScanLine size={18} />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            <button
              className="admin-manage-loan-transaction-submit"
              onClick={handleStaffTransaction}
              disabled={transactionLoading}
            >
              <ScanLine size={17} />

              {transactionLoading
                ? "Memproses..."
                : "Proses Peminjaman"}
            </button>

          </div>

        </section>

        <section className="admin-manage-loan-transaction admin-manage-loan-return-section">

          <div
            id="pengembalian-buku-section"
            className="admin-manage-loan-transaction-header"
          >
            <div>
              <span className="admin-manage-loan-eyebrow">
                TRANSAKSI FISIK
              </span>

              <h2>
                Pengembalian Buku
              </h2>

              <p>
                Scan QR anggota dan ISBN buku untuk mencari data
                peminjaman dan memproses pengembaliannya.
              </p>
            </div>

            <div className="admin-manage-loan-transaction-icon">
              <ScanLine size={24} />
            </div>
          </div>

          <div className="admin-manage-loan-transaction-form">

            <div className="admin-manage-loan-transaction-field">
              <label>
                QR Anggota
              </label>

              <div className="admin-manage-loan-scan-input">
                <input
                  type="text"
                  value={memberQrToken}
                  placeholder="Scan QR anggota..."
                  onChange={(event) => {
                    setMemberQrToken(
                      event.target.value,
                    );
                    setReturnPreview(null);
                  }}
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="admin-manage-loan-camera-button"
                  onClick={() =>
                    startScanner("QR")
                  }
                  title="Scan QR anggota dengan kamera"
                >
                  <ScanLine size={18} />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            <div className="admin-manage-loan-transaction-field">
              <label>
                ISBN Buku
              </label>

              <div className="admin-manage-loan-scan-input">
                <input
                  type="text"
                  value={returnIsbn}
                  placeholder="Scan atau masukkan ISBN buku..."
                  onChange={(event) => {
                    setReturnIsbn(
                      event.target.value,
                    );
                    setReturnPreview(null);
                  }}
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="admin-manage-loan-camera-button"
                  onClick={() =>
                    startScanner("RETURN_ISBN")
                  }
                  title="Scan ISBN buku dengan kamera"
                >
                  <ScanLine size={18} />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="admin-manage-loan-transaction-submit"
              onClick={handleReturnPreview}
              disabled={
                returnLoading ||
                !memberQrToken.trim() ||
                !returnIsbn.trim()
              }
            >
              <ScanLine size={17} />

              {returnLoading
                ? "Mencari..."
                : "Cari Data Pengembalian"}
            </button>

          </div>

          {returnPreview && (
            <div className="admin-manage-loan-return-preview">

              <div className="admin-manage-loan-return-info">

                <div>
                  <span>BUKU</span>
                  <strong>
                    {returnPreview.book?.title ??
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>PEMINJAM</span>
                  <strong>
                    {returnPreview.member?.fullName ??
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>JATUH TEMPO</span>
                  <strong>
                    {returnPreview.loan?.dueDate
                      ? formatDate(
                          returnPreview.loan.dueDate,
                        )
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>ISBN</span>
                  <strong>
                    {returnPreview.book?.isbn ??
                      returnIsbn}
                  </strong>
                </div>

              </div>

              <div className="admin-manage-loan-return-shelf">
                <span>
                  KEMBALIKAN KE
                </span>

                <strong>
                  📚{" "}
                  {returnPreview.bookCopy?.homeLocation ??
                    returnPreview.bookCopy?.shelfLocation ??
                    "Lokasi rak belum ditentukan"}
                </strong>
              </div>

              <div className="admin-manage-loan-return-condition">

                <label>
                  Kondisi Buku
                </label>

                <div className="admin-manage-loan-return-condition-buttons">

                  <button
                    type="button"
                    className={
                      returnCondition === "GOOD"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setReturnCondition("GOOD");
                      setReturnShelfConfirmed(false);
                    }}
                  >
                    Baik
                  </button>

                  <button
                    type="button"
                    className={
                      returnCondition === "DAMAGED"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setReturnCondition("DAMAGED");
                      setReturnShelfConfirmed(false);
                    }}
                  >
                    Rusak
                  </button>

                  <button
                    type="button"
                    className={
                      returnCondition === "LOST"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setReturnCondition("LOST");
                      setReturnShelfConfirmed(false);
                    }}
                  >
                    Hilang
                  </button>

                </div>

              </div>

              {returnCondition === "GOOD" && (
                <label className="admin-manage-loan-return-confirm">

                  <input
                    type="checkbox"
                    checked={
                      returnShelfConfirmed
                    }
                    onChange={(event) =>
                      setReturnShelfConfirmed(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    Buku sudah ditaruh di rak
                  </span>

                </label>
              )}

              <button
                type="button"
                className="admin-manage-loan-transaction-submit"
                onClick={handleReturnTransaction}
                disabled={returnLoading}
              >
                <ScanLine size={17} />

                {returnLoading
                  ? "Memproses..."
                  : "Proses Pengembalian"}
              </button>

            </div>
          )}

        </section>

        {scannerOpen && (
          <div className="admin-manage-loan-scanner-overlay">
            <div className="admin-manage-loan-scanner-modal">

              <div className="admin-manage-loan-scanner-header">
                <div>
                  <span className="admin-manage-loan-eyebrow">
                    CAMERA SCANNER
                  </span>

                  <h2>
                    Scan{" "}
                    {scannerMode === "QR"
                      ? "QR Anggota"
                      : scannerMode === "RETURN_ISBN"
                        ? "ISBN Buku Pengembalian"
                        : "ISBN / Barcode Buku"}
                  </h2>

                  <p>
                    Arahkan kamera ke kode yang ingin
                    dipindai.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-manage-loan-scanner-close"
                  onClick={stopScanner}
                  aria-label="Tutup scanner"
                >
                  ×
                </button>
              </div>

              <div className="admin-manage-loan-scanner-camera-select">
                <label htmlFor="scanner-camera">
                  Pilih Kamera
                </label>

                <select
                  id="scanner-camera"
                  value={selectedCameraId}
                  onChange={(event) => {
                    stopScanner();
                    setSelectedCameraId(
                      event.target.value,
                    );
                    setTimeout(() => {
                      startScanner(scannerMode);
                    }, 100);
                  }}
                >
                  {cameras.map((camera, index) => (
                    <option
                      key={camera.deviceId}
                      value={camera.deviceId}
                    >
                      {camera.label ||
                        `Kamera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-manage-loan-scanner-video-wrap">
                <video
                  ref={scannerVideoRef}
                  className="admin-manage-loan-scanner-video"
                  autoPlay
                  muted
                  playsInline
                />

                <div className="admin-manage-loan-scanner-frame">
                  <span />
                </div>
              </div>

              {scannerError && (
                <div className="admin-manage-loan-scanner-error">
                  {scannerError}
                </div>
              )}

              <div className="admin-manage-loan-scanner-footer">
                <span>
                  {scannerMode === "QR"
                    ? "Mode QR Anggota"
                    : scannerMode === "RETURN_ISBN"
                      ? "Mode Barcode Pengembalian"
                      : "Mode ISBN / Barcode Buku"}
                </span>

                <button
                  type="button"
                  className="admin-manage-loan-scanner-cancel"
                  onClick={stopScanner}
                >
                  Tutup Kamera
                </button>
              </div>

            </div>
          </div>
        )}

        <div className="admin-manage-loan-summary">
          <span>
            {total} data peminjaman
          </span>

          <span>
            Halaman {page} dari{" "}
            {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="admin-manage-loan-state">
            <RefreshCw size={28} />

            <p>
              Memuat data peminjaman...
            </p>
          </div>
        ) : error ? (
          <div className="admin-manage-loan-state admin-manage-loan-error">
            <Clock3 size={32} />

            <h2>
              Gagal memuat data
            </h2>

            <p>{error}</p>

            <button
              onClick={fetchLoans}
            >
              Coba Lagi
            </button>
          </div>
        ) : loans.length === 0 ? (
          <div className="admin-manage-loan-state">
            <BookOpen size={42} />

            <h2>
              Tidak ada data
            </h2>

            <p>
              Tidak ditemukan
              peminjaman dengan filter
              yang dipilih.
            </p>
          </div>
        ) : (
          <section className="admin-manage-loan-list">

            {loans.map(
              (loan) => (
                <article
                  key={loan.id}
                  className="admin-manage-loan-card"
                >

                  <div className="admin-manage-loan-icon">
                    <BookOpen
                      size={26}
                    />
                  </div>

                  <div className="admin-manage-loan-main">

                    <span className="admin-manage-loan-label">
                      PEMINJAMAN #{loan.id}
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

                    <div className="admin-manage-loan-meta">

                      <div>
                        <User
                          size={15}
                        />

                        <span>
                          {loan.user
                            ?.fullName ??
                            "-"}
                        </span>
                      </div>

                      <div>
                        <Clock3
                          size={15}
                        />

                        <span>
                          Jatuh tempo:{" "}
                          {formatDate(
                            loan.dueDate,
                          )}
                        </span>
                      </div>

                      <div>
                        <span>
                          Barcode:{" "}
                          {loan.bookCopy
                            ?.barcode ??
                            "-"}
                        </span>
                      </div>

                    </div>

                  </div>

<div className="admin-manage-loan-side">

  <span
    className={`admin-manage-loan-status status-${loan.status.toLowerCase()}`}
  >
    {getStatusLabel(
      loan.status,
    )}
  </span>

  <strong>
    {formatFine(
      loan.fineAmount,
    )}
  </strong>

  <span>
    Renewal{" "}
    {loan.renewalCount ?? 0}/2
  </span>

  <div className="admin-manage-loan-actions">

    <button
      className="admin-manage-loan-detail"
      onClick={() => {
        window.location.href =
        `/admin/peminjaman/${loan.id}`;
      }}
    >
      Detail
    </button>

    {loan.status === "PENDING" && (
      <>
        <button
          className="admin-manage-loan-approve"
          disabled={
            processingId === loan.id
          }
          onClick={() =>
            handleLoanAction(
              loan.id,
              "approve",
              "Apakah Anda yakin ingin menyetujui peminjaman ini?",
            )
          }
        >
          {processingId === loan.id
            ? "Memproses..."
            : "Setujui"}
        </button>

        <button
          className="admin-manage-loan-reject"
          disabled={
            processingId === loan.id
          }
          onClick={() =>
            handleLoanAction(
              loan.id,
              "reject",
              "Apakah Anda yakin ingin menolak pengajuan peminjaman ini?",
            )
          }
        >
          {processingId === loan.id
            ? "Memproses..."
            : "Tolak"}
        </button>
      </>
    )}

    {(loan.status === "ACTIVE" ||
      loan.status === "OVERDUE") && (
      <>
        <button
          className="admin-manage-loan-return"
          disabled={
            processingId === loan.id
          }
          onClick={() =>
            handleLoanAction(
              loan.id,
              "return",
              "Apakah Anda yakin buku ini sudah dikembalikan?",
            )
          }
        >
          {processingId === loan.id
            ? "Memproses..."
            : "Kembalikan"}
        </button>

        <button
          className="admin-manage-loan-lost"
          disabled={
            processingId === loan.id
          }
          onClick={() =>
            handleLoanAction(
              loan.id,
              "lost",
              "Apakah Anda yakin ingin menandai buku ini sebagai hilang?",
            )
          }
        >
          Hilang
        </button>

        <button
          className="admin-manage-loan-damaged"
          disabled={
            processingId === loan.id
          }
          onClick={() =>
            handleLoanAction(
              loan.id,
              "damaged",
              "Apakah Anda yakin ingin menandai buku ini sebagai rusak?",
            )
          }
        >
          Rusak
        </button>
      </>
    )}

  </div>

</div>

                </article>
              ),
            )}

          </section>
        )}

        {!loading &&
          !error &&
          loans.length > 0 && (
            <div className="admin-manage-loan-pagination">

              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage(
                    (current) =>
                      current - 1,
                  )
                }
              >
                Sebelumnya
              </button>

              <span>
                {page} /{" "}
                {totalPages}
              </span>

              <button
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1,
                  )
                }
              >
                Berikutnya
              </button>

            </div>
          )}

      </div>
    </main>
  );
}