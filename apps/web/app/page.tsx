"use client";

import SiteHeader from "../components/SiteHeader";
import UsefectHeroIllustration from "../components/UsefectHeroIllustration";
import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";

import {
  Archive,
  ArrowRight,
  BookOpen,
  Bookmark,
  CalendarDays,
  Info,
  FileText,
  FlaskConical,
  GraduationCap,
  Grid2X2,
  Heart,
  House,
  LibraryBig,
  Menu,
  Newspaper,
  PlaySquare,
  Search,
  UserRound,
  Video,
  Bell,
  ChevronDown,
  ChevronRight,
  BookMarked,
  Smartphone,
  User,
  Settings,
  LogOut,
} from "lucide-react";

type QuickService = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const quickServices: QuickService[] = [
  {
    icon: LibraryBig,
    title: "Buku",
    subtitle: "Koleksi lengkap",
  },
  {
    icon: Newspaper,
    title: "Jurnal",
    subtitle: "Publikasi ilmiah",
  },
  {
    icon: GraduationCap,
    title: "Skripsi",
    subtitle: "Karya mahasiswa",
  },
  {
    icon: FlaskConical,
    title: "Penelitian",
    subtitle: "Hasil riset dosen",
  },
  {
    icon: BookOpen,
    title: "E-Book",
    subtitle: "Baca online",
  },
  {
    icon: PlaySquare,
    title: "Video",
    subtitle: "Pembelajaran",
  },
  {
    icon: Archive,
    title: "Repositori",
    subtitle: "Koleksi digital",
  },
  {
    icon: Grid2X2,
    title: "Layanan",
    subtitle: "Semua layanan",
  },
];

const agendas = [
  {
    title: "Seminar Nasional Teknik Industri 2026",
    date: "14 September 2026",
    icon: CalendarDays,
  },
  {
    title: "Workshop Penulisan Jurnal Internasional",
    date: "10 September 2026",
    icon: FileText,
  },
  {
    title: "Ruang Baca Modern Telah Dibuka",
    date: "5 September 2026",
    icon: LibraryBig,
  },
  {
    title: "Perpanjangan Akses E-Book",
    date: "1 September 2026",
    icon: BookOpen,
  },
];

function Arrow() {
  return <ArrowRight size={16} strokeWidth={2.2} />;
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [books, setBooks] = useState<any[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await apiFetch(
        "/books?limit=5&sortBy=publicationYear&sortOrder=desc",
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data buku");
        }

        const data = await response.json();

        setBooks(data.data ?? data);
      } catch (error) {
        console.error("Gagal mengambil koleksi buku:", error);
      } finally {
        setBooksLoading(false);
      }
    };

    fetchBooks();

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

