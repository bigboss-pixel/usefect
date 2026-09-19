"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  ArrowLeft,
  Mail,
  User,
  CreditCard,
  GraduationCap,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

export default function ProfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
         const response = await apiFetch("/auth/me");

        if (!response.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Gagal mengambil profil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-loading">
          Memuat profil...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <div className="profile-error">
          Profil tidak dapat dimuat.
        </div>
      </main>
    );
  }

  const studentProfile = profile.studentProfile;

  return (
    <main className="profile-page">
      <div className="profile-container">

        <button
          className="profile-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        <section className="profile-hero">
          <div className="profile-avatar">
            {profile.fullName
              ?.split(" ")
              .map((name: string) => name[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>

          <div className="profile-hero-info">
            <h1>{profile.fullName}</h1>

            <p>
              {studentProfile?.studyProgram
                ? `Mahasiswa · ${studentProfile.studyProgram}`
                : profile.roles?.join(" · ") ?? "Pengguna"}
            </p>

            {studentProfile?.npm && (
              <span>
                NPM {studentProfile.npm}
              </span>
            )}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <User size={20} />
            <h2>Informasi Pribadi</h2>
          </div>

          <div className="profile-grid">

            <div className="profile-item">
              <div className="profile-item-icon">
                <User size={18} />
              </div>

              <div>
                <span>Nama Lengkap</span>
                <strong>{profile.fullName}</strong>
              </div>
            </div>

            <div className="profile-item">
              <div className="profile-item-icon">
                <Mail size={18} />
              </div>

              <div>
                <span>Email</span>
                <strong>{profile.email}</strong>
              </div>
            </div>

            <div className="profile-item">
              <div className="profile-item-icon">
                <User size={18} />
              </div>

              <div>
                <span>Username</span>
                <strong>{profile.username ?? "-"}</strong>
              </div>
            </div>

            <div className="profile-item">
              <div className="profile-item-icon">
                <CreditCard size={18} />
              </div>

              <div>
                <span>Nomor Telepon</span>
                <strong>{profile.phone ?? "-"}</strong>
              </div>
            </div>

          </div>
        </section>

        {studentProfile && (
          <section className="profile-section">
            <div className="profile-section-title">
              <GraduationCap size={20} />
              <h2>Informasi Akademik</h2>
            </div>

            <div className="profile-grid">

              <div className="profile-item">
                <div className="profile-item-icon">
                  <CreditCard size={18} />
                </div>

                <div>
                  <span>NPM</span>
                  <strong>{studentProfile.npm}</strong>
                </div>
              </div>

              <div className="profile-item">
                <div className="profile-item-icon">
                  <GraduationCap size={18} />
                </div>

                <div>
                  <span>Fakultas</span>
                  <strong>{studentProfile.faculty ?? "-"}</strong>
                </div>
              </div>

              <div className="profile-item">
                <div className="profile-item-icon">
                  <GraduationCap size={18} />
                </div>

                <div>
                  <span>Program Studi</span>
                  <strong>
                    {studentProfile.studyProgram ?? "-"}
                  </strong>
                </div>
              </div>

              <div className="profile-item">
                <div className="profile-item-icon">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <span>Tahun Masuk</span>
                  <strong>
                    {studentProfile.enrollmentYear ?? "-"}
                  </strong>
                </div>
              </div>

            </div>
          </section>
        )}

        <section className="profile-section">
          <div className="profile-section-title">
            <ShieldCheck size={20} />
            <h2>Status Akun</h2>
          </div>

          <div className="profile-status">

            <div>
              <span>Status</span>

              <strong className="status-active">
                <i />
                {profile.isActive
                  ? "Akun Aktif"
                  : "Akun Tidak Aktif"}
              </strong>
            </div>

            <div>
              <span>Role Sistem</span>

              <strong>
                {profile.roles?.join(" · ") ?? "-"}
              </strong>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}