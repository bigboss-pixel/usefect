"use client";

import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "../../../components/SiteHeader";
import {
  Plus,
  ShieldCheck,
  UserRound,
  X,
  Loader2,
  RefreshCw,
  Pencil,
  Power,
  KeyRound,
  Shield,
} from "lucide-react";
import { apiFetch } from "../../../app/lib/api";

type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  roles: {
    id: number;
    name: string;
    description?: string | null;
  }[];
  createdAt: string;
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAdmin, setSelectedAdmin] =
    useState<AdminUser | null>(null);

  const [actionModal, setActionModal] = useState<
    "edit" | "status" | "password" | "role" | null
  >(null);

  const [actionSubmitting, setActionSubmitting] =
    useState(false);

  const [editForm, setEditForm] = useState({
    email: "",
    username: "",
    fullName: "",
    phone: "",
  });

  const [newPassword, setNewPassword] = useState("");

  const [newRole, setNewRole] = useState<
    "ADMIN" | "LIBRARIAN" | "SUPER_ADMIN"
  >("ADMIN");

  const [form, setForm] = useState({
    email: "",
    username: "",
    fullName: "",
    phone: "",
    password: "",
    role: "ADMIN",
  });

  async function loadAdmins() {
    try {
      const response = await apiFetch("/admin-management");

      if (!response.ok) {
        throw new Error(
          `Gagal memuat administrator (${response.status})`,
        );
      }

      const data = await response.json();

      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal memuat administrator:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password.length < 8) {
      alert("Password minimal 8 karakter.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch("/admin-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          username: form.username || undefined,
          fullName: form.fullName,
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                "Gagal membuat akun administrator.",
        );
      }

      alert("Akun administrator berhasil dibuat.");

      setForm({
        email: "",
        username: "",
        fullName: "",
        phone: "",
        password: "",
        role: "ADMIN",
      });

      setShowCreate(false);
      await loadAdmins();
    } catch (error: any) {
      alert(error?.message ?? "Gagal membuat akun administrator.");
    } finally {
      setSubmitting(false);
    }
  }

  function getPrimaryRole(admin: AdminUser) {
    if (admin.roles.some((role) => role.name === "SUPER_ADMIN")) {
      return "SUPER_ADMIN";
    }

    if (admin.roles.some((role) => role.name === "ADMIN")) {
      return "ADMIN";
    }

    if (admin.roles.some((role) => role.name === "LIBRARIAN")) {
      return "LIBRARIAN";
    }

    return "USER";
  }

  function openEditModal(admin: AdminUser) {
    setSelectedAdmin(admin);

    setEditForm({
      email: admin.email,
      username: admin.username ?? "",
      fullName: admin.fullName,
      phone: admin.phone ?? "",
    });

    setActionModal("edit");
  }

  function openStatusModal(admin: AdminUser) {
    setSelectedAdmin(admin);
    setActionModal("status");
  }

  function openPasswordModal(admin: AdminUser) {
    setSelectedAdmin(admin);
    setNewPassword("");
    setActionModal("password");
  }

  function openRoleModal(admin: AdminUser) {
    setSelectedAdmin(admin);

    const role = getPrimaryRole(admin);

    setNewRole(
      role === "SUPER_ADMIN" ||
        role === "ADMIN" ||
        role === "LIBRARIAN"
        ? role
        : "ADMIN",
    );

    setActionModal("role");
  }

  function closeActionModal() {
    if (actionSubmitting) return;

    setSelectedAdmin(null);
    setActionModal(null);
    setNewPassword("");
  }

  async function handleEdit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedAdmin) return;

    setActionSubmitting(true);

    try {
      const response = await apiFetch(
        `/admin-management/${selectedAdmin.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: editForm.email,
            username:
              editForm.username || undefined,
            fullName: editForm.fullName,
            phone: editForm.phone || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                "Gagal memperbarui administrator.",
        );
      }

      alert(
        "Data administrator berhasil diperbarui.",
      );

      closeActionModal();
      await loadAdmins();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal memperbarui administrator.",
      );
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleStatusChange() {
    if (!selectedAdmin) return;

    const nextStatus = !selectedAdmin.isActive;

    if (
      !window.confirm(
        nextStatus
          ? `Aktifkan kembali akun ${selectedAdmin.fullName}?`
          : `Nonaktifkan akun ${selectedAdmin.fullName}?`,
      )
    ) {
      return;
    }

    setActionSubmitting(true);

    try {
      const response = await apiFetch(
        `/admin-management/${selectedAdmin.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                "Gagal mengubah status administrator.",
        );
      }

      alert(
        nextStatus
          ? "Akun administrator berhasil diaktifkan."
          : "Akun administrator berhasil dinonaktifkan.",
      );

      closeActionModal();
      await loadAdmins();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal mengubah status administrator.",
      );
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedAdmin) return;

    if (newPassword.length < 8) {
      alert("Password minimal 8 karakter.");
      return;
    }

    setActionSubmitting(true);

    try {
      const response = await apiFetch(
        `/admin-management/${selectedAdmin.id}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                "Gagal mereset password administrator.",
        );
      }

      alert(
        "Password administrator berhasil direset.",
      );

      closeActionModal();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal mereset password administrator.",
      );
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleRoleChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedAdmin) return;

    const currentRole = getPrimaryRole(selectedAdmin);

    if (currentRole === newRole) {
      closeActionModal();
      return;
    }

    if (
      !window.confirm(
        `Ubah role ${selectedAdmin.fullName} dari ${currentRole} menjadi ${newRole}?`,
      )
    ) {
      return;
    }

    setActionSubmitting(true);

    try {
      const response = await apiFetch(
        `/admin-management/${selectedAdmin.id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: newRole,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                "Gagal mengubah role administrator.",
        );
      }

      alert(
        "Role administrator berhasil diperbarui.",
      );

      closeActionModal();
      await loadAdmins();
    } catch (error: any) {
      alert(
        error?.message ??
          "Gagal mengubah role administrator.",
      );
    } finally {
      setActionSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <div className="admin-dashboard-shell">

        <main className="admin-dashboard-main admin-management-page">
          <section className="admin-management-header">
            <div>
              <div className="admin-workspace-eyebrow">
                SUPER ADMIN · ACCESS CONTROL
              </div>

              <h1>Manajemen Admin</h1>

              <p>
                Kelola akun administrator yang memiliki akses ke
                Administration Workspace USEFECT.
              </p>
            </div>

            <button
              type="button"
              className="admin-management-primary-button"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} />
              Tambah Admin
            </button>
          </section>

          <section className="admin-management-summary">
            <div className="admin-management-summary-card">
              <ShieldCheck size={20} />
              <div>
                <strong>{admins.length}</strong>
                <span>Akun Administrator</span>
              </div>
            </div>

            <div className="admin-management-summary-card">
              <UserRound size={20} />
              <div>
                <strong>
                  {admins.filter((admin) => admin.isActive).length}
                </strong>
                <span>Akun Aktif</span>
              </div>
            </div>

            <button
              type="button"
              className="admin-management-refresh"
              onClick={() => {
                setRefreshing(true);
                loadAdmins();
              }}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "admin-spin" : ""}
              />
              Refresh
            </button>
          </section>

          <section className="admin-management-table-card">
            <div className="admin-management-table-heading">
              <div>
                <h2>Administrator</h2>
                <p>
                  Daftar akun dengan akses administratif USEFECT.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="admin-management-empty">
                <Loader2 className="admin-spin" size={24} />
                <span>Memuat administrator...</span>
              </div>
            ) : admins.length === 0 ? (
              <div className="admin-management-empty">
                <ShieldCheck size={30} />
                <strong>Belum ada administrator</strong>
              </div>
            ) : (
              <div className="admin-management-list">
                {admins.map((admin) => {
                  const role = getPrimaryRole(admin);

                  return (
                    <div
                      key={admin.id}
                      className="admin-management-row"
                    >
                      <div className="admin-management-avatar">
                        {admin.fullName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="admin-management-identity">
                        <strong>{admin.fullName}</strong>
                        <span>
                          {admin.email}
                          {admin.username
                            ? ` · @${admin.username}`
                            : ""}
                        </span>
                      </div>

                      <div
                        className={`admin-role-badge admin-role-${role.toLowerCase()}`}
                      >
                        {role}
                      </div>

                      <div
                        className={`admin-status-badge ${
                          admin.isActive
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {admin.isActive
                          ? "AKTIF"
                          : "NONAKTIF"}
                      </div>

                      <div className="admin-management-actions">
                        <button
                          type="button"
                          title="Edit administrator"
                          onClick={() =>
                            openEditModal(admin)
                          }
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          title={
                            admin.isActive
                              ? "Nonaktifkan administrator"
                              : "Aktifkan administrator"
                          }
                          onClick={() =>
                            openStatusModal(admin)
                          }
                        >
                          <Power size={15} />
                        </button>

                        <button
                          type="button"
                          title="Reset password"
                          onClick={() =>
                            openPasswordModal(admin)
                          }
                        >
                          <KeyRound size={15} />
                        </button>

                        <button
                          type="button"
                          title="Ubah role"
                          onClick={() =>
                            openRoleModal(admin)
                          }
                        >
                          <Shield size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {showCreate && (
        <div
          className="admin-management-modal-backdrop"
          onMouseDown={() => {
            if (!submitting) setShowCreate(false);
          }}
        >
          <div
            className="admin-management-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-management-modal-header">
              <div>
                <div className="admin-workspace-eyebrow">
                  NEW ADMINISTRATOR
                </div>
                <h2>Tambah Admin</h2>
                <p>
                  Buat akun ADMIN atau LIBRARIAN baru.
                </p>
              </div>

              <button
                type="button"
                className="admin-management-close"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="admin-management-form"
              onSubmit={handleCreate}
            >
              <label>
                Nama Lengkap
                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fullName: event.target.value,
                    })
                  }
                  placeholder="Nama lengkap"
                />
              </label>

              <label>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="admin@usefect.id"
                />
              </label>

              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      username: event.target.value,
                    })
                  }
                  placeholder="username"
                />
              </label>

              <label>
                Nomor Telepon
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  placeholder="Nomor telepon"
                />
              </label>

              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  placeholder="Minimal 8 karakter"
                />
              </label>

              <label>
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="LIBRARIAN">
                    LIBRARIAN
                  </option>
                </select>
              </label>

              <div className="admin-management-form-actions">
                <button
                  type="button"
                  className="admin-management-secondary-button"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="admin-management-primary-button"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="admin-spin"
                      />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Buat Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAdmin && actionModal && (
        <div
          className="admin-management-modal-backdrop"
          onMouseDown={closeActionModal}
        >
          <div
            className="admin-management-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="admin-management-modal-header">
              <div>
                <div className="admin-workspace-eyebrow">
                  ADMINISTRATOR ·{" "}
                  {actionModal.toUpperCase()}
                </div>

                <h2>
                  {actionModal === "edit" &&
                    "Edit Administrator"}

                  {actionModal === "status" &&
                    "Ubah Status"}

                  {actionModal === "password" &&
                    "Reset Password"}

                  {actionModal === "role" &&
                    "Ubah Role"}
                </h2>

                <p>{selectedAdmin.fullName}</p>
              </div>

              <button
                type="button"
                className="admin-management-close"
                onClick={closeActionModal}
                disabled={actionSubmitting}
              >
                <X size={19} />
              </button>
            </div>

            {actionModal === "edit" && (
              <form
                className="admin-management-form"
                onSubmit={handleEdit}
              >
                <label>
                  Nama Lengkap
                  <input
                    required
                    value={editForm.fullName}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        fullName:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Username
                  <input
                    value={editForm.username}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        username:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Nomor Telepon
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        phone: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="admin-management-form-actions">
                  <button
                    type="button"
                    className="admin-management-secondary-button"
                    onClick={closeActionModal}
                    disabled={actionSubmitting}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="admin-management-primary-button"
                    disabled={actionSubmitting}
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="admin-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Pencil size={17} />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {actionModal === "status" && (
              <div className="admin-management-form">
                <p>
                  {selectedAdmin.isActive
                    ? "Akun ini akan dinonaktifkan dan tidak dapat digunakan untuk login."
                    : "Akun ini akan diaktifkan kembali dan dapat digunakan untuk login."}
                </p>

                <div className="admin-management-form-actions">
                  <button
                    type="button"
                    className="admin-management-secondary-button"
                    onClick={closeActionModal}
                    disabled={actionSubmitting}
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    className="admin-management-primary-button"
                    onClick={handleStatusChange}
                    disabled={actionSubmitting}
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="admin-spin"
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Power size={17} />
                        {selectedAdmin.isActive
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {actionModal === "password" && (
              <form
                className="admin-management-form"
                onSubmit={handleResetPassword}
              >
                <label>
                  Password Baru
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Minimal 8 karakter"
                  />
                </label>

                <div className="admin-management-form-actions">
                  <button
                    type="button"
                    className="admin-management-secondary-button"
                    onClick={closeActionModal}
                    disabled={actionSubmitting}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="admin-management-primary-button"
                    disabled={actionSubmitting}
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="admin-spin"
                        />
                        Mereset...
                      </>
                    ) : (
                      <>
                        <KeyRound size={17} />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {actionModal === "role" && (
              <form
                className="admin-management-form"
                onSubmit={handleRoleChange}
              >
                <label>
                  Role Administrator
                  <select
                    value={newRole}
                    onChange={(event) =>
                      setNewRole(
                        event.target.value as
                          | "ADMIN"
                          | "LIBRARIAN"
                          | "SUPER_ADMIN",
                      )
                    }
                  >
                    <option value="ADMIN">
                      ADMIN
                    </option>
                    <option value="LIBRARIAN">
                      LIBRARIAN
                    </option>
                    <option value="SUPER_ADMIN">
                      SUPER_ADMIN
                    </option>
                  </select>
                </label>

                <div className="admin-management-form-actions">
                  <button
                    type="button"
                    className="admin-management-secondary-button"
                    onClick={closeActionModal}
                    disabled={actionSubmitting}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="admin-management-primary-button"
                    disabled={actionSubmitting}
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="admin-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Shield size={17} />
                        Simpan Role
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
