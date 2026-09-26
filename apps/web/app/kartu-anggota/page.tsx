 
"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Mail,
  Phone,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Download,
} from "lucide-react";
import { apiFetch } from "../lib/api";

export default function KartuAnggotaPage() {
  const [profile, setProfile] = useState<any>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndQr = async () => {
      try {
        const response = await apiFetch("/auth/me");

        if (!response.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();
        setProfile(data);

        const qrResponse = await apiFetch("/member-qr");

        if (!qrResponse.ok) {
          const errorData = await qrResponse.json().catch(() => null);

          throw new Error(
            errorData?.message || "QR anggota gagal dimuat",
          );
        }

        const qrData = await qrResponse.json();

        if (!qrData?.token) {
          throw new Error("Token QR anggota tidak tersedia");
        }

        setQrValue(qrData.token);
      } catch (error) {
        console.error("Gagal mengambil kartu anggota:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndQr();
  }, []);

  if (loading) {
    return (
      <main className="member-card-page">
        <div className="member-loading">Memuat kartu anggota...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="member-card-page">
        <div className="member-loading">
          Kartu anggota tidak dapat dimuat.
        </div>
      </main>
    );
  }

  const studentProfile = profile.studentProfile;

  if (!studentProfile) {
    return (
      <main className="member-card-page">
        <div className="member-loading">
          Kartu anggota hanya tersedia untuk anggota mahasiswa.
        </div>
      </main>
    );
  }

  const initials =
    profile.fullName
      ?.split(" ")
      .map((name: string) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";


  return (
    <main className="member-card-page">
      <div className="member-bg-grid" />
      <div className="member-orb member-orb-one" />
      <div className="member-orb member-orb-two" />

      <div className="member-container">
        <button
          className="member-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        <div className="member-heading">
          <div className="member-eyebrow">DIGITAL MEMBER ID</div>
          <h1>Kartu Anggota</h1>
          <p>
            Kartu anggota digital USEFECT untuk akses layanan
            Knowledge Hub.
          </p>
        </div>

        <section className="member-card">
          <div className="member-card-top">
            <div className="member-brand">
              <div className="member-brand-mark">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <defs>
                    <linearGradient id="memberUsefectBlue" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#39d5ff" />
                      <stop offset="50%" stopColor="#0b8ff5" />
                      <stop offset="100%" stopColor="#075eea" />
                    </linearGradient>
                    <linearGradient id="memberUsefectGold" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d28d22" />
                      <stop offset="50%" stopColor="#f4b53f" />
                      <stop offset="100%" stopColor="#ffe18a" />
                    </linearGradient>
                  </defs>
                  <path d="M31 14 C19 22 14 35 17 49 C20 63 30 75 46 86 L49 89 L49 68 C41 61 37 53 37 44 C37 34 41 25 48 18 C43 13 36 12 31 14Z" fill="url(#memberUsefectBlue)" />
                  <path d="M69 17 C58 21 49 29 45 39 C40 51 41 66 49 88 C62 80 71 69 75 57 C79 44 77 28 69 17Z" fill="url(#memberUsefectBlue)" />
                  <path d="M50 78 C51 64 55 52 63 43 C69 36 72 27 70 18 C60 21 52 28 48 37 C44 48 45 63 50 78Z" fill="url(#memberUsefectGold)" />
                  <path d="M49 87 C48 72 49 59 53 49 C57 39 64 30 71 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".85" />
                  <path d="M78 8 L80.5 14 L87 16.5 L80.5 19 L78 25 L75.5 19 L69 16.5 L75.5 14Z" fill="#f8c85b" />
                </svg>
              </div>

              <div>
                <div className="member-brand-name">USEFECT</div>
                <div className="member-brand-subtitle">
                  Digital Library Ecosystem
                </div>
              </div>
            </div>

            <div className="member-status">
              <span />
              {profile.isActive ? "AKTIF" : "NONAKTIF"}
            </div>
          </div>

          <div className="member-card-main">
            <div className="member-identity">
              <div className="member-avatar">{initials}</div>

              <div>
                <div className="member-label">NAMA ANGGOTA</div>
                <h2>{profile.fullName}</h2>
                <p>Mahasiswa</p>
              </div>
            </div>

            <div className="member-data-grid">
              <div className="member-data">
                <CreditCard size={17} />
                <div>
                  <span>NPM</span>
                  <strong>{studentProfile.npm}</strong>
                </div>
              </div>

              <div className="member-data">
                <GraduationCap size={17} />
                <div>
                  <span>Program Studi</span>
                  <strong>{studentProfile.studyProgram || "-"}</strong>
                </div>
              </div>

              <div className="member-data">
                <GraduationCap size={17} />
                <div>
                  <span>Fakultas</span>
                  <strong>{studentProfile.faculty || "-"}</strong>
                </div>
              </div>

              <div className="member-data">
                <ShieldCheck size={17} />
                <div>
                  <span>Status</span>
                  <strong>
                    {profile.isActive ? "Anggota Aktif" : "Tidak Aktif"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="member-card-bottom">
            <div className="member-contact">
              <div>
                <Mail size={15} />
                <span>{profile.email}</span>
              </div>

              <div>
                <Phone size={15} />
                <span>{profile.phone || "-"}</span>
              </div>
            </div>

            <div className="member-qr">
              {qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={400}
                  bgColor="#ffffff"
                  fgColor="#10213f"
                  level="L"
                />
              ) : (
                <div
                  style={{
                    width: 112,
                    height: 112,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "#758093",
                    textAlign: "center",
                  }}
                >
                  Memuat QR...
                </div>
              )}
              <span>SCAN MEMBER</span>
            </div>
          </div>

          <div className="member-card-footer">
            <span>USEFECT · KNOWLEDGE HUB</span>
            <span>USEFECT</span>
          </div>
        </section>

        <div className="member-note">
          <ShieldCheck size={18} />

          <div>
            <strong>Kartu anggota digital</strong>
            <p>
              Gunakan QR Code ini saat melakukan transaksi
              di USEFECT.
            </p>
          </div>
        </div>

        <button
          className="member-print"
          type="button"
          onClick={() => window.print()}
        >
          <Download size={16} />
          Cetak / Simpan Kartu
        </button>
      </div>

      <style jsx>{`
        .member-card-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 42px 20px 60px;
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(37, 99, 235, 0.09),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              #f8fbff 0%,
              #eef5ff 48%,
              #f8fbff 100%
            );
          color: #10213f;
        }

        .member-bg-grid {
          position: absolute;
          inset: 0;
          opacity: 0.25;
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
          mask-image: linear-gradient(to bottom, black, transparent 80%);
          pointer-events: none;
        }

        .member-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(4px);
          pointer-events: none;
        }

        .member-orb-one {
          width: 300px;
          height: 300px;
          top: -130px;
          right: -80px;
          background: rgba(37, 99, 235, 0.1);
        }

        .member-orb-two {
          width: 240px;
          height: 240px;
          bottom: -100px;
          left: -80px;
          background: rgba(14, 165, 233, 0.08);
        }

        .member-container {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .member-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: #58708f;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          margin-bottom: 34px;
        }

        .member-heading {
          margin-bottom: 24px;
        }

        .member-eyebrow {
          color: #4774bd;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          margin-bottom: 9px;
        }

        .member-heading h1 {
          margin: 0;
          color: #13233f;
          font-size: clamp(34px, 6vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.045em;
        }

        .member-heading p {
          max-width: 520px;
          margin: 13px 0 0;
          color: #7b8ba3;
          font-size: 14px;
          line-height: 1.7;
        }

        .member-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 30px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.91),
              rgba(246, 250, 255, 0.82)
            );
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 32px 90px rgba(40, 77, 130, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .member-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 26px 30px;
          border-bottom: 1px solid rgba(94, 119, 153, 0.1);
        }

        .member-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .member-brand-mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          flex: 0 0 48px;
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .member-brand-mark svg {
          width: 46px;
          height: 46px;
          display: block;
        }

        .member-brand-name {
          color: #31517f;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .member-brand-subtitle {
          margin-top: 3px;
          color: #8b9bb3;
          font-size: 10px;
        }

        .member-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.06);
          color: #3569bb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .member-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2f9e62;
          box-shadow: 0 0 0 4px rgba(47, 158, 98, 0.1);
        }

        .member-card-main {
          padding: 30px;
        }

        .member-identity {
          display: flex;
          align-items: center;
          gap: 17px;
          margin-bottom: 30px;
        }

        .member-avatar {
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: linear-gradient(145deg, #eaf2ff, #dceaff);
          color: #2162c7;
          font-size: 22px;
          font-weight: 900;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 10px 25px rgba(47, 94, 160, 0.1);
        }

        .member-label {
          margin-bottom: 5px;
          color: #8292a8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.15em;
        }

        .member-identity h2 {
          margin: 0;
          color: #172b4d;
          font-size: clamp(19px, 4vw, 26px);
          letter-spacing: -0.025em;
        }

        .member-identity p {
          margin: 5px 0 0;
          color: #8190a5;
          font-size: 11px;
        }

        .member-data-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .member-data {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 15px;
          border: 1px solid rgba(126, 149, 181, 0.12);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.58);
        }

        .member-data svg {
          color: #3971c4;
          flex: 0 0 auto;
        }

        .member-data span {
          display: block;
          margin-bottom: 4px;
          color: #8a99ad;
          font-size: 9px;
          font-weight: 700;
        }

        .member-data strong {
          display: block;
          color: #30496c;
          font-size: 12px;
          line-height: 1.4;
        }

        .member-card-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 25px 30px;
          border-top: 1px solid rgba(94, 119, 153, 0.1);
        }

        .member-contact {
          display: grid;
          gap: 10px;
        }

        .member-contact div {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #75859b;
          font-size: 10px;
        }

        .member-contact svg {
          color: #5b7fb7;
        }

        .member-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 9px;
          border-radius: 13px;
          background: white;
          box-shadow: 0 10px 25px rgba(42, 74, 119, 0.1);
        }

        .member-qr span {
          color: #75859b;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .member-card-footer {
          display: flex;
          justify-content: space-between;
          padding: 13px 30px;
          background: rgba(235, 243, 255, 0.72);
          color: #8292a8;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .member-note {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 18px;
          padding: 17px 19px;
          border: 1px solid rgba(37, 99, 235, 0.1);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.56);
        }

        .member-note svg {
          color: #3971c4;
          margin-top: 1px;
          flex: 0 0 auto;
        }

        .member-note strong {
          color: #405979;
          font-size: 11px;
        }

        .member-note p {
          margin: 4px 0 0;
          color: #8a98aa;
          font-size: 10px;
          line-height: 1.5;
        }

        .member-print {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 48px;
          margin-top: 14px;
          border: 1px solid rgba(37, 99, 235, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.68);
          color: #3569bb;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .member-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          color: #71839d;
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .member-card-page {
            padding: 28px 15px 45px;
          }

          .member-card {
            border-radius: 24px;
          }

          .member-card-top,
          .member-card-main,
          .member-card-bottom {
            padding-left: 20px;
            padding-right: 20px;
          }

          .member-card-top {
            align-items: flex-start;
            gap: 12px;
          }

          .member-brand-mark {
            width: 43px;
            height: 43px;
          }

          .member-status {
            padding: 6px 9px;
          }

          .member-data-grid {
            grid-template-columns: 1fr;
          }

          .member-card-bottom {
            align-items: flex-start;
          }

          .member-contact {
            max-width: calc(100% - 125px);
            overflow: hidden;
          }

          .member-contact div span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .member-qr {
            flex: 0 0 auto;
          }

          .member-card-footer {
            padding-left: 20px;
            padding-right: 20px;
            gap: 10px;
          }

          .member-card-footer span:first-child {
            max-width: 65%;
          }
        }

        @media print {
          .member-card-page {
            padding: 0;
            background: white;
          }

          .member-bg-grid,
          .member-orb,
          .member-back,
          .member-heading,
          .member-note,
          .member-print {
            display: none !important;
          }

          .member-container {
            max-width: 760px;
            padding-top: 20px;
          }

          .member-card {
            box-shadow: none;
          }
        }
      `}</style>
    </main>
  );
}
