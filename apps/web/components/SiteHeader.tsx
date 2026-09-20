"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  BookOpen,
  Newspaper,
  FlaskConical,
  Grid2X2,
  Info,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "../app/lib/api";

export default function SiteHeader() {
  const pathname = usePathname();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch("/auth/me");

        if (!response.ok) {
          throw new Error("Gagal mengambil profil");
        }

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Gagal mengambil profil:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchUnreadNotificationCount = async () => {
      try {
        const response = await apiFetch(
          "/notifications/unread-count",
        );

        if (!response.ok) {
          return;
        }

        const result = await response.json();

        if (!mounted) {
          return;
        }

        const count =
          typeof result === "number"
            ? result
            : Number(
                result?.count ??
                  result?.unreadCount ??
                  result?.data?.count ??
                  0,
              );

        setUnreadNotificationCount(
          Number.isFinite(count) ? count : 0,
        );
      } catch (error) {
        console.error(
          "Gagal mengambil jumlah notifikasi:",
          error,
        );
      }
    };

    fetchUnreadNotificationCount();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const response = await fetch(
        "http://localhost:3001/auth/logout",
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Logout gagal");
      }

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout gagal:", error);
      setLoggingOut(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="top-header">

      <div className="brand-area">

        <a className="usefect-brand" href="/">

          <svg
            className="usefect-logo"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="usefectBlueGlobal"
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
                id="usefectGoldGlobal"
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
              fill="url(#usefectBlueGlobal)"
            />

            <path
              d="M69 17
                 C58 21 49 29 45 39
                 C40 51 41 66 49 88
                 C62 80 71 69 75 57
                 C79 44 77 28 69 17Z"
              fill="url(#usefectBlueGlobal)"
            />

            <path
              d="M50 78
                 C51 64 55 52 63 43
                 C69 36 72 27 70 18
                 C60 21 52 28 48 37
                 C44 48 45 63 50 78Z"
              fill="url(#usefectGoldGlobal)"
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

          <div className="usefect-wordmark">
            <strong>USEFECT</strong>
            <small>A SMARTER TOMORROW, TOGETHER.</small>
          </div>

        </a>

      </div>

      <nav className="desktop-nav">


        <a
          className={isActive("/katalog") ? "active" : ""}
          href="/katalog"
        >
          <Search size={16} strokeWidth={2} />
          Katalog
        </a>

        <a
          className={isActive("/reservasi") ? "active" : ""}
          href="/reservasi"
        >
          <BookOpen size={16} strokeWidth={2} />
          Reservasi
        </a>

        <a href="#">
          <Newspaper size={16} strokeWidth={2} />
          Jurnal
        </a>

        <a href="#">
          <FlaskConical size={16} strokeWidth={2} />
          Penelitian
        </a>

        <a href="#">
          <BookOpen size={16} strokeWidth={2} />
          E-Book
        </a>

        <a
          className={isActive("/peminjaman") ? "active" : ""}
          href="/peminjaman"
        >
          <Grid2X2 size={16} strokeWidth={2} />
          Layanan
        </a>

        <a href="#">
          <Info size={16} strokeWidth={2} />
          Tentang
        </a>

      </nav>

      <div className="header-actions">

        <button
          className="icon-button"
          aria-label="Cari"
        >
          <Search size={19} strokeWidth={2} />
        </button>

        <a
          href="/notifikasi"
          className={`icon-button notification${
            isActive("/notifikasi") ? " active" : ""
          }`}
          aria-label="Notifikasi"
        >
          <Bell size={19} strokeWidth={2} />

          {unreadNotificationCount > 0 && (
            <span className="notification-badge">
              {unreadNotificationCount > 9
                ? "9+"
                : unreadNotificationCount}
            </span>
          )}
        </a>

        <div className="profile-menu-wrapper">

          <button
            className="profile-mini"
            onClick={() => {
              setProfileMenuOpen(!profileMenuOpen);
            }}
          >
            <div className="avatar">
              DH
            </div>

            <div className="profile-text">
              <strong>
                {profileLoading
                  ? "Memuat..."
                  : profile?.fullName ?? "Tamu"}
              </strong>

              <small>
                {profileLoading
                  ? "Memuat..."
                  : profile?.studentProfile?.studyProgram
                    ? `Mahasiswa · ${profile.studentProfile.studyProgram}`
                    : profile?.roles?.join(" · ") ?? "Pengguna"}
              </small>
            </div>

            <ChevronDown
              size={16}
              className={
                profileMenuOpen
                  ? "profile-chevron-open"
                  : ""
              }
            />
          </button>

          {profileMenuOpen && (
            <div className="profile-dropdown">

              <button
                onClick={() => {
                  window.location.href = "/profil";
                }}
              >
                <User size={17} />
                <span>Profil Saya</span>
              </button>

              <button
                onClick={() => {
                  alert(
                    "Pengaturan akan tersedia pada tahap berikutnya.",
                  );
                }}
              >
                <Settings size={17} />
                <span>Pengaturan</span>
              </button>

              <div className="profile-dropdown-divider" />

              <button
                className="logout-button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={17} />
                <span>
                  {loggingOut ? "Keluar..." : "Keluar"}
                </span>
              </button>

            </div>
          )}

        </div>

        <button
          className="mobile-menu"
          aria-label="Menu"
        >
          <Menu size={21} />
        </button>

      </div>

    </header>
  );
}
