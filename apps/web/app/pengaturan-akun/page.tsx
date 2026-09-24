"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import SiteHeader from "../../components/SiteHeader";
import { apiFetch } from "../lib/api";

type AccountState = {
  email: string;
  username: string;
  fullName: string;
  phone: string;
};

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label>
      <span>{label}</span>

      <div className="settings-password-input">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={label}
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? "Sembunyikan password"
              : "Tampilkan password"
          }
        >
          {visible ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </label>
  );
}

export default function AdminPengaturanAkunPage() {
  const [account, setAccount] =
    useState<AccountState>({
      email: "",
      username: "",
      fullName: "",
      phone: "",
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const response =
          await apiFetch("/users/me");

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ??
              "Gagal mengambil data akun",
          );
        }

        const data =
          result?.user ??
          result?.data ??
          result;

        setAccount({
          email: data.email ?? "",
          username: data.username ?? "",
          fullName: data.fullName ?? "",
          phone: data.phone ?? "",
        });
      } catch (err: any) {
        setError(
          err?.message ??
            "Gagal mengambil data akun",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const saveAccount = async () => {
    setError("");
    setSuccess("");

    if (!account.fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (!account.username.trim()) {
      setError("Username wajib diisi.");
      return;
    }

    if (!account.email.trim()) {
      setError("Email wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      const response =
        await apiFetch("/users/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: account.fullName.trim(),
            username: account.username.trim(),
            email: account.email.trim(),
            phone: account.phone.trim(),
          }),
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal memperbarui akun",
        );
      }

      const data =
        result?.user ??
        result?.data ??
        result;

      setAccount({
        email: data.email ?? "",
        username: data.username ?? "",
        fullName: data.fullName ?? "",
        phone: data.phone ?? "",
      });

      setSuccess(
        "Informasi akun berhasil diperbarui.",
      );
    } catch (err: any) {
      setError(
        err?.message ??
          "Gagal memperbarui akun",
      );
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Password lama wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password baru minimal 8 karakter.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Konfirmasi password baru tidak cocok.",
      );
      return;
    }

    try {
      setPasswordSaving(true);

      const response =
        await apiFetch(
          "/users/me/password",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
            }),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengubah password",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess(
        "Password berhasil diubah.",
      );
    } catch (err: any) {
      setError(
        err?.message ??
          "Gagal mengubah password",
      );
    } finally {
      setPasswordSaving(false);
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
              ACCOUNT SETTINGS
            </div>

            <h1>
              Pengaturan
              <em>Akun</em>
            </h1>

            <p>
              Kelola informasi pribadi dan keamanan
              akun yang sedang login.
            </p>
          </div>
        </section>

        <section className="settings-admin-content">
          {error && (
            <div className="settings-admin-alert error">
              {error}
            </div>
          )}

          {success && (
            <div className="settings-admin-alert success">
              {success}
            </div>
          )}

          <div className="settings-account-grid">
            <article className="settings-account-card">
              <div className="settings-account-card-header">
                <div className="settings-account-card-icon">
                  <UserRound size={19} />
                </div>

                <div>
                  <h3>Informasi akun</h3>
                  <p>
                    Perbarui informasi akun Anda.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="settings-admin-loading">
                  Memuat data akun...
                </div>
              ) : (
                <div className="settings-account-form">
                  <label>
                    <span>Nama lengkap</span>
                    <input
                      type="text"
                      value={account.fullName}
                      onChange={(event) =>
                        setAccount({
                          ...account,
                          fullName:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Username</span>
                    <input
                      type="text"
                      value={account.username}
                      onChange={(event) =>
                        setAccount({
                          ...account,
                          username:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={account.email}
                      onChange={(event) =>
                        setAccount({
                          ...account,
                          email:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Nomor HP</span>
                    <input
                      type="text"
                      value={account.phone}
                      onChange={(event) =>
                        setAccount({
                          ...account,
                          phone:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="settings-account-actions">
                    <button
                      type="button"
                      className="settings-admin-save"
                      onClick={saveAccount}
                      disabled={saving}
                    >
                      <Save size={16} />
                      {saving
                        ? "Menyimpan..."
                        : "Simpan akun"}
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className="settings-account-card">
              <div className="settings-account-card-header">
                <div className="settings-account-card-icon">
                  <ShieldCheck size={19} />
                </div>

                <div>
                  <h3>Keamanan akun</h3>
                  <p>
                    Ganti password dengan verifikasi
                    password lama.
                  </p>
                </div>
              </div>

              <div className="settings-account-form">
                <PasswordField
                  label="Password lama"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  visible={showCurrentPassword}
                  onToggle={() =>
                    setShowCurrentPassword(
                      (value) => !value,
                    )
                  }
                />

                <PasswordField
                  label="Password baru"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNewPassword}
                  onToggle={() =>
                    setShowNewPassword(
                      (value) => !value,
                    )
                  }
                />

                <PasswordField
                  label="Konfirmasi password baru"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword(
                      (value) => !value,
                    )
                  }
                />

                <div className="settings-account-password-note">
                  Password baru minimal 8 karakter.
                </div>

                <div className="settings-account-actions">
                  <button
                    type="button"
                    className="settings-admin-save"
                    onClick={savePassword}
                    disabled={passwordSaving}
                  >
                    <ShieldCheck size={16} />
                    {passwordSaving
                      ? "Mengubah..."
                      : "Ubah password"}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