const handleLogout = async () => {
  setLoggingOut(true);

  try {
    const response = await fetch(
      "http://localhost:3001/auth/logout",
      {
        method: "POST",
        credentials: "include",
      }
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

  const handleSearch = () => {
    if (!search.trim()) return;

    window.location.href = `/katalog?search=${encodeURIComponent(search)}`;
  };

  useEffect(() => {
    let mounted = true;

    const fetchUnreadNotificationCount = async () => {
      try {
        const response = await apiFetch("/notifications/unread-count");

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

  return (
    <main className="library-page">

      {/* ================= HEADER ================= */}

            <SiteHeader />


      {/* ================= HERO ================= */}

      <section className="hero">

        <div className="hero-background">

          <UsefectHeroIllustration />

          <div className="hero-image-overlay" />

        </div>

        <div className="hero-content">

          <div className="hero-copy">

            <div className="eyebrow">
              CONNECTED TODAY
              <span>A BRIGHTER TOMORROW</span>
            </div>

            <h1>
              Building a smarter <em>future</em>
            </h1>

            <p>
              through connected knowledge, intelligent technology, and limitless opportunities.
            </p>

            <div className="hero-stats">

              <div>
                <strong>125.430+</strong>
                <span>Buku Digital</span>
              </div>

              <div>
                <strong>38.920+</strong>
                <span>Jurnal & Artikel</span>
              </div>

              <div>
                <strong>12.540+</strong>
                <span>Skripsi & Tesis</span>
              </div>

              <div>
                <strong>8.421+</strong>
                <span>Pengguna Aktif</span>
              </div>

            </div>

          </div>


        </div>


        {/* ================= SEARCH ================= */}

        <div className="search-wrapper">

          <div className="search-box">

            <span className="search-icon">
              <Search size={21} strokeWidth={2} />
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Cari buku, jurnal, skripsi, penulis, atau topik..."
            />

            <button className="collection-select">
              Semua Koleksi
              <ChevronDown size={15} />
            </button>

            <button
              className="search-button"
              onClick={handleSearch}
            >
              Cari
              <Arrow />
            </button>

          </div>


          <div className="popular-search">

            <strong>Pencarian populer:</strong>

            {[
              "Manajemen Operasi",
              "Teknik Industri",
              "K3",
              "Supply Chain",
              "Ergonomi",
              "Ekonomi",
              "Hukum",
              "Skripsi UMA",
            ].map((item) => (

              <button
                key={item}
                onClick={() => {

                  setSearch(item);

                  window.location.href =
                    `/katalog?search=${encodeURIComponent(item)}`;

                }}
              >
                {item}
              </button>

            ))}

          </div>

        </div>

      </section>


      {/* ================= CONTENT ================= */}

      <section className="content-container">


        {/* ================= QUICK SERVICES ================= */}

        <div className="quick-services">

          {quickServices.map(
            ({ icon: Icon, title, subtitle }) => (

              <a
                href="#"
                className="service-card"
                key={title}
              >

                <div className="service-icon">

                  <Icon
                    size={25}
                    strokeWidth={1.8}
                  />

                </div>

                <strong>
                  {title}
                </strong>

                <span>
                  {subtitle}
                </span>

              </a>

            )
          )}

        </div>


        <div className="dashboard-grid">

          <div className="main-column">


            {/* ================= COLLECTION ================= */}

            <section className="collection-section">

              <div className="section-heading">

                <div>

                  <h2>
                    Koleksi Terbaru
                  </h2>

                  <div className="category-tabs">

                    <button className="selected">
                      Semua
                    </button>

                    <button>
                      Teknik Industri
                    </button>

                    <button>
                      Manajemen
                    </button>

                    <button>
                      Hukum
                    </button>

                    <button>
                      Ekonomi
                    </button>

                    <button>
                      Kesehatan
                    </button>

                    <button>
                      Lainnya
                      <ChevronDown size={13} />
                    </button>

                  </div>

                </div>

                <a href="/katalog">

                  Lihat Semua
                  <Arrow />

                </a>

              </div>


              <div className="books-grid">

                {books.map((book) => (

                  <article
                    className="book-card"
                    key={book.title}
                  >

                    <div className="book-cover cover-operations">

                      <small>
                        KNOWLEDGE HUB
                      </small>

                      <strong>
                        {book.title}
                      </strong>

                      <span>
                        PERPUSTAKAAN DIGITAL
                      </span>

                    </div>

                    <h3>
                      {book.title}
                    </h3>

                    <p>
                      {book.author}
                    </p>

                    <div className="book-bottom">

<span
  className={
    book.availability?.isAvailable
      ? "available"
      : "unavailable"
  }
>
  <i />
  {book.availability?.isAvailable
    ? "Tersedia"
    : "Tidak tersedia"}
</span>

                      <button
                        aria-label={`Simpan ${book.title}`}
                      >
                        <Heart
                          size={18}
                          strokeWidth={1.8}
                        />
                      </button>

                    </div>

                  </article>

                ))}

              </div>

            </section>


            {/* ================= PROMO ================= */}

            <section className="promo-grid">


              <div className="promo reading-room">

                <div>

                  <small>
                    USEFECT SPACE
                  </small>

                  <h3>
                    Ruang Baca Modern
                  </h3>

                  <p>
                    Nyaman, lengkap, dan mendukung
                    fokus belajar Anda.
                  </p>

                  <button>
                    Lihat Fasilitas
                    <Arrow />
                  </button>

                </div>

              </div>


              <div className="promo mobile-app">

                <div>

                  <small>
                    USEFECT APP
                  </small>

                  <h3>
                    Akses Kapan Saja
                    <br />
                    di Mana Saja
                  </h3>

                  <p>
                    Access USEFECT anywhere through the mobile experience
                    untuk pengalaman lebih baik.
                  </p>

                  <button>
                    Download Aplikasi
                    <Arrow />
                  </button>

                </div>

              </div>


              <div className="promo ai-library">

                <div className="usefect-ai-logo">
                  <svg
            className="usefect-logo usefect-ai-master-logo"
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
                </div>

                <div>

                  <small>
                    USEFECT AI
                  </small>

                  <h3>
                    Tanya
                    <br />
                    USEFECT AI
                  </h3>

                  <p>
                    Chat, analisis gambar dan file,
                    serta jelajahi sumber pengetahuan.
                  </p>

                  <button>
                    Mulai Chat
                    <Arrow />
                  </button>

                </div>

              </div>

            </section>

          </div>


          {/* ================= SIDEBAR ================= */}

          <aside className="sidebar">


            {/* ================= STUDENT ================= */}

<section
  className="student-card"
  onClick={() => {
    window.location.href = "/profil";
  }}
  style={{ cursor: "pointer" }}
>
  <div className="student-profile">           

                <div className="large-avatar">
                  DH
                </div>

<div>

  <strong>
    {profileLoading
      ? "Memuat..."
      : profile?.fullName ?? "Tamu"}
  </strong>

  <span>
  {profileLoading
    ? "Memuat profil..."
    : profile?.studentProfile?.studyProgram
      ? `Mahasiswa · ${profile.studentProfile.studyProgram}`
      : profile?.roles?.join(" · ") ?? "Pengguna"}
</span>

</div>

                <ChevronRight size={19} />

              </div>


              <div className="student-stats">


                <div>

                  <span>
                    <BookMarked size={17} />
                  </span>

                  <small>
                    Peminjaman
                  </small>

                  <strong>
                    3
                  </strong>

                </div>


                <div>

                  <span>
                    <Bookmark size={17} />
                  </span>

                  <small>
                    Reservasi
                  </small>

                  <strong>
                    1
                  </strong>

                </div>


                <div>

                  <span>
                    <Heart size={17} />
                  </span>

                  <small>
                    Favorit
                  </small>

                  <strong>
                    12
                  </strong>

                </div>


                <div>

                  <span>
                    <FileText size={17} />
                  </span>

                  <small>
                    Riwayat
                  </small>

                  <strong>
                    24
                  </strong>

                </div>


              </div>

            </section>


            {/* ================= AGENDA ================= */}

            <section className="agenda-card">

              <div className="agenda-heading">

                <h2>
                  Agenda & Informasi
                </h2>

                <a href="#">

                  Lihat Semua
                  <Arrow />

                </a>

              </div>


              <div className="agenda-list">

                {agendas.map(
                  (agenda, index) => {

                    const Icon = agenda.icon;

                    return (

                      <div
                        className="agenda-item"
                        key={agenda.title}
                      >

                        <div
                          className={`agenda-icon agenda-${index}`}
                        >

                          <Icon
                            size={17}
                            strokeWidth={1.9}
                          />

                        </div>


                        <div>

                          <strong>
                            {agenda.title}
                          </strong>

                          <span>
                            {agenda.date}
                          </span>

                        </div>


                        {index === 0 && (
                          <b>
                            Baru
                          </b>
                        )}

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          </aside>

        </div>

      </section>

    </main>
  );
}
