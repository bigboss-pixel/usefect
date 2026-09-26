"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [npm, setNpm] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!npm.trim() || !password) {
      setError("NPM dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          npm: npm.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Login gagal.");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-grid" />
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-shell">
        <div className="login-brand">
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

        <div className="login-card">
          <div className="login-eyebrow">KNOWLEDGE HUB</div>

          <h1>
            Welcome to
            <em>USEFECT</em>
          </h1>

          <p className="login-description">
            Masuk menggunakan NPM dan password Anda.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="npm">
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
              className="login-input"
            />

            <label className="login-label" htmlFor="password">
              Password
            </label>

            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="login-input password-input"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
                title={
                  showPassword
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9.9 4.3A10.7 10.7 0 0 1 12 4.1c5.2 0 8.7 4.3 9.7 6.1-.4.7-1.2 1.9-2.6 3.1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.2 6.2C4.5 7.3 3.2 8.9 2.3 10.2c1 1.8 4.5 6.1 9.7 6.1 1.2 0 2.3-.2 3.3-.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.3 12s3.5-6.1 9.7-6.1S21.7 12 21.7 12 18.2 18.1 12 18.1 2.3 12 2.3 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="login-forgot">
              <a href="/lupa-password" className="forgot-password">
                Lupa Password?
              </a>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? "Memproses..." : "Masuk ke USEFECT"}
              
            </button>
          </form>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <div className="login-register">
            Belum memiliki akun?{" "}
            <a href="/register">Daftar sebagai anggota</a>
          </div>
        </div>

        <div className="login-footer">
          USEFECT · A SMARTER TOMORROW, TOGETHER.
        </div>
      </section>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          background:
            radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08), transparent 32%),
            linear-gradient(135deg, #f8fbff 0%, #eef5ff 48%, #f8fbff 100%);
          color: #10213f;
        }

        .login-grid {
          position: absolute;
          inset: 0;
          opacity: 0.3;
          background-image:
            linear-gradient(rgba(37, 99, 235, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
          pointer-events: none;
        }

        .login-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(3px);
          pointer-events: none;
        }

        .login-orb-one {
          width: 280px;
          height: 280px;
          top: -100px;
          right: -60px;
          background: rgba(37, 99, 235, 0.1);
        }

        .login-orb-two {
          width: 220px;
          height: 220px;
          bottom: -100px;
          left: -60px;
          background: rgba(14, 165, 233, 0.08);
        }

        .login-shell {
          width: 100%;
          max-width: 540px;
          position: relative;
          z-index: 2;
        }

        .login-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 30px;
        }

        .login-brand-mark {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: linear-gradient(145deg, #1677ff, #1355d8);
          color: white;
          font-size: 25px;
          font-weight: 800;
          box-shadow:
            0 14px 30px rgba(30, 91, 214, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .login-brand-name {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #31517f;
        }

        .login-brand-subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: #8b9bb3;
        }

        .login-card {
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

        .login-eyebrow {
          margin-bottom: 14px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          text-shadow: 0 1px 5px rgba(15, 39, 91, 0.08);
        }

        h1 {
          margin: 0;
          color: #06184d;
          font-size: clamp(35px, 7vw, 48px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          font-weight: 900;
          text-shadow:
            0 2px 4px rgba(15, 39, 91, 0.08),
            0 6px 18px rgba(15, 39, 91, 0.07);
        }

        h1 em {
          display: block;
          margin-top: 2px;
          color: #075eea;
          font-style: normal;
          text-shadow: 0 3px 10px rgba(7, 94, 234, 0.08);
        }

        .login-description {
          margin: 18px 0 30px;
          max-width: 430px;
          color: #7b8ba3;
          font-size: 14px;
          line-height: 1.7;
        }

        .login-label {
          display: block;
          margin-bottom: 9px;
          color: #52647f;
          font-size: 12px;
          font-weight: 800;
        }

        .login-input {
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

        .login-input::placeholder {
          color: #aab6c7;
        }

        .login-input:focus {
          border-color: rgba(37, 99, 235, 0.5);
          background: white;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.07);
        }

        .password-input-wrap {
          position: relative;
          width: 100%;
        }

        .password-input {
          padding-right: 52px;
        }

        .password-input-wrap .login-input {
          margin-bottom: 20px;
        }

        .password-toggle {
          position: absolute;
          top: 0;
          right: 0;
          width: 52px;
          height: 54px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #7b8eaa;
          cursor: pointer;
          border-radius: 0 15px 15px 0;
          transition: 0.2s ease;
        }

        .password-toggle svg {
          width: 19px;
          height: 19px;
          display: block;
        }

        .password-toggle:hover {
          color: #1769e8;
          background: rgba(37, 99, 235, 0.05);
        }

        .login-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: -10px;
          margin-bottom: 20px;
        }

        .forgot-password {
          color: #3569bb;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .forgot-password:hover {
          text-decoration: underline;
        }

        .login-error {
          margin: -5px 0 16px;
          padding: 11px 13px;
          border: 1px solid rgba(239, 68, 68, 0.14);
          border-radius: 12px;
          background: rgba(254, 242, 242, 0.8);
          color: #b42318;
          font-size: 12px;
        }

        .login-button {
          width: 100%;
          height: 54px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(135deg, #1769e8, #154dcc);
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 25px rgba(23, 91, 215, 0.22);
          transition: 0.2s ease;
        }

        .login-button span {
          float: right;
          font-size: 18px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(23, 91, 215, 0.27);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 26px 0 18px;
          color: #a2afc0;
          font-size: 11px;
        }

        .login-divider::before,
        .login-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(150, 165, 185, 0.2);
        }

        .login-register {
          text-align: center;
          color: #8795a9;
          font-size: 11px;
        }

        .login-register a {
          color: #3569bb;
          font-weight: 800;
          text-decoration: none;
        }

        .login-register a:hover {
          text-decoration: underline;
        }

        .login-footer {
          margin-top: 20px;
          text-align: center;
          color: #a0aec0;
          font-size: 10px;
        }

        @media (max-width: 600px) {
          .login-page {
            padding: 30px 16px;
          }

          .login-card {
            padding: 34px 24px 30px;
            border-radius: 24px;
          }

          .login-brand {
            margin-bottom: 24px;
          }

          .login-brand-mark {
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
