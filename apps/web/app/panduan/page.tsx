import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LibraryBig,
  Search,
} from "lucide-react";

export default function PanduanPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#10233f",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e8edf3",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#10233f",
              textDecoration: "none",
            }}
          >
            <LibraryBig size={25} />

            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: "14px",
                }}
              >
                PERPUSTAKAAN UMA
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  fontSize: "12px",
                  color: "#718096",
                }}
              >
                Universitas Medan Area
              </span>
            </div>
          </Link>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#718096",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Beranda
            </Link>

            <Link
              href="/katalog"
              style={{
                color: "#718096",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Katalog
            </Link>

            <Link
              href="/panduan"
              style={{
                color: "#10233f",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Panduan
            </Link>
          </nav>
        </div>
      </header>

      <section
        style={{
          padding: "100px 24px",
          background:
            "linear-gradient(135deg, #f7faff 0%, #ffffff 60%, #faf7f0 100%)",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "#b08a45",
            }}
          >
            PANDUAN PERPUSTAKAAN
          </span>

          <h1
            style={{
              margin: "18px 0 20px",
              maxWidth: "800px",
              fontSize: "clamp(42px, 6vw, 70px)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
            }}
          >
            Cara menggunakan
            <br />
            <em>Perpustakaan UMA.</em>
          </h1>

          <p
            style={{
              maxWidth: "650px",
              margin: 0,
              fontSize: "18px",
              lineHeight: 1.8,
              color: "#68778a",
            }}
          >
            Pelajari cara mencari koleksi, melihat ketersediaan buku,
            mengajukan peminjaman, dan menggunakan layanan digital
            Perpustakaan Universitas Medan Area.
          </p>
        </div>
      </section>

      <section
        style={{
          padding: "80px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              margin: "0 0 40px",
              fontSize: "36px",
            }}
          >
            Mulai dari sini
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            <GuideCard
              number="01"
              icon={<Search size={24} />}
              title="Cari buku"
              description="Gunakan katalog untuk mencari buku berdasarkan judul, penulis, ISBN, atau kategori."
            />

            <GuideCard
              number="02"
              icon={<BookOpen size={24} />}
              title="Lihat detail"
              description="Periksa informasi buku, jumlah koleksi, ketersediaan, dan lokasi rak."
            />

            <GuideCard
              number="03"
              icon={<CheckCircle2 size={24} />}
              title="Ajukan peminjaman"
              description="Login ke akun Anda dan ajukan peminjaman buku yang tersedia."
            />

            <GuideCard
              number="04"
              icon={<ArrowRight size={24} />}
              title="Pantau status"
              description="Pantau status pengajuan dan riwayat peminjaman melalui akun Anda."
            />
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "70px 24px",
          background: "#10233f",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "30px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.15em",
                color: "#c5a467",
              }}
            >
              MULAI SEKARANG
            </span>

            <h2
              style={{
                margin: "12px 0 0",
                color: "#ffffff",
                fontSize: "36px",
              }}
            >
              Temukan buku yang Anda butuhkan.
            </h2>
          </div>

          <Link
            href="/katalog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              padding: "15px 22px",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#10233f",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Buka Katalog
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function GuideCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "28px",
        border: "1px solid #e5eaf0",
        borderRadius: "18px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "30px",
        }}
      >
        <span
          style={{
            color: "#b08a45",
            fontSize: "13px",
            fontWeight: 800,
          }}
        >
          {number}
        </span>

        <span style={{ color: "#17365d" }}>{icon}</span>
      </div>

      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "21px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#718096",
          fontSize: "14px",
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  );
}