"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LibraryBig,
  QrCode,
  Search,
  Bell,
  UserRound,
  CalendarDays,
} from "lucide-react";

import SiteHeader from "../../components/SiteHeader";

export default function PanduanPage() {
  return (
    <main className="usefect-guide-page">
      <SiteHeader />

      {/* HERO */}
      <section className="usefect-guide-hero">
        <div className="guide-orb guide-orb-one" />
        <div className="guide-orb guide-orb-two" />

        <div className="usefect-guide-hero-inner">
          <div className="guide-eyebrow">
            <span className="guide-eyebrow-line" />
            USEFECT KNOWLEDGE HUB
          </div>

          <h1>
            Everything you need
            <br />
            <em>to get started.</em>
          </h1>

          <p>
            Panduan singkat untuk menjelajahi USEFECT, menemukan koleksi,
            melakukan reservasi, mengelola peminjaman, dan menggunakan
            layanan digital dengan lebih mudah.
          </p>

          <div className="guide-hero-actions">
            <Link href="/katalog" className="guide-primary-button">
              Jelajahi Katalog
              <ArrowRight size={17} />
            </Link>

            <Link href="/profil" className="guide-secondary-button">
              Buka Profil
            </Link>
          </div>
        </div>

        <div className="guide-hero-card">
          <div className="guide-hero-card-top">
            <span>YOUR KNOWLEDGE JOURNEY</span>
            <span className="guide-live-dot" />
          </div>

          <div className="guide-journey">
            <JourneyStep
              number="01"
              icon={<Search size={19} />}
              title="Explore"
              text="Temukan koleksi"
            />

            <div className="journey-line" />

            <JourneyStep
              number="02"
              icon={<CalendarDays size={19} />}
              title="Reserve"
              text="Ajukan reservasi"
            />

            <div className="journey-line" />

            <JourneyStep
              number="03"
              icon={<BookOpen size={19} />}
              title="Borrow"
              text="Selesaikan peminjaman"
            />
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="guide-section guide-start-section">
        <div className="guide-section-heading">
          <div>
            <span className="guide-section-eyebrow">GET STARTED</span>

            <h2>
              Mulai dari sini.
            </h2>
          </div>

          <p>
            USEFECT dirancang agar seluruh proses pencarian dan penggunaan
            layanan dapat dilakukan dengan alur yang sederhana.
          </p>
        </div>

        <div className="guide-card-grid">
          <GuideCard
            number="01"
            icon={<Search size={22} />}
            title="Cari koleksi"
            description="Gunakan pencarian untuk menemukan buku berdasarkan judul, penulis, ISBN, atau kategori."
          />

          <GuideCard
            number="02"
            icon={<BookOpen size={22} />}
            title="Lihat detail"
            description="Periksa informasi buku, ketersediaan eksemplar, dan lokasi koleksi sebelum menggunakannya."
          />

          <GuideCard
            number="03"
            icon={<CalendarDays size={22} />}
            title="Reservasi"
            description="Jika ingin mengambil buku secara online, ajukan reservasi dan tunggu sampai siap diambil."
          />

          <GuideCard
            number="04"
            icon={<CheckCircle2 size={22} />}
            title="Selesaikan layanan"
            description="Datang sesuai waktu layanan untuk menyelesaikan proses peminjaman atau pengembalian secara fisik."
          />
        </div>
      </section>

      {/* FLOW */}
      <section className="guide-flow-section">
        <div className="guide-flow-inner">
          <div className="guide-section-heading guide-flow-heading">
            <div>
              <span className="guide-section-eyebrow">
                HOW IT WORKS
              </span>

              <h2>
                Satu alur.
                <br />
                <em>Lebih sederhana.</em>
              </h2>
            </div>

            <p>
              Gunakan USEFECT kapan saja untuk mencari informasi dan
              mengajukan layanan. Penyelesaian transaksi fisik dilakukan
              sesuai jam operasional layanan.
            </p>
          </div>

          <div className="guide-flow-grid">
            <FlowCard
              number="01"
              title="Explore"
              label="Temukan"
              description="Cari koleksi yang Anda perlukan melalui katalog USEFECT."
              icon={<Search size={24} />}
            />

            <FlowCard
              number="02"
              title="Reserve"
              label="Ajukan"
              description="Buat reservasi online ketika koleksi tersedia untuk digunakan."
              icon={<CalendarDays size={24} />}
            />

            <FlowCard
              number="03"
              title="Verify"
              label="Validasi"
              description="Saat datang, petugas memindai QR pengguna dan ISBN buku."
              icon={<QrCode size={24} />}
            />

            <FlowCard
              number="04"
              title="Complete"
              label="Selesai"
              description="Transaksi tercatat dan status koleksi diperbarui oleh sistem."
              icon={<CheckCircle2 size={24} />}
            />
          </div>
        </div>
      </section>

      {/* QR */}
      <section className="guide-section guide-qr-section">
        <div className="guide-qr-card">
          <div className="guide-qr-visual">
            <div className="qr-icon-shell">
              <QrCode size={42} />
            </div>

            <div className="qr-mini-card">
              <span>MEMBER ACCESS</span>
              <strong>USEFECT</strong>
            </div>
          </div>

          <div className="guide-qr-content">
            <span className="guide-section-eyebrow">
              DIGITAL MEMBER
            </span>

            <h2>
              Satu QR untuk
              <br />
              layanan Anda.
            </h2>

            <p>
              Kartu anggota digital menyimpan identitas pengguna yang dapat
              digunakan saat menyelesaikan transaksi layanan di meja
              pelayanan.
            </p>

            <div className="guide-check-list">
              <CheckItem text="Buka Kartu Anggota dari akun Anda." />
              <CheckItem text="Tunjukkan QR kepada petugas saat transaksi." />
              <CheckItem text="Gunakan bersama ISBN buku yang diproses." />
            </div>

            <Link href="/kartu-anggota" className="guide-text-link">
              Buka Kartu Anggota
              <ChevronRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ACCOUNT */}
      <section className="guide-account-section">
        <div className="guide-account-inner">
          <div className="guide-section-heading">
            <div>
              <span className="guide-section-eyebrow">
                YOUR ACCOUNT
              </span>

              <h2>
                Semua aktivitas
                <br />
                <em>tetap terhubung.</em>
              </h2>
            </div>

            <p>
              Setelah login, Anda dapat mengakses informasi akun dan
              memantau aktivitas layanan dari satu tempat.
            </p>
          </div>

          <div className="guide-account-grid">
            <AccountCard
              icon={<UserRound size={21} />}
              title="Profil"
              description="Kelola informasi akun dan lihat identitas anggota."
            />

            <AccountCard
              icon={<Bell size={21} />}
              title="Notifikasi"
              description="Terima informasi penting mengenai aktivitas layanan."
            />

            <AccountCard
              icon={<Clock3 size={21} />}
              title="Riwayat"
              description="Pantau aktivitas dan status peminjaman Anda."
            />
          </div>
        </div>
      </section>

      {/* IMPORTANT */}
      <section className="guide-important-section">
        <div className="guide-important-inner">
          <div className="guide-important-icon">
            <Clock3 size={25} />
          </div>

          <div>
            <span>IMPORTANT TO KNOW</span>

            <h2>
              Online anytime.
              <br />
              Physical service during operating hours.
            </h2>

            <p>
              Katalog dan pengajuan layanan online dapat digunakan kapan
              saja. Untuk mengambil buku, menyelesaikan peminjaman, atau
              mengembalikan buku secara fisik, datang pada jam operasional
              layanan.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="guide-cta-section">
        <div className="guide-cta-glow" />

        <div className="guide-cta-inner">
          <span className="guide-section-eyebrow">
            READY TO EXPLORE?
          </span>

          <h2>
            Temukan pengetahuan
            <br />
            <em>berikutnya.</em>
          </h2>

          <p>
            Mulai dari katalog USEFECT dan temukan koleksi yang sesuai
            dengan kebutuhan Anda.
          </p>

          <Link href="/katalog" className="guide-cta-button">
            Buka Katalog
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function JourneyStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="journey-step">
      <div className="journey-icon">{icon}</div>

      <div>
        <span>{number}</span>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}

function GuideCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="guide-card">
      <div className="guide-card-top">
        <span>{number}</span>
        <div className="guide-card-icon">{icon}</div>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <div className="guide-card-line" />
    </article>
  );
}

function FlowCard({
  number,
  title,
  label,
  description,
  icon,
}: {
  number: string;
  title: string;
  label: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <article className="flow-card">
      <div className="flow-card-number">{number}</div>

      <div className="flow-card-icon">{icon}</div>

      <span>{label}</span>

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="guide-check-item">
      <CheckCircle2 size={17} />
      <span>{text}</span>
    </div>
  );
}

function AccountCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="account-card">
      <div className="account-card-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <ChevronRight size={18} />
    </article>
  );
}
