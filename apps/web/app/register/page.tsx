"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    npm: "",
    fullName: "",
    email: "",
    phone: "",
    faculty: "",
    studyProgram: "",
    enrollmentYear: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (
      !form.npm ||
      !form.fullName ||
      !form.email ||
      !form.faculty ||
      !form.studyProgram ||
      !form.password
    ) {
      setError("Mohon lengkapi semua data wajib.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3001/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            npm: form.npm.trim(),
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            faculty: form.faculty.trim(),
            studyProgram: form.studyProgram.trim(),
            enrollmentYear:
              form.enrollmentYear
                ? Number(form.enrollmentYear)
                : undefined,
            password: form.password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || "Registrasi gagal.";

        throw new Error(message);
      }

      router.push("/login?registered=success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registrasi gagal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-grid" />
      <div className="register-orb register-orb-one" />
      <div className="register-orb register-orb-two" />

      <section className="register-shell">
        <div className="register-brand">
          <div className="register-brand-mark">U</div>

          <div>
            <div className="register-brand-name">
              UMA LIBRARY
            </div>
            <div className="register-brand-subtitle">
              Digital Library Ecosystem
            </div>
          </div>
        </div>

        <div className="register-card">
          <div className="register-eyebrow">
            MEMBER REGISTRATION
          </div>

          <h1>
            Create Your
            <br />
            Library Account
          </h1>

          <p className="register-description">
            Daftarkan diri Anda sebagai anggota Perpustakaan
            Universitas Medan Area.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="register-section-title">
              DATA MAHASISWA
            </div>

            <div className="register-two-column">
              <div>
                <label
                  className="register-label"
                  htmlFor="npm"
                >
                  NPM *
                </label>

                <input
                  id="npm"
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan NPM"
                  value={form.npm}
                  onChange={(event) =>
                    updateField("npm", event.target.value)
                  }
                  className="register-input"
                />
              </div>

              <div>
                <label
                  className="register-label"
                  htmlFor="fullName"
                >
                  Nama Lengkap *
                </label>

                <input
                  id="fullName"
                  type="text"
                  placeholder="Nama lengkap"
                  value={form.fullName}
                  onChange={(event) =>
                    updateField(
                      "fullName",
                      event.target.value,
                    )
                  }
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-two-column">
              <div>
                <label
                  className="register-label"
                  htmlFor="faculty"
                >
                  Fakultas *
                </label>

                <input
                  id="faculty"
                  type="text"
                  placeholder="Contoh: Teknik"
                  value={form.faculty}
                  onChange={(event) =>
                    updateField(
                      "faculty",
                      event.target.value,
                    )
                  }
                  className="register-input"
                />
              </div>

              <div>
                <label
                  className="register-label"
                  htmlFor="studyProgram"
                >
                  Program Studi *
                </label>

                <input
                  id="studyProgram"
                  type="text"
                  placeholder="Contoh: Teknik Industri"
                  value={form.studyProgram}
                  onChange={(event) =>
                    updateField(
                      "studyProgram",
                      event.target.value,
                    )
                  }
                  className="register-input"
                />
              </div>
            </div>

            <div>
              <label
                className="register-label"
                htmlFor="enrollmentYear"
              >
                Tahun Masuk
              </label>

              <input
                id="enrollmentYear"
                type="number"
                min="2000"
                max="2100"
                placeholder="Contoh: 2026"
                value={form.enrollmentYear}
                onChange={(event) =>
                  updateField(
                    "enrollmentYear",
                    event.target.value,
                  )
                }
                className="register-input"
              />
            </div>

            <div className="register-section-title register-account-title">
              KONTAK & AKUN
            </div>

            <div className="register-two-column">
              <div>
                <label
                  className="register-label"
                  htmlFor="email"
                >
                  Email *
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  className="register-input"
                />
              </div>

              <div>
                <label
                  className="register-label"
                  htmlFor="phone"
                >
                  Nomor HP
                </label>

                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  className="register-input"
                />
              </div>
            </div>

            <div>
              <label
                className="register-label"
                htmlFor="password"
              >
                Password *
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(event) =>
                  updateField(
                    "password",
                    event.target.value,
                  )
                }
                className="register-input"
              />
            </div>

            <div>
              <label
                className="register-label"
                htmlFor="confirmPassword"
              >
                Konfirmasi Password *
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password"
                value={form.confirmPassword}
                onChange={(event) =>
                  updateField(
                    "confirmPassword",
                    event.target.value,
                  )
                }
                className="register-input"
              />
            </div>

            {error && (
              <div className="register-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="register-button"
            >
              {loading
                ? "Mendaftarkan..."
                : "Daftar sebagai Anggota"}
              <span>→</span>
            </button>
          </form>

          <div className="register-divider">
            <span>atau</span>
          </div>

          <div className="register-login">
            Sudah memiliki akun?{" "}
            <a href="/login">Masuk ke Login</a>
          </div>
        </div>

        <div className="register-footer">
          Perpustakaan Universitas Medan Area
        </div>
      </section>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          padding: 40px 20px;
          background:
            radial-gradient(
              circle at 50% 15%,
              rgba(37, 99, 235, 0.08),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #f8fbff 0%,
              #eef5ff 48%,
              #f8fbff 100%
            );
          color: #10213f;
        }

        .register-grid {
          position: absolute;
          inset: 0;
          opacity: 0.3;
          background-image:
            linear-gradient(
              rgba(37, 99, 235, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.035) 1px,
              transparent 1px
            );
          background-size: 42px 42px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 80%
          );
          pointer-events: none;
        }

        .register-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(3px);
          pointer-events: none;
        }

        .register-orb-one {
          width: 280px;
          height: 280px;
          top: -100px;
          right: -60px;
          background: rgba(37, 99, 235, 0.1);
        }

        .register-orb-two {
          width: 220px;
          height: 220px;
          bottom: -100px;
          left: -60px;
          background: rgba(14, 165, 233, 0.08);
        }

        .register-shell {
          width: 100%;
          max-width: 720px;
          position: relative;
          z-index: 2;
        }

        .register-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 26px;
        }

        .register-brand-mark {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: linear-gradient(
            145deg,
            #1677ff,
            #1355d8
          );
          color: white;
          font-size: 25px;
          font-weight: 800;
          box-shadow:
            0 14px 30px rgba(30, 91, 214, 0.2),
            inset 0 1px 0
              rgba(255, 255, 255, 0.35);
        }

        .register-brand-name {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #31517f;
        }

        .register-brand-subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: #8b9bb3;
        }

        .register-card {
          padding: 42px 46px 36px;
          border: 1px solid
            rgba(255, 255, 255, 0.85);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 30px 80px
              rgba(40, 77, 130, 0.12),
            inset 0 1px 0
              rgba(255, 255, 255, 0.9);
        }

        .register-eyebrow {
          margin-bottom: 12px;
          color: #4774bd;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        h1 {
          margin: 0;
          color: #13233f;
          font-size: clamp(34px, 6vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.045em;
          font-weight: 800;
        }

        .register-description {
          margin: 16px 0 30px;
          color: #7b8ba3;
          font-size: 14px;
          line-height: 1.7;
        }

        .register-section-title {
          margin: 0 0 16px;
          color: #4774bd;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .register-account-title {
          margin-top: 12px;
        }

        .register-two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .register-label {
          display: block;
          margin-bottom: 8px;
          color: #52647f;
          font-size: 12px;
          font-weight: 800;
        }

        .register-input {
          width: 100%;
          height: 52px;
          margin-bottom: 17px;
          padding: 0 16px;
          border: 1px solid
            rgba(142, 161, 188, 0.28);
          border-radius: 14px;
          outline: none;
          background: rgba(255, 255, 255, 0.72);
          color: #172b4d;
          font-size: 13px;
          box-sizing: border-box;
          transition: 0.2s ease;
        }

        .register-input::placeholder {
          color: #aab6c7;
        }

        .register-input:focus {
          border-color: rgba(37, 99, 235, 0.5);
          background: white;
          box-shadow:
            0 0 0 4px
              rgba(37, 99, 235, 0.07);
        }

        .register-error {
          margin: 0 0 16px;
          padding: 11px 13px;
          border: 1px solid
            rgba(239, 68, 68, 0.14);
          border-radius: 12px;
          background: rgba(254, 242, 242, 0.8);
          color: #b42318;
          font-size: 12px;
          line-height: 1.5;
        }

        .register-button {
          width: 100%;
          height: 54px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            #1769e8,
            #154dcc
          );
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 12px 25px
              rgba(23, 91, 215, 0.22);
          transition: 0.2s ease;
        }

        .register-button span {
          float: right;
          font-size: 18px;
        }

        .register-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 16px 30px
              rgba(23, 91, 215, 0.27);
        }

        .register-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .register-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 26px 0 18px;
          color: #a2afc0;
          font-size: 11px;
        }

        .register-divider::before,
        .register-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(
            150,
            165,
            185,
            0.2
          );
        }

        .register-login {
          text-align: center;
          color: #8795a9;
          font-size: 11px;
        }

        .register-login a {
          color: #3569bb;
          font-weight: 800;
          text-decoration: none;
        }

        .register-login a:hover {
          text-decoration: underline;
        }

        .register-footer {
          margin-top: 18px;
          text-align: center;
          color: #a0aec0;
          font-size: 10px;
        }

        @media (max-width: 650px) {
          .register-page {
            padding: 28px 14px;
          }

          .register-card {
            padding: 34px 22px 30px;
            border-radius: 24px;
          }

          .register-two-column {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .register-brand {
            margin-bottom: 22px;
          }

          .register-brand-mark {
            width: 48px;
            height: 48px;
            border-radius: 14px;
          }
        }
      `}</style>
    </main>
  );
}
