"use client";

import { FormEvent, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api-production-a461.up.railway.app";

type ImportResult = {
  message?: string;
  ebook?: {
    id: number;
    title: string;
    author: string;
    fileType: string;
    source: string;
    sourceUrl: string;
    license: string;
    permissionStatus: string;
    status: string;
  };
};

export default function AdminEbookPage() {
  const [url, setUrl] = useState(
    "https://standardebooks.org/ebooks/mary-shelley/frankenstein",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleImport(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/ebooks/import/standard-ebooks`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: url.trim() }),
        },
      );

      const data = await response.json().catch(
        () => ({}),
      );

      if (!response.ok) {
        throw new Error(
          data?.message ??
            "Gagal mengimpor E-Book.",
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengimpor E-Book.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100%",
        padding: "32px",
        background: "#f6f8fb",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
              marginBottom: 8,
            }}
          >
            Pengelolaan E-Book
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Import Standard Ebooks
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "#64748b",
              lineHeight: 1.7,
            }}
          >
            Impor E-Book dari Standard Ebooks ke
            penyimpanan USEFECT. File akan disimpan
            pada storage persisten Railway.
          </p>
        </div>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            padding: 28,
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <form onSubmit={handleImport}>
            <label
              htmlFor="standard-ebook-url"
              style={{
                display: "block",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              URL Standard Ebooks
            </label>

            <input
              id="standard-ebook-url"
              type="url"
              value={url}
              onChange={(event) =>
                setUrl(event.target.value)
              }
              placeholder="https://standardebooks.org/ebooks/..."
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: 15,
                color: "#0f172a",
                background: "#fff",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 16,
                border: 0,
                borderRadius: 12,
                padding: "13px 20px",
                background: loading
                  ? "#94a3b8"
                  : "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Mengimpor..."
                : "Import E-Book"}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          {result?.ebook && (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                borderRadius: 14,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#166534",
                  marginBottom: 14,
                }}
              >
                {result.message ??
                  "E-Book berhasil diimpor."}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  color: "#334155",
                }}
              >
                <div>
                  <strong>ID:</strong>{" "}
                  {result.ebook.id}
                </div>
                <div>
                  <strong>Judul:</strong>{" "}
                  {result.ebook.title}
                </div>
                <div>
                  <strong>Penulis:</strong>{" "}
                  {result.ebook.author}
                </div>
                <div>
                  <strong>File:</strong>{" "}
                  {result.ebook.fileType}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  {result.ebook.status}
                </div>
                <div>
                  <strong>Permission:</strong>{" "}
                  {result.ebook.permissionStatus}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
