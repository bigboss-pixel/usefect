"use client";

import SiteHeader from "../../components/SiteHeader";
import AdminSidebar from "./components/AdminSidebar";
import {
  BookOpen,
  ClipboardList,
  Settings,
  Users,
  ShieldCheck,
  LayoutDashboard,
  Tags,
  Package,
  RotateCcw,
  CalendarClock,
  FileSearch,
} from "lucide-react";

const menuItems = [
  {
    title: "Manajemen Buku",
    description: "Kelola koleksi dan informasi buku",
    href: "/admin/buku",
    icon: BookOpen,
  },
  {
    title: "Kategori",
    description: "Kelola kategori koleksi",
    href: "/admin/kategori",
    icon: Tags,
  },
  {
    title: "Eksemplar",
    description: "Kelola salinan fisik buku",
    href: "/admin/buku",
    icon: Package,
  },
  {
    title: "Peminjaman",
    description: "Kelola transaksi peminjaman",
    href: "/admin/peminjaman/kelola",
    icon: ClipboardList,
  },
  {
    title: "Pengembalian",
    description: "Proses pengembalian buku",
    href: "/admin/peminjaman/kelola",
    icon: RotateCcw,
  },
  {
    title: "Reservasi",
    description: "Kelola antrean reservasi",
    href: "/admin/reservasi",
    icon: CalendarClock,
  },
  {
    title: "Pengguna",
    description: "Kelola pengguna USEFECT",
    href: "/admin/pengguna",
    icon: Users,
  },
  {
    title: "Audit Log",
    description: "Riwayat aktivitas sistem",
    href: "/admin/audit-log",
    icon: FileSearch,
  },
  {
    title: "Pengaturan",
    description: "Konfigurasi sistem",
    href: "/admin/pengaturan",
    icon: Settings,
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <SiteHeader />

      <div className="admin-dashboard-shell">
        <AdminSidebar />

        <main className="admin-dashboard-main">
          <section className="admin-workspace-hero">
            <div>
              <div className="admin-workspace-eyebrow">
                USEFECT · ADMIN WORKSPACE
              </div>

              <h1>
                Administration
                <span>Workspace</span>
              </h1>

              <p>
                Kelola koleksi, transaksi, pengguna, dan seluruh operasional
                layanan USEFECT dari satu workspace.
              </p>
            </div>

            <div className="admin-workspace-shield">
              <ShieldCheck size={42} strokeWidth={1.6} />
            </div>
          </section>

          <section className="admin-workspace-overview">
            <div className="admin-workspace-overview-title">
              <LayoutDashboard size={18} />
              <span>Modul Administrasi</span>
            </div>

            <div className="admin-workspace-grid">
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.title}
                    href={item.href}
                    className="admin-workspace-card"
                  >
                    <div className="admin-workspace-card-icon">
                      <Icon size={22} strokeWidth={1.8} />
                    </div>

                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                    </div>

                    <span className="admin-workspace-card-arrow">→</span>
                  </a>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
