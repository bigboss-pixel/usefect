"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Search,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Bell,
  User,
  CreditCard,
  Tags,
  Package,
  RotateCcw,
  Users,
  FileSearch,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";

type SiteSidebarProps = {
  profile?: any;
  onLogout?: () => void;
};

type SidebarItem = {
  label: string;
  href: string;
  icon: any;
};

const userItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Katalog",
    href: "/katalog",
    icon: Search,
  },
  {
    label: "Peminjaman",
    href: "/peminjaman",
    icon: ClipboardList,
  },
  {
    label: "Reservasi",
    href: "/reservasi",
    icon: CalendarClock,
  },
  {
    label: "Notifikasi",
    href: "/notifikasi",
    icon: Bell,
  },
  {
    label: "Profil",
    href: "/profil",
    icon: User,
  },
  {
    label: "Kartu Anggota",
    href: "/kartu-anggota",
    icon: CreditCard,
  },
];

const managementItems: SidebarItem[] = [
  {
    label: "Manajemen Buku",
    href: "/admin/buku",
    icon: BookOpen,
  },
  {
    label: "Kategori",
    href: "/admin/kategori",
    icon: Tags,
  },
  {
    label: "Eksemplar",
    href: "/admin/buku",
    icon: Package,
  },
  {
    label: "Peminjaman",
    href: "/admin/peminjaman/kelola",
    icon: ClipboardList,
  },
  {
    label: "Pengembalian",
    href: "/admin/peminjaman/kelola",
    icon: RotateCcw,
  },
  {
    label: "Reservasi",
    href: "/admin/reservasi",
    icon: CalendarClock,
  },
  {
    label: "Pengguna",
    href: "/admin/pengguna",
    icon: Users,
  },
  {
    label: "Audit Log",
    href: "/admin/audit-log",
    icon: FileSearch,
  },
  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    icon: Settings,
  },
];

const superAdminItems: SidebarItem[] = [
  {
    label: "Manajemen Admin",
    href: "/admin/admins",
    icon: ShieldCheck,
  },
];

export default function SiteSidebar({
  profile,
  onLogout,
}: SiteSidebarProps) {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const currentUser = useMemo(() => {
    return profile?.user ?? profile ?? null;
  }, [profile]);

  const roles: string[] = currentUser?.roles ?? [];

  const isAdmin =
    roles.includes("ADMIN") ||
    roles.includes("LIBRARIAN") ||
    roles.includes("SUPER_ADMIN");

  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  useEffect(() => {
    setMounted(true);

    try {
      const saved = window.localStorage.getItem(
        "usefect-sidebar-open",
      );

      if (saved === "true") {
        setOpen(true);
      }
    } catch {
      // localStorage tidak tersedia, gunakan default tertutup
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      window.localStorage.setItem(
        "usefect-sidebar-open",
        open ? "true" : "false",
      );
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "usefect-sidebar-open") {
        return;
      }

      setOpen(event.newValue === "true");
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [mounted]);

  useEffect(() => {
    const handleOpenSidebar = () => {
      setOpen(true);
    };

    window.addEventListener(
      "usefect:open-sidebar",
      handleOpenSidebar,
    );

    return () => {
      window.removeEventListener(
        "usefect:open-sidebar",
        handleOpenSidebar,
      );
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  const closeSidebar = () => {
    setOpen(false);
  };

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;

    return (
      <a
        key={`${item.label}-${item.href}`}
        href={item.href}
        className={`usefect-sidebar-link${
          isActive(item.href) ? " active" : ""
        }`}
      >
        <span
          className={`usefect-sidebar-icon usefect-sidebar-icon-${item.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}`}
        >
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <span>{item.label}</span>
      </a>
    );
  };

  return (
    <>
      <aside
        className={`usefect-sidebar${
          open ? " is-open" : ""
        }`}
        aria-hidden={!open}
      >
        <div className="usefect-sidebar-header">
          <div className="usefect-sidebar-title">
            <div className="usefect-sidebar-title-mark" aria-hidden="true">
<svg
            className="usefect-sidebar-logo"
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
            </div>

            <div>
              <strong>USEFECT</strong>
              <span>KNOWLEDGE HUB</span>
            </div>
          </div>

          <button
            type="button"
            className="usefect-sidebar-close"
            onClick={closeSidebar}
            aria-label="Tutup menu"
          >
            <X size={21} strokeWidth={2} />
          </button>
        </div>

        <div className="usefect-sidebar-content">
          <section className="usefect-sidebar-section">
            <div className="usefect-sidebar-section-label">
              RUANG UTAMA
            </div>

            <nav className="usefect-sidebar-nav">
              {userItems.map(renderItem)}
            </nav>
          </section>

          {isAdmin && (
            <section className="usefect-sidebar-section">
              <div className="usefect-sidebar-section-label">
                PENGELOLAAN
              </div>

              <nav className="usefect-sidebar-nav">
                {managementItems.map(renderItem)}
              </nav>
            </section>
          )}

          {isSuperAdmin && (
            <section className="usefect-sidebar-section">
              <div className="usefect-sidebar-section-label">
                SUPER ADMIN
              </div>

              <nav className="usefect-sidebar-nav">
                {superAdminItems.map(renderItem)}
              </nav>
            </section>
          )}
        </div>

        <div className="usefect-sidebar-footer">
          <div className="usefect-sidebar-user">
            <div className="usefect-sidebar-avatar">
              {String(currentUser?.fullName ?? "U")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part: string) => part[0])
                .join("")
                .toUpperCase() || "U"}
            </div>

            <div className="usefect-sidebar-user-info">
              <strong>
                {currentUser?.fullName ?? "Pengguna"}
              </strong>

              <span>
                {roles.length > 0
                  ? roles.join(" · ")
                  : "Member USEFECT"}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              className="usefect-sidebar-logout"
              onClick={onLogout}
            >
              <LogOut size={17} />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
