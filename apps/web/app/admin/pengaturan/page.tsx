"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Coins,
  Save,
  Settings2,
  RotateCcw,
} from "lucide-react";

import SiteHeader from "../../../components/SiteHeader";
import { apiFetch } from "../../lib/api";

type LibrarySettings = {
  id: number;
  maxActiveLoans: number;
  loanDurationDays: number;
  maxRenewals: number;
  renewalDurationDays: number;
  finePerDay: number;
  reservationExpiryHours: number;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  maxActiveLoans: string;
  loanDurationDays: string;
  maxRenewals: string;
  renewalDurationDays: string;
  finePerDay: string;
  reservationExpiryHours: string;
};

const defaultForm: FormState = {
  maxActiveLoans: "3",
  loanDurationDays: "7",
  maxRenewals: "2",
  renewalDurationDays: "7",
  finePerDay: "1000",
  reservationExpiryHours: "24",
};

export default function AdminPengaturanPage() {
  const [settings, setSettings] =
    useState<LibrarySettings | null>(null);

  const [form, setForm] =
    useState<FormState>(defaultForm);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response =
        await apiFetch("/library-settings");

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil konfigurasi perpustakaan",
        );
      }

      const data =
        result?.settings ??
        result?.data ??
        result;

      setSettings(data);

      setForm({
        maxActiveLoans:
          String(data.maxActiveLoans),
        loanDurationDays:
          String(data.loanDurationDays),
        maxRenewals:
          String(data.maxRenewals),
        renewalDurationDays:
          String(data.renewalDurationDays),
        finePerDay:
          String(data.finePerDay),
        reservationExpiryHours:
          String(data.reservationExpiryHours),
      });
    } catch (error: any) {
      console.error(
        "Gagal mengambil konfigurasi:",
        error,
      );

      setPageError(
        error?.message ??
          "Gagal mengambil konfigurasi perpustakaan",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateField = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!settings) {
      return;
    }

    setForm({
      maxActiveLoans:
        String(settings.maxActiveLoans),
      loanDurationDays:
        String(settings.loanDurationDays),
      maxRenewals:
        String(settings.maxRenewals),
      renewalDurationDays:
        String(settings.renewalDurationDays),
      finePerDay:
        String(settings.finePerDay),
      reservationExpiryHours:
        String(settings.reservationExpiryHours),
    });

    setPageError("");
    setSuccessMessage("");
  };

  const saveSettings = async () => {
    setPageError("");
    setSuccessMessage("");

    const values = {
      maxActiveLoans:
        Number(form.maxActiveLoans),
      loanDurationDays:
        Number(form.loanDurationDays),
      maxRenewals:
        Number(form.maxRenewals),
      renewalDurationDays:
        Number(form.renewalDurationDays),
      finePerDay:
        Number(form.finePerDay),
      reservationExpiryHours:
        Number(form.reservationExpiryHours),
    };

    const validation = [
      [
        "Maksimal buku dipinjam",
        values.maxActiveLoans,
        1,
      ],
      [
        "Durasi peminjaman",
        values.loanDurationDays,
        1,
      ],
      [
        "Maksimal renewal",
        values.maxRenewals,
        0,
      ],
      [
        "Durasi renewal",
        values.renewalDurationDays,
        1,
      ],
      [
        "Denda per hari",
        values.finePerDay,
        0,
      ],
      [
        "Masa berlaku reservation",
        values.reservationExpiryHours,
        1,
      ],
    ] as const;

    for (const [label, value, minimum] of validation) {
      if (
        !Number.isInteger(value) ||
        value < minimum
      ) {
        setPageError(
          `${label} harus berupa bilangan bulat minimal ${minimum}.`,
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response =
        await apiFetch("/library-settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menyimpan konfigurasi",
        );
      }

      const updated =
        result?.settings ??
        result?.data ??
        result;

      setSettings(updated);

      setForm({
        maxActiveLoans:
          String(updated.maxActiveLoans),
        loanDurationDays:
          String(updated.loanDurationDays),
        maxRenewals:
          String(updated.maxRenewals),
        renewalDurationDays:
          String(updated.renewalDurationDays),
        finePerDay:
          String(updated.finePerDay),
        reservationExpiryHours:
          String(updated.reservationExpiryHours),
      });

      setSuccessMessage(
        "Konfigurasi perpustakaan berhasil diperbarui.",
      );
    } catch (error: any) {
      console.error(
        "Gagal menyimpan konfigurasi:",
        error,
      );

      setPageError(
        error?.message ??
          "Gagal menyimpan konfigurasi",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SiteHeader />

      <main className="settings-admin-page">
        <section className="settings-admin-hero">
          <div className="settings-admin-hero-content">
            <div className="settings-admin-eyebrow">
              <Settings2 size={15} />
              SYSTEM CONFIGURATION
            </div>

            <h1>
              Pengaturan
              <em>USEFECT</em>
            </h1>

            <p>
              Kelola aturan peminjaman, perpanjangan,
              reservation, dan denda yang digunakan
              oleh sistem perpustakaan.
            </p>
          </div>
        </section>

        <section className="settings-admin-content">
          {pageError && (
            <div className="settings-admin-alert error">
              {pageError}
            </div>
          )}

          {successMessage && (
            <div className="settings-admin-alert success">
              {successMessage}
            </div>
          )}

          <div className="settings-admin-toolbar">
            <div>
              <span className="settings-admin-section-label">
                LIBRARY RULES
              </span>

              <h2>
                Aturan layanan
              </h2>

              <p>
                Perubahan berlaku pada transaksi
                yang diproses setelah konfigurasi
                diperbarui.
              </p>
            </div>

            <div className="settings-admin-actions">
              <button
                type="button"
                className="settings-admin-reset"
                onClick={resetForm}
                disabled={
                  loading || saving || !settings
                }
              >
                <RotateCcw size={15} />
                Reset
              </button>

              <button
                type="button"
                className="settings-admin-save"
                onClick={saveSettings}
                disabled={loading || saving}
              >
                <Save size={16} />
                {saving
                  ? "Menyimpan..."
                  : "Simpan perubahan"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="settings-admin-loading">
              Memuat konfigurasi...
            </div>
          ) : (
            <div className="settings-admin-grid">
              <SettingCard
                icon={<BookOpen size={19} />}
                title="Maksimal buku"
                description="Jumlah buku aktif yang dapat dipinjam satu anggota."
                value={form.maxActiveLoans}
                onChange={(value) =>
                  updateField(
                    "maxActiveLoans",
                    value,
                  )
                }
                suffix="buku"
                min={1}
              />

              <SettingCard
                icon={<Clock3 size={19} />}
                title="Durasi peminjaman"
                description="Lama peminjaman standar sebelum buku jatuh tempo."
                value={form.loanDurationDays}
                onChange={(value) =>
                  updateField(
                    "loanDurationDays",
                    value,
                  )
                }
                suffix="hari"
                min={1}
              />

              <SettingCard
                icon={<RotateCcw size={19} />}
                title="Maksimal renewal"
                description="Jumlah maksimum perpanjangan untuk satu peminjaman."
                value={form.maxRenewals}
                onChange={(value) =>
                  updateField(
                    "maxRenewals",
                    value,
                  )
                }
                suffix="kali"
                min={0}
              />

              <SettingCard
                icon={<CalendarDays size={19} />}
                title="Durasi renewal"
                description="Tambahan waktu setiap kali peminjaman diperpanjang."
                value={form.renewalDurationDays}
                onChange={(value) =>
                  updateField(
                    "renewalDurationDays",
                    value,
                  )
                }
                suffix="hari"
                min={1}
              />

              <SettingCard
                icon={<Coins size={19} />}
                title="Denda keterlambatan"
                description="Nominal denda yang dikenakan untuk setiap hari keterlambatan."
                value={form.finePerDay}
                onChange={(value) =>
                  updateField(
                    "finePerDay",
                    value,
                  )
                }
                suffix="Rp / hari"
                min={0}
              />

              <SettingCard
                icon={<Clock3 size={19} />}
                title="Expiry reservation"
                description="Waktu yang diberikan kepada anggota untuk mengambil reservation."
                value={form.reservationExpiryHours}
                onChange={(value) =>
                  updateField(
                    "reservationExpiryHours",
                    value,
                  )
                }
                suffix="jam"
                min={1}
              />
            </div>
          )}

          <div className="settings-admin-note">
            <div className="settings-admin-note-icon">
              <Settings2 size={17} />
            </div>

            <div>
              <strong>
                Konfigurasi sistem
              </strong>

              <p>
                Pengaturan ini digunakan langsung
                oleh proses peminjaman, renewal,
                pengembalian, denda, dan reservation.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function SettingCard({
  icon,
  title,
  description,
  value,
  onChange,
  suffix,
  min,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  min: number;
}) {
  return (
    <article className="settings-admin-card">
      <div className="settings-admin-card-top">
        <div className="settings-admin-card-icon">
          {icon}
        </div>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="settings-admin-field">
        <input
          type="number"
          min={min}
          step="1"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />

        <span>{suffix}</span>
      </div>
    </article>
  );
}
