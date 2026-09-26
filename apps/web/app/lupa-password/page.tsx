"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type Step = "npm" | "otp" | "password" | "success";

export default function LupaPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("npm");
  const [npm, setNpm] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!npm.trim()) {
      setError("Masukkan NPM terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        "/auth/forgot-password/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            npm: npm.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Permintaan OTP gagal.",
        );
      }

      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (otp.length !== 6) {
      setError("Masukkan OTP 6 digit.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        "/auth/forgot-password/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            npm: npm.trim(),
            otp,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "OTP tidak valid.",
        );
      }

      setResetToken(data.resetToken);
      setStep("password");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        "/auth/forgot-password/reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken,
            newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Password gagal diubah.",
        );
      }

      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  function backToNpm() {
    setStep("npm");
    setOtp("");
    setError("");
  }

  function backToOtp() {
    setStep("otp");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  return (
    <main className="forgot-page">
      <div className="forgot-grid" />
      <div className="forgot-orb forgot-orb-one" />
      <div className="forgot-orb forgot-orb-two" />

      <section className="forgot-shell">
        <div className="forgot-brand">
          <svg
            className="usefect-logo auth-usefect-logo"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="authUsefectBlue"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#39d5ff" />
                <stop offset="50%" stopColor="#0b8ff5" />
                <stop offset="100%" stopColor="#075eea" />
              </linearGradient>

              <linearGradient
                id="authUsefectGold"
                x1="0"
                y1="1"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#d28d22" />
                <stop offset="50%" stopColor="#f4b53f" />
                <stop offset="100%" stopColor="#ffe18a" />
              </linearGradient>
            </defs>

            <path
              d="M31 14
                 C19 22 14 35 17 49
                 C20 63 30 75 46 86
                 L49 89
                 L49 68
                 C41 61 37 53 37 44
                 C37 34 41 25 48 18
                 C43 13 36 12 31 14Z"
              fill="url(#authUsefectBlue)"
            />

            <path
              d="M69 17
                 C58 21 49 29 45 39
                 C40 51 41 66 49 88
                 C62 80 71 69 75 57
                 C79 44 77 28 69 17Z"
              fill="url(#authUsefectBlue)"
            />

            <path
              d="M50 78
                 C51 64 55 52 63 43
                 C69 36 72 27 70 18
                 C60 21 52 28 48 37
                 C44 48 45 63 50 78Z"
              fill="url(#authUsefectGold)"
            />

            <path
              d="M49 87
                 C48 72 49 59 53 49
                 C57 39 64 30 71 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".85"
            />

            <path
              d="M78 8
                 L80.5 14
                 L87 16.5
                 L80.5 19
                 L78 25
                 L75.5 19
                 L69 16.5
                 L75.5 14Z"
              fill="#f8c85b"
            />
          </svg>

          <div className="auth-usefect-wordmark auth-usefect-wordmark-large">
            <strong>USEFECT</strong>
            <small>A SMARTER TOMORROW, TOGETHER.</small>
          </div>
        </div>

        <div className="forgot-card">
          <div className="forgot-eyebrow">ACCOUNT RECOVERY</div>

          <h1>
            Lupa
            <br />
            Password?
          </h1>

          <p className="forgot-description">
            {step === "npm" &&
              "Masukkan NPM Anda untuk memulai proses pemulihan password akun USEFECT."}

            {step === "otp" &&
              "Masukkan kode OTP 6 digit yang telah dikirimkan untuk memverifikasi akun Anda."}

            {step === "password" &&
              "Buat password baru untuk mengamankan kembali akun USEFECT Anda."}

            {step === "success" &&
              "Password akun Anda telah berhasil diperbarui."}
          </p>

          {error && (
            <div className="forgot-error">
              {error}
            </div>
          )}

          {step === "npm" && (
            <form onSubmit={requestOtp}>
              <label className="forgot-label" htmlFor="npm">
                NPM
              </label>

              <input
                id="npm"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="Masukkan NPM"
                value={npm}
                onChange={(event) => setNpm(event.target.value)}
                className="forgot-input"
                disabled={loading}
              />

              <button
                type="submit"
                className="forgot-button"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Lanjutkan"}
                
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <label className="forgot-label" htmlFor="otp">
                KODE OTP
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Masukkan 6 digit OTP"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, ""),
                  )
                }
                className="forgot-input forgot-otp-input"
                disabled={loading}
              />

              <div className="forgot-step-info">
                OTP berlaku selama 10 menit.
              </div>

              <button
                type="submit"
                className="forgot-button"
                disabled={loading}
              >
                {loading ? "Memverifikasi..." : "Verifikasi OTP"}
                
              </button>

              <button
                type="button"
                className="forgot-secondary-button forgot-full-button"
                onClick={backToNpm}
                disabled={loading}
              >
                ← Kembali
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={resetPassword}>
              <label
                className="forgot-label"
                htmlFor="new-password"
              >
                PASSWORD BARU
              </label>

              <div className="forgot-password-wrap">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Masukkan password baru"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  className="forgot-input forgot-password-input"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() =>
                    setShowNewPassword((value) => !value)
                  }
                  aria-label={
                    showNewPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showNewPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5.2 0 8.8 4 10 8-0.4 1.3-1.1 2.5-2 3.5" />
                      <path d="M6.2 6.2C4.5 7.4 3.3 9.2 2 12c1.2 4 4.8 8 10 8 1.5 0 2.9-.3 4.1-.9" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.7" />
                    </svg>
                  )}
                </button>
              </div>

              <label
                className="forgot-label"
                htmlFor="confirm-password"
              >
                KONFIRMASI PASSWORD
              </label>

              <div className="forgot-password-wrap">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="forgot-input forgot-password-input"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showConfirmPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5.2 0 8.8 4 10 8-0.4 1.3-1.1 2.5-2 3.5" />
                      <path d="M6.2 6.2C4.5 7.4 3.3 9.2 2 12c1.2 4 4.8 8 10 8 1.5 0 2.9-.3 4.1-.9" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.7" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="forgot-step-info">
                Password minimal 8 karakter.
              </div>

              <button
                type="submit"
                className="forgot-button"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Ubah Password"}
                
              </button>

              <button
                type="button"
                className="forgot-secondary-button forgot-full-button"
                onClick={backToOtp}
                disabled={loading}
              >
                ← Kembali
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="forgot-success">
              <div className="forgot-success-icon">✓</div>

              <h2>Password berhasil diubah</h2>

              <p>
                Password akun dengan NPM{" "}
                <strong>{npm}</strong> telah diperbarui.
                Silakan login menggunakan password baru Anda.
              </p>

              <button
                type="button"
                className="forgot-button"
                onClick={() => router.push("/login")}
              >
                Kembali ke Login
                
              </button>
            </div>
          )}

          {step !== "success" && (
            <>
              <div className="forgot-divider">
                <span>atau</span>
              </div>

              <div className="forgot-back">
                Ingat password Anda?{" "}
                <a href="/login">Kembali ke Login</a>
              </div>
            </>
          )}
        </div>

        <div className="forgot-footer">
          USEFECT · A SMARTER TOMORROW, TOGETHER.
        </div>
      </section>

      <style jsx>{`
        .forgot-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          background:
            radial-gradient(
              circle at 50% 20%,
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

        .forgot-grid {
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

        .forgot-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(3px);
          pointer-events: none;
        }

        .forgot-orb-one {
          width: 280px;
          height: 280px;
          top: -100px;
          right: -60px;
          background: rgba(37, 99, 235, 0.1);
        }

        .forgot-orb-two {
          width: 220px;
          height: 220px;
          bottom: -100px;
          left: -60px;
          background: rgba(14, 165, 233, 0.08);
        }

        .forgot-shell {
          width: 100%;
          max-width: 540px;
          position: relative;
          z-index: 2;
        }

        .forgot-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 30px;
        }

        .forgot-brand-mark {
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
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .forgot-brand-name {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #31517f;
        }

        .forgot-brand-subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: #8b9bb3;
        }

        .forgot-card {
          padding: 44px 46px 38px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 30px 80px rgba(40, 77, 130, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .forgot-eyebrow {
          margin-bottom: 12px;
          color: #4774bd;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        h1 {
          margin: 0;
          color: #13233f;
          font-size: clamp(35px, 7vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.045em;
          font-weight: 800;
        }

        .forgot-description {
          margin: 18px 0 30px;
          max-width: 430px;
          color: #7b8ba3;
          font-size: 14px;
          line-height: 1.7;
        }

        .forgot-label {
          display: block;
          margin-bottom: 9px;
          color: #52647f;
          font-size: 12px;
          font-weight: 800;
        }

        .forgot-input {
          width: 100%;
          height: 54px;
          margin-bottom: 20px;
          padding: 0 17px;
          border: 1px solid rgba(142, 161, 188, 0.28);
          border-radius: 15px;
          outline: none;
          background: rgba(255, 255, 255, 0.72);
          color: #172b4d;
          font-size: 14px;
          box-sizing: border-box;
          transition: 0.2s ease;
        }

        .forgot-input::placeholder {
          color: #aab6c7;
        }

        .forgot-input:focus {
          border-color: rgba(37, 99, 235, 0.5);
          background: white;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.07);
        }

        .forgot-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .forgot-otp-input {
          text-align: center;
          letter-spacing: 0.35em;
          font-size: 20px;
          font-weight: 800;
        }

        .forgot-button {
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
            0 12px 25px rgba(23, 91, 215, 0.22);
          transition: 0.2s ease;
        }

        .forgot-button span {
          float: right;
          font-size: 18px;
        }

        .forgot-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 16px 30px rgba(23, 91, 215, 0.27);
        }

        .forgot-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .forgot-error {
          margin: -12px 0 20px;
          padding: 12px 14px;
          border: 1px solid rgba(220, 38, 38, 0.12);
          border-radius: 12px;
          background: rgba(254, 242, 242, 0.8);
          color: #b42318;
          font-size: 12px;
          line-height: 1.5;
        }

        .forgot-step-info {
          margin: -7px 0 18px;
          color: #91a0b5;
          font-size: 11px;
          line-height: 1.5;
        }

        .forgot-secondary-button {
          padding: 11px 20px;
          border: 1px solid rgba(37, 99, 235, 0.18);
          border-radius: 12px;
          background: white;
          color: #3569bb;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .forgot-full-button {
          width: 100%;
          margin-top: 12px;
        }

        .forgot-secondary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .forgot-password-wrap {
          position: relative;
        }

        .forgot-password-input {
          padding-right: 58px;
        }

        .forgot-password-toggle {
          position: absolute;
          top: 0;
          right: 0;
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #7b8eaa;
          cursor: pointer;
        }

        .forgot-password-toggle svg {
          width: 19px;
          height: 19px;
        }

        .forgot-success {
          text-align: center;
          padding: 8px 0;
        }

        .forgot-success-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.1);
          color: #1769e8;
          font-size: 22px;
          font-weight: 900;
        }

        .forgot-success h2 {
          margin: 0 0 10px;
          color: #172b4d;
          font-size: 20px;
        }

        .forgot-success p {
          margin: 0 auto 20px;
          max-width: 390px;
          color: #7b8ba3;
          font-size: 13px;
          line-height: 1.7;
        }

        .forgot-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 26px 0 18px;
          color: #a2afc0;
          font-size: 11px;
        }

        .forgot-divider::before,
        .forgot-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(150, 165, 185, 0.2);
        }

        .forgot-back {
          text-align: center;
          color: #8795a9;
          font-size: 11px;
        }

        .forgot-back a {
          color: #3569bb;
          font-weight: 800;
          text-decoration: none;
        }

        .forgot-back a:hover {
          text-decoration: underline;
        }

        .forgot-footer {
          margin-top: 20px;
          text-align: center;
          color: #a0aec0;
          font-size: 10px;
        }

        @media (max-width: 600px) {
          .forgot-page {
            padding: 30px 16px;
          }

          .forgot-card {
            padding: 34px 24px 30px;
            border-radius: 24px;
          }

          .forgot-brand {
            margin-bottom: 24px;
          }

          .forgot-brand-mark {
            width: 48px;
            height: 48px;
            border-radius: 14px;
          }
        }

        .auth-usefect-wordmark-large {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }

        .auth-usefect-wordmark-large strong {
          display: block;
          font-size: 30px;
          line-height: 1;
          letter-spacing: 0.16em;
          font-weight: 800;
          color: #17345f;
        }

        .auth-usefect-wordmark-large small {
          display: block;
          font-size: 8px;
          line-height: 1.2;
          letter-spacing: 0.24em;
          font-weight: 600;
          color: #8090a8;
          white-space: nowrap;
        }

        .auth-usefect-logo {
          width: 68px;
          height: 68px;
          flex-shrink: 0;
        }

      `}</style>
    </main>
  );
}
