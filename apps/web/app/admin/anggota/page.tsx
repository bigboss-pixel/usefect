"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Filter,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import SiteHeader from "../../../components/SiteHeader";
import { apiFetch } from "../../lib/api";

type Member = {
  id: number;
  fullName: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  isActive: boolean;
  type: "MAHASISWA" | "DOSEN" | "ANGGOTA";
  npm?: string | null;
  lecturerNumber?: string | null;
  faculty?: string | null;
  studyProgram?: string | null;
  enrollmentYear?: number | null;
  createdAt: string;
  updatedAt: string;
};

type MemberDetail = Member & {
  roles?: string[];
  statistics?: {
    activeLoans: number;
    overdueLoans: number;
  };
};

type DetailTab = "info" | "loans" | "reservations";

const PAGE_SIZE = 8;

export default function AdminAnggotaPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [facultyFilter, setFacultyFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedMember, setSelectedMember] =
    useState<MemberDetail | null>(null);
  const [detailTab, setDetailTab] =
    useState<DetailTab>("info");
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    type: "MAHASISWA" as Member["type"],
    npm: "",
    lecturerNumber: "",
    faculty: "",
    studyProgram: "",
    enrollmentYear: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [passwordResetSaving, setPasswordResetSaving] =
    useState(false);
  const [resetPassword, setResetPassword] = useState("");

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    username: "",
    phone: "",
    npm: "",
    lecturerNumber: "",
    faculty: "",
    studyProgram: "",
    enrollmentYear: "",
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await apiFetch("/members");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil data anggota",
        );
      }

      setMembers(
        Array.isArray(result)
          ? result
          : result?.data ?? [],
      );
    } catch (error: any) {
      console.error("Gagal mengambil anggota:", error);

      setPageError(
        error?.message ?? "Gagal mengambil data anggota",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    typeFilter,
    statusFilter,
    facultyFilter,
    activeTab,
  ]);

  const statistics = useMemo(() => {
    const activeMembers = members.filter(
      (member) => member.isActive,
    );

    return {
      total: members.length,
      students: members.filter(
        (member) => member.type === "MAHASISWA",
      ).length,
      lecturers: members.filter(
        (member) => member.type === "DOSEN",
      ).length,
      other: members.filter(
        (member) => member.type === "ANGGOTA",
      ).length,
      inactive: members.filter(
        (member) => !member.isActive,
      ).length,
      active: activeMembers.length,
    };
  }, [members]);

  const faculties = useMemo(() => {
    return Array.from(
      new Set(
        members
          .map((member) => member.faculty)
          .filter(Boolean) as string[],
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !keyword ||
        [
          member.fullName,
          member.email,
          member.username,
          member.npm,
          member.lecturerNumber,
          member.faculty,
          member.studyProgram,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesType =
        activeTab === "ALL"
          ? typeFilter === "ALL" ||
            member.type === typeFilter
          : activeTab === "NONACTIVE"
            ? !member.isActive
            : member.type === activeTab;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && member.isActive) ||
        (statusFilter === "INACTIVE" && !member.isActive);

      const matchesFaculty =
        facultyFilter === "ALL" ||
        member.faculty === facultyFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesFaculty
      );
    });
  }, [
    members,
    search,
    typeFilter,
    statusFilter,
    facultyFilter,
    activeTab,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedMembers = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return filteredMembers.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [filteredMembers, currentPage]);

  const openDetail = async (member: Member) => {
    try {
      setDetailLoading(true);
      setPageError("");
      setDetailTab("info");

      const response = await apiFetch(
        `/members/${member.id}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengambil detail anggota",
        );
      }

      setSelectedMember(result);
    } catch (error: any) {
      console.error(
        "Gagal mengambil detail anggota:",
        error,
      );

      setPageError(
        error?.message ??
          "Gagal mengambil detail anggota",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (statusSaving) return;
    setSelectedMember(null);
  };

  const deleteMember = async () => {
    if (!selectedMember) return;

    const confirmed = window.confirm(
      `Hapus anggota "${selectedMember.fullName}" secara permanen?\n\nData akun anggota akan dihapus dan tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    try {
      setPageError("");
      setSuccessMessage("");

      const response = await apiFetch(
        `/members/${selectedMember.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menghapus anggota",
        );
      }

      setSuccessMessage(
        "Anggota berhasil dihapus.",
      );

      setSelectedMember(null);
      await fetchMembers();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus anggota",
      );
    }
  };

  const toggleStatus = async () => {
    if (!selectedMember) return;

    const nextStatus = !selectedMember.isActive;

    const confirmed = window.confirm(
      nextStatus
        ? `Aktifkan kembali akun ${selectedMember.fullName}?`
        : `Nonaktifkan akun ${selectedMember.fullName}?`,
    );

    if (!confirmed) return;

    try {
      setStatusSaving(true);
      setPageError("");
      setSuccessMessage("");

      const response = await apiFetch(
        `/members/${selectedMember.id}/status`,
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal mengubah status anggota",
        );
      }

      setSuccessMessage(
        nextStatus
          ? "Anggota berhasil diaktifkan."
          : "Anggota berhasil dinonaktifkan.",
      );

      await fetchMembers();

      setSelectedMember((current) =>
        current
          ? {
              ...current,
              isActive: nextStatus,
            }
          : current,
      );
    } catch (error: any) {
      console.error(
        "Gagal mengubah status anggota:",
        error,
      );

      setPageError(
        error?.message ??
          "Gagal mengubah status anggota",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      type: "MAHASISWA",
      npm: "",
      lecturerNumber: "",
      faculty: "",
      studyProgram: "",
      enrollmentYear: "",
    });
    setCreateError("");
  };

  const closeCreateModal = () => {
    if (createSaving) return;
    setShowCreateModal(false);
    resetCreateForm();
  };

  const createMember = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setCreateSaving(true);
      setCreateError("");
      setPageError("");
      setSuccessMessage("");

      const payload: Record<string, unknown> = {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        type: createForm.type,
      };

      if (createForm.type === "MAHASISWA") {
        payload.npm = createForm.npm.trim() || undefined;
        payload.faculty = createForm.faculty.trim() || undefined;
        payload.studyProgram =
          createForm.studyProgram.trim() || undefined;

        if (createForm.enrollmentYear.trim()) {
          payload.enrollmentYear = Number(
            createForm.enrollmentYear,
          );
        }
      }

      if (createForm.type === "DOSEN") {
        payload.lecturerNumber =
          createForm.lecturerNumber.trim() || undefined;
        payload.faculty = createForm.faculty.trim() || undefined;
        payload.studyProgram =
          createForm.studyProgram.trim() || undefined;
      }

      const response = await apiFetch("/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message;

        throw new Error(
          message ?? "Gagal menambahkan anggota",
        );
      }

      setSuccessMessage(
        `Anggota ${createForm.fullName} berhasil ditambahkan.`,
      );

      setShowCreateModal(false);
      resetCreateForm();

      await fetchMembers();
    } catch (error) {
      console.error(
        "Gagal menambahkan anggota:",
        error,
      );

      setCreateError(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan anggota",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditModal = () => {
    if (!selectedMember) return;

    setEditForm({
      fullName: selectedMember.fullName ?? "",
      email: selectedMember.email ?? "",
      username: selectedMember.username ?? "",
      phone: selectedMember.phone ?? "",
      npm: selectedMember.npm ?? "",
      lecturerNumber:
        selectedMember.lecturerNumber ?? "",
      faculty: selectedMember.faculty ?? "",
      studyProgram:
        selectedMember.studyProgram ?? "",
      enrollmentYear:
        selectedMember.enrollmentYear?.toString() ?? "",
    });

    setResetPassword("");
    setEditError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editSaving || passwordResetSaving) return;

    setShowEditModal(false);
    setEditError("");
    setResetPassword("");
  };

  const updateMember = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedMember) return;

    try {
      setEditSaving(true);
      setEditError("");
      setPageError("");
      setSuccessMessage("");

      const payload: Record<string, unknown> = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        username:
          editForm.username.trim() || undefined,
        phone:
          editForm.phone.trim() || undefined,
      };

      if (selectedMember.type === "MAHASISWA") {
        payload.npm =
          editForm.npm.trim() || undefined;

        payload.faculty =
          editForm.faculty.trim() || undefined;

        payload.studyProgram =
          editForm.studyProgram.trim() || undefined;

        if (editForm.enrollmentYear.trim()) {
          payload.enrollmentYear = Number(
            editForm.enrollmentYear,
          );
        }
      }

      if (selectedMember.type === "DOSEN") {
        payload.lecturerNumber =
          editForm.lecturerNumber.trim() || undefined;

        payload.faculty =
          editForm.faculty.trim() || undefined;

        payload.studyProgram =
          editForm.studyProgram.trim() || undefined;
      }

      const response = await apiFetch(
        `/members/${selectedMember.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message;

        throw new Error(
          message ?? "Gagal memperbarui data anggota",
        );
      }

      setSuccessMessage(
        `Data ${editForm.fullName} berhasil diperbarui.`,
      );

      setShowEditModal(false);

      await fetchMembers();

      const detailResponse = await apiFetch(
        `/members/${selectedMember.id}`,
      );

      const detailResult =
        await detailResponse.json();

      if (detailResponse.ok) {
        setSelectedMember(detailResult);
      }
    } catch (error) {
      console.error(
        "Gagal memperbarui anggota:",
        error,
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui data anggota",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedMember) return;

    if (resetPassword.length < 8) {
      setEditError(
        "Password baru minimal 8 karakter.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Reset password untuk ${selectedMember.fullName}?\n\nPassword lama akan diganti dengan password baru yang dimasukkan.`,
    );

    if (!confirmed) return;

    try {
      setPasswordResetSaving(true);
      setEditError("");
      setPageError("");
      setSuccessMessage("");

      const response = await apiFetch(
        `/members/${selectedMember.id}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: resetPassword,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message;

        throw new Error(
          message ?? "Gagal mereset password",
        );
      }

      setSuccessMessage(
        `Password ${selectedMember.fullName} berhasil direset.`,
      );

      setResetPassword("");
    } catch (error) {
      console.error(
        "Gagal mereset password:",
        error,
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Gagal mereset password",
      );
    } finally {
      setPasswordResetSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setFacultyFilter("ALL");
    setActiveTab("ALL");
    setPage(1);
  };

  const showingFrom =
    filteredMembers.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const showingTo = Math.min(
    currentPage * PAGE_SIZE,
    filteredMembers.length,
  );

  return (
    <>
      <SiteHeader />

      <main className="member-management-page">
        <section className="member-management-hero">
          <div className="member-hero-copy">
            <div className="member-hero-icon">
              <Users size={30} strokeWidth={2.2} />
            </div>

            <div>
              <span className="member-eyebrow">
                USEFECT · ADMINISTRATION
              </span>

              <h1>Manajemen Anggota</h1>

              <p>
                Kelola data anggota perpustakaan
                Universitas Medan Area
              </p>
            </div>
          </div>

          <div className="member-hero-actions">
            <button
              type="button"
              className="member-add-button"
              onClick={() => {
                setCreateError("");
                setShowCreateModal(true);
              }}
            >
              <Plus size={17} />
              Tambah Anggota
            </button>
          </div>

          <div className="member-hero-stats">
            <StatCard
              icon={<Users size={23} />}
              value={statistics.total}
              label="Total Anggota"
              tone="blue"
            />

            <StatCard
              icon={<GraduationCap size={23} />}
              value={statistics.students}
              label="Mahasiswa"
              tone="cyan"
            />

            <StatCard
              icon={<UserRound size={23} />}
              value={statistics.lecturers}
              label="Dosen"
              tone="gold"
            />

            <StatCard
              icon={<ShieldCheck size={23} />}
              value={statistics.other}
              label="Tenaga Kependidikan"
              tone="purple"
            />
          </div>
        </section>

        {successMessage && (
          <div className="member-success">
            <CheckCircle2 size={17} />
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {pageError && (
          <div className="member-error">
            <XCircle size={17} />
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError("")}
            >
              <X size={15} />
            </button>
          </div>
        )}


        <section className="member-workspace">
          <div className="member-list-area">
            <div className="member-tabs">
              <MemberTab
                active={activeTab === "ALL"}
                label="Semua"
                count={statistics.total}
                onClick={() => setActiveTab("ALL")}
              />

              <MemberTab
                active={activeTab === "MAHASISWA"}
                label="Mahasiswa"
                count={statistics.students}
                onClick={() =>
                  setActiveTab("MAHASISWA")
                }
              />

              <MemberTab
                active={activeTab === "DOSEN"}
                label="Dosen"
                count={statistics.lecturers}
                onClick={() =>
                  setActiveTab("DOSEN")
                }
              />

              <MemberTab
                active={activeTab === "ANGGOTA"}
                label="Tenaga Kependidikan"
                count={statistics.other}
                onClick={() =>
                  setActiveTab("ANGGOTA")
                }
              />

              <MemberTab
                active={activeTab === "NONACTIVE"}
                label="Non-Aktif"
                count={statistics.inactive}
                onClick={() =>
                  setActiveTab("NONACTIVE")
                }
              />
            </div>

            <div className="member-filter-row">
              <div className="member-search">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari nama, NIM, NIDN, email..."
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Semua Jenis
                </option>
                <option value="MAHASISWA">
                  Mahasiswa
                </option>
                <option value="DOSEN">
                  Dosen
                </option>
                <option value="ANGGOTA">
                  Tenaga Kependidikan
                </option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Semua Status
                </option>
                <option value="ACTIVE">
                  Aktif
                </option>
                <option value="INACTIVE">
                  Non-Aktif
                </option>
              </select>

              <select
                value={facultyFilter}
                onChange={(event) =>
                  setFacultyFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Semua Fakultas
                </option>

                {faculties.map((faculty) => (
                  <option
                    key={faculty}
                    value={faculty}
                  >
                    {faculty}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="member-filter-button"
              >
                <Filter size={15} />
                Filter
              </button>

              <button
                type="button"
                className="member-reset-button"
                onClick={resetFilters}
              >
                <RefreshCw size={15} />
                Reset
              </button>
            </div>

            <div className="member-table-scroll">
              <table className="member-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Foto</th>
                    <th>Nama</th>
                    <th>ID Anggota</th>
                    <th>Jenis</th>
                    <th>Fakultas</th>
                    <th>Status</th>
                    <th>Tanggal Daftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="member-table-state"
                      >
                        Memuat data anggota...
                      </td>
                    </tr>
                  ) : paginatedMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="member-table-state"
                      >
                        <CircleUserRound size={32} />
                        <strong>
                          Tidak ada anggota
                        </strong>
                        <span>
                          Coba ubah pencarian atau filter.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map(
                      (member, index) => (
                        <tr
                          key={member.id}
                          className={
                            selectedMember?.id ===
                            member.id
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            openDetail(member)
                          }
                        >
                          <td>
                            {(currentPage - 1) *
                              PAGE_SIZE +
                              index +
                              1}
                          </td>

                          <td>
                            <MemberAvatar
                              name={member.fullName}
                              size="small"
                            />
                          </td>

                          <td>
                            <div className="member-name-cell">
                              <strong>
                                {member.fullName}
                              </strong>
                              <span>
                                {member.email}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="member-id">
                              {member.npm ??
                                member.lecturerNumber ??
                                member.username ??
                                `USR-${member.id}`}
                            </span>
                          </td>

                          <td>
                            <TypeBadge
                              type={member.type}
                            />
                          </td>

                          <td>
                            <span className="member-faculty">
                              {member.faculty ?? "—"}
                            </span>
                          </td>

                          <td>
                            <StatusBadge
                              isActive={
                                member.isActive
                              }
                            />
                          </td>

                          <td>
                            <span className="member-date">
                              {formatDate(
                                member.createdAt,
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="member-row-action"
                              aria-label={`Detail ${member.fullName}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetail(member);
                              }}
                            >
                              •••
                            </button>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="member-pagination">
              <span>
                Menampilkan {showingFrom}–{showingTo} dari{" "}
                {filteredMembers.length} anggota
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1),
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers(
                  currentPage,
                  totalPages,
                ).map((item, index) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="pagination-ellipsis"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={
                        currentPage === item
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPage(item)
                      }
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={
                    currentPage >= totalPages
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.min(
                        totalPages,
                        value + 1,
                      ),
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {selectedMember && (
            <aside className="member-detail-panel">
              <div className="member-detail-heading">
                <div>
                  <span>DETAIL ANGGOTA</span>
                  <h2>Detail Anggota</h2>
                </div>

                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Tutup detail"
                >
                  <X size={19} />
                </button>
              </div>

              {detailLoading ? (
                <div className="member-detail-loading">
                  Memuat detail...
                </div>
              ) : (
                <>
                  <div className="member-detail-profile">
                    <MemberAvatar
                      name={
                        selectedMember.fullName
                      }
                      size="large"
                    />

                    <div>
                      <div className="member-detail-status-row">
                        <StatusBadge
                          isActive={
                            selectedMember.isActive
                          }
                        />
                      </div>

                      <h3>
                        {selectedMember.fullName}
                      </h3>

                      <span>
                        {selectedMember.npm ??
                          selectedMember.lecturerNumber ??
                          selectedMember.username ??
                          "ID belum tersedia"}
                      </span>

                      <small>
                        {typeLabel(
                          selectedMember.type,
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="member-detail-tabs">
                    <button
                      type="button"
                      className={
                        detailTab === "info"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setDetailTab("info")
                      }
                    >
                      Informasi
                    </button>

                    <button
                      type="button"
                      className={
                        detailTab === "loans"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setDetailTab("loans")
                      }
                    >
                      Peminjaman
                    </button>

                    <button
                      type="button"
                      className={
                        detailTab === "reservations"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setDetailTab("reservations")
                      }
                    >
                      Reservasi
                    </button>
                  </div>

                  {detailTab === "info" && (
                    <div className="member-detail-content">
                      <DetailInfo
                        icon={<UserRound size={15} />}
                        label="Nama Lengkap"
                        value={
                          selectedMember.fullName
                        }
                      />

                      <DetailInfo
                        icon={<ShieldCheck size={15} />}
                        label={
                          selectedMember.type ===
                          "DOSEN"
                            ? "No. Dosen"
                            : "NPM"
                        }
                        value={
                          selectedMember.npm ??
                          selectedMember.lecturerNumber ??
                          "—"
                        }
                      />

                      <DetailInfo
                        icon={<Mail size={15} />}
                        label="Email"
                        value={
                          selectedMember.email
                        }
                      />

                      <DetailInfo
                        icon={<GraduationCap size={15} />}
                        label="Fakultas"
                        value={
                          selectedMember.faculty ??
                          "—"
                        }
                      />

                      <DetailInfo
                        icon={<BookOpen size={15} />}
                        label="Program Studi"
                        value={
                          selectedMember.studyProgram ??
                          "—"
                        }
                      />

                      <DetailInfo
                        icon={<Phone size={15} />}
                        label="No. HP"
                        value={
                          selectedMember.phone ??
                          "—"
                        }
                      />

                      <DetailInfo
                        icon={<CalendarDays size={15} />}
                        label="Tanggal Daftar"
                        value={formatDate(
                          selectedMember.createdAt,
                        )}
                      />

                      <DetailInfo
                        icon={<MapPin size={15} />}
                        label="Status Akun"
                        value={
                          selectedMember.isActive
                            ? "Aktif"
                            : "Non-Aktif"
                        }
                      />
                    </div>
                  )}

                  {detailTab === "loans" && (
                    <div className="member-tab-empty">
                      <BookOpen size={30} />
                      <strong>
                        Ringkasan Peminjaman
                      </strong>

                      <div className="member-mini-stats">
                        <MiniStat
                          label="Aktif"
                          value={
                            selectedMember
                              .statistics
                              ?.activeLoans ?? 0
                          }
                        />

                        <MiniStat
                          label="Terlambat"
                          value={
                            selectedMember
                              .statistics
                              ?.overdueLoans ?? 0
                          }
                        />
                      </div>
                    </div>
                  )}

                  {detailTab ===
                    "reservations" && (
                    <div className="member-tab-empty">
                      <CalendarDays size={30} />
                      <strong>
                        Reservasi Anggota
                      </strong>
                      <span>
                        Riwayat reservasi akan
                        ditampilkan pada modul
                        reservasi anggota.
                      </span>
                    </div>
                  )}

                  <div className="member-detail-actions">
                    <button
                      type="button"
                      className="member-edit-button"
                      onClick={openEditModal}
                    >
                      <Pencil size={16} />
                      Edit Data
                    </button>

                    <button
                      type="button"
                      className={
                        selectedMember.isActive
                          ? "member-deactivate-button"
                          : "member-activate-button"
                      }
                      disabled={statusSaving}
                      onClick={toggleStatus}
                    >
                      {selectedMember.isActive ? (
                        <>
                          <XCircle size={16} />
                          Nonaktifkan
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Aktifkan
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="member-delete-button"
                      onClick={deleteMember}
                    >
                      Hapus Anggota
                    </button>
                  </div>
                </>
              )}
            </aside>
          )}

          {!selectedMember && (
            <aside className="member-detail-placeholder">
              <CircleUserRound size={42} />
              <strong>
                Pilih Anggota
              </strong>
              <span>
                Klik salah satu anggota pada tabel
                untuk melihat detail.
              </span>
            </aside>
          )}
        </section>

        {showEditModal && selectedMember && (
          <div
            className="member-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeEditModal();
              }
            }}
          >
            <div
              className="member-create-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-member-title"
            >
              <div className="member-create-heading">
                <div>
                  <span>SUPER ADMIN · ANGGOTA</span>
                  <h2 id="edit-member-title">
                    Edit Data Anggota
                  </h2>
                  <p>
                    Perbarui informasi anggota dan kelola
                    akses akun.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={
                    editSaving ||
                    passwordResetSaving
                  }
                  aria-label="Tutup form"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                className="member-create-form"
                onSubmit={updateMember}
              >
                <div className="member-form-section">
                  <div className="member-form-section-title">
                    Data Akun
                  </div>

                  <div className="member-form-grid">
                    <label className="member-form-field full">
                      <span>Nama Lengkap *</span>
                      <input
                        required
                        maxLength={100}
                        value={editForm.fullName}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            fullName:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="member-form-field">
                      <span>Email *</span>
                      <input
                        required
                        type="email"
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            email:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="member-form-field">
                      <span>Username</span>
                      <input
                        maxLength={50}
                        value={editForm.username}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            username:
                              event.target.value,
                          }))
                        }
                        placeholder="Username"
                      />
                    </label>

                    <label className="member-form-field full">
                      <span>No. HP</span>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            phone:
                              event.target.value,
                          }))
                        }
                        placeholder="08xxxxxxxxxx"
                      />
                    </label>
                  </div>
                </div>

                {selectedMember.type === "MAHASISWA" && (
                  <div className="member-form-section">
                    <div className="member-form-section-title">
                      Data Mahasiswa
                    </div>

                    <div className="member-form-grid">
                      <label className="member-form-field">
                        <span>NPM *</span>
                        <input
                          required
                          maxLength={30}
                          value={editForm.npm}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              npm:
                                event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Tahun Masuk</span>
                        <input
                          type="number"
                          min={1900}
                          max={2100}
                          value={
                            editForm.enrollmentYear
                          }
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              enrollmentYear:
                                event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Fakultas</span>
                        <input
                          maxLength={100}
                          value={editForm.faculty}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              faculty:
                                event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Program Studi</span>
                        <input
                          maxLength={100}
                          value={
                            editForm.studyProgram
                          }
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              studyProgram:
                                event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedMember.type === "DOSEN" && (
                  <div className="member-form-section">
                    <div className="member-form-section-title">
                      Data Dosen
                    </div>

                    <div className="member-form-grid">
                      <label className="member-form-field">
                        <span>No. Dosen *</span>
                        <input
                          required
                          maxLength={50}
                          value={
                            editForm.lecturerNumber
                          }
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              lecturerNumber:
                                event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Fakultas</span>
                        <input
                          maxLength={100}
                          value={editForm.faculty}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              faculty:
                                event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="member-form-field full">
                        <span>Program Studi</span>
                        <input
                          maxLength={100}
                          value={
                            editForm.studyProgram
                          }
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              studyProgram:
                                event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedMember.type === "ANGGOTA" && (
                  <div className="member-form-info">
                    <ShieldCheck size={16} />
                    <span>
                      Akun ini merupakan anggota umum
                      perpustakaan.
                    </span>
                  </div>
                )}

                <div className="member-form-section">
                  <div className="member-form-section-title">
                    Reset Password
                  </div>

                  <div className="member-form-grid">
                    <label className="member-form-field full">
                      <span>Password Baru</span>
                      <input
                        type="password"
                        minLength={8}
                        value={resetPassword}
                        onChange={(event) => {
                          setResetPassword(
                            event.target.value,
                          );
                          setEditError("");
                        }}
                        placeholder="Minimal 8 karakter"
                        disabled={
                          editSaving ||
                          passwordResetSaving
                        }
                      />
                    </label>
                  </div>

                  <div className="member-reset-password-row">
                    <span>
                      Password lama tidak diperlukan.
                      Reset dilakukan oleh SUPER_ADMIN.
                    </span>

                    <button
                      type="button"
                      className="member-reset-password-button"
                      onClick={handleResetPassword}
                      disabled={
                        passwordResetSaving ||
                        editSaving ||
                        resetPassword.length < 8
                      }
                    >
                      {passwordResetSaving ? (
                        <>
                          <RefreshCw
                            size={14}
                            className="member-spin"
                          />
                          Mereset...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </button>
                  </div>
                </div>

                {editError && (
                  <div className="member-create-error">
                    <XCircle size={16} />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="member-create-footer">
                  <button
                    type="button"
                    className="member-create-cancel"
                    onClick={closeEditModal}
                    disabled={
                      editSaving ||
                      passwordResetSaving
                    }
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="member-create-submit"
                    disabled={
                      editSaving ||
                      passwordResetSaving
                    }
                  >
                    {editSaving ? (
                      <>
                        <RefreshCw
                          size={15}
                          className="member-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div
            className="member-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeCreateModal();
              }
            }}
          >
            <div
              className="member-create-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-member-title"
            >
              <div className="member-create-heading">
                <div>
                  <span>SUPER ADMIN · ANGGOTA</span>
                  <h2 id="create-member-title">
                    Tambah Anggota
                  </h2>
                  <p>
                    Buat akun anggota secara langsung tanpa
                    proses registrasi mandiri.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createSaving}
                  aria-label="Tutup form"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                className="member-create-form"
                onSubmit={createMember}
              >
                <div className="member-form-section">
                  <div className="member-form-section-title">
                    Data Akun
                  </div>

                  <div className="member-form-grid">
                    <label className="member-form-field full">
                      <span>Nama Lengkap *</span>
                      <input
                        required
                        maxLength={100}
                        value={createForm.fullName}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            fullName: event.target.value,
                          }))
                        }
                        placeholder="Nama lengkap anggota"
                      />
                    </label>

                    <label className="member-form-field">
                      <span>Email *</span>
                      <input
                        required
                        type="email"
                        value={createForm.email}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="Masukkan alamat email"
                      />
                    </label>

                    <label className="member-form-field">
                      <span>No. HP</span>
                      <input
                        type="tel"
                        value={createForm.phone}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="08xxxxxxxxxx"
                      />
                    </label>

                    <label className="member-form-field">
                      <span>Password Awal *</span>
                      <input
                        required
                        type="password"
                        minLength={8}
                        value={createForm.password}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder="Minimal 8 karakter"
                      />
                    </label>

                    <label className="member-form-field">
                      <span>Jenis Anggota *</span>
                      <select
                        required
                        value={createForm.type}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            type: event.target.value as Member["type"],
                            npm: "",
                            lecturerNumber: "",
                          }))
                        }
                      >
                        <option value="MAHASISWA">
                          Mahasiswa
                        </option>
                        <option value="DOSEN">
                          Dosen
                        </option>
                        <option value="ANGGOTA">
                          Tenaga Kependidikan
                        </option>
                      </select>
                    </label>
                  </div>
                </div>

                {createForm.type === "MAHASISWA" && (
                  <div className="member-form-section">
                    <div className="member-form-section-title">
                      Data Mahasiswa
                    </div>

                    <div className="member-form-grid">
                      <label className="member-form-field">
                        <span>NPM *</span>
                        <input
                          required
                          maxLength={30}
                          value={createForm.npm}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              npm: event.target.value,
                            }))
                          }
                          placeholder="Nomor Pokok Mahasiswa"
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Tahun Masuk</span>
                        <input
                          type="number"
                          min={1900}
                          max={2100}
                          value={createForm.enrollmentYear}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              enrollmentYear: event.target.value,
                            }))
                          }
                          placeholder="2026"
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Fakultas</span>
                        <input
                          maxLength={100}
                          value={createForm.faculty}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              faculty: event.target.value,
                            }))
                          }
                          placeholder="Fakultas"
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Program Studi</span>
                        <input
                          maxLength={100}
                          value={createForm.studyProgram}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              studyProgram: event.target.value,
                            }))
                          }
                          placeholder="Program studi"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {createForm.type === "DOSEN" && (
                  <div className="member-form-section">
                    <div className="member-form-section-title">
                      Data Dosen
                    </div>

                    <div className="member-form-grid">
                      <label className="member-form-field">
                        <span>No. Dosen *</span>
                        <input
                          required
                          maxLength={50}
                          value={createForm.lecturerNumber}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              lecturerNumber: event.target.value,
                            }))
                          }
                          placeholder="NIDN / nomor dosen"
                        />
                      </label>

                      <label className="member-form-field">
                        <span>Fakultas</span>
                        <input
                          maxLength={100}
                          value={createForm.faculty}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              faculty: event.target.value,
                            }))
                          }
                          placeholder="Fakultas"
                        />
                      </label>

                      <label className="member-form-field full">
                        <span>Program Studi</span>
                        <input
                          maxLength={100}
                          value={createForm.studyProgram}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              studyProgram: event.target.value,
                            }))
                          }
                          placeholder="Program studi"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {createForm.type === "ANGGOTA" && (
                  <div className="member-form-info">
                    <ShieldCheck size={16} />
                    <span>
                      Akun Tenaga Kependidikan akan dibuat
                      sebagai anggota umum perpustakaan.
                    </span>
                  </div>
                )}

                {createError && (
                  <div className="member-create-error">
                    <XCircle size={16} />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="member-create-footer">
                  <button
                    type="button"
                    className="member-create-cancel"
                    onClick={closeCreateModal}
                    disabled={createSaving}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="member-create-submit"
                    disabled={createSaving}
                  >
                    {createSaving ? (
                      <>
                        <RefreshCw
                          size={15}
                          className="member-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Tambah Anggota
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <style jsx global>{`
  .member-management-page {
    min-height: calc(100vh - 72px);
    padding: 28px 26px 44px;
    background:
      radial-gradient(
        circle at 92% 8%,
        rgba(42, 126, 210, 0.10),
        transparent 26%
      ),
      linear-gradient(
        180deg,
        #f5f9fd 0%,
        #eef4f9 100%
      );
  }

  .member-management-hero {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-height: 178px;
    max-width: 1500px;
    margin: 0 auto 18px;
    overflow: hidden;
    padding: 28px 30px;
    border: 1px solid rgba(35, 105, 166, 0.10);
    border-radius: 24px;
    background:
      linear-gradient(
        100deg,
        #edf5ff 0%,
        #f8fbff 57%,
        rgba(224, 239, 252, 0.92) 100%
      );
    box-shadow:
      0 14px 35px rgba(30, 74, 111, 0.07);
  }

  .member-hero-copy {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .member-hero-icon {
    display: grid;
    place-items: center;
    width: 62px;
    height: 62px;
    flex: 0 0 62px;
    border-radius: 19px;
    color: #1267c5;
    background:
      linear-gradient(
        145deg,
        #dcecff,
        #eef6ff
      );
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.9);
  }

  .member-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #2676c5;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .14em;
  }

  .member-hero-copy h1 {
    margin: 0;
    color: #0d2344;
    font-size: clamp(28px, 3vw, 36px);
    line-height: 1.08;
    letter-spacing: -.035em;
  }

  .member-hero-copy p {
    margin: 7px 0 0;
    color: #53677f;
    font-size: 13px;
  }

  .member-hero-building {
    position: absolute;
    top: 0;
    right: 185px;
    width: 430px;
    height: 100%;
    opacity: .76;
    background:
      linear-gradient(
        90deg,
        rgba(238,246,253,1) 0%,
        rgba(238,246,253,.05) 35%,
        rgba(238,246,253,.05) 100%
      ),
      url("/unexa2.jpeg") center 36% / cover no-repeat;
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 23%,
      #000 100%
    );
  }

  .member-hero-building-glow {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        90deg,
        #edf5ff 0%,
        rgba(237,245,255,.42) 28%,
        transparent 65%
      );
  }

  .member-hero-quote {
    position: absolute;
    right: 28px;
    top: 30px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
    color: #0b2748;
    font-size: 11px;
    line-height: 1.45;
  }

  .member-hero-quote span {
    display: block;
    width: 42px;
    height: 2px;
    background: #e6b94d;
  }

  .member-hero-actions {
    position: absolute;
    z-index: 5;
    top: 28px;
    right: 30px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    align-self: stretch;
    justify-content: space-between;
    margin-left: auto;
  }

  .member-breadcrumb {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #8190a3;
    font-size: 10px;
  }

  .member-breadcrumb strong {
    color: #3c5875;
    font-weight: 700;
  }

  .member-add-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 17px;
    border: 0;
    border-radius: 11px;
    color: #fff;
    background:
      linear-gradient(
        135deg,
        #1175e8,
        #1261c8
      );
    box-shadow:
      0 9px 20px rgba(18, 103, 201, .22);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .member-success,
  .member-error {
    display: flex;
    align-items: center;
    gap: 9px;
    max-width: 1500px;
    margin: 0 auto 14px;
    padding: 11px 14px;
    border-radius: 11px;
    font-size: 12px;
  }

  .member-success {
    color: #11724d;
    border: 1px solid #c8eadb;
    background: #f0fbf6;
  }

  .member-error {
    color: #a42f3e;
    border: 1px solid #f0cbd0;
    background: #fff5f6;
  }

  .member-success span,
  .member-error span {
    flex: 1;
  }

  .member-success button,
  .member-error button {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    cursor: pointer;
  }

  .member-hero-stats {
    position: relative;
    z-index: 4;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
    margin-top: 24px;
  }

  .member-hero-stats .member-stat-card {
    min-height: 76px;
    padding: 12px 14px;
    border: 1px solid rgba(27, 72, 112, .07);
    border-radius: 15px;
    background: rgba(255,255,255,.88);
    box-shadow: 0 7px 20px rgba(31,72,107,.045);
  }

  .member-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    max-width: 1500px;
    margin: 0 auto 18px;
  }

  .member-stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 86px;
    padding: 15px 18px;
    border: 1px solid rgba(27, 72, 112, .07);
    border-radius: 18px;
    background: rgba(255,255,255,.94);
    box-shadow:
      0 10px 28px rgba(31,72,107,.055);
  }

  .member-stat-icon {
    display: grid;
    place-items: center;
    width: 49px;
    height: 49px;
    flex: 0 0 49px;
    border-radius: 50%;
  }

  .member-stat-icon.blue {
    color: #1669c9;
    background: #e9f1ff;
  }

  .member-stat-icon.cyan {
    color: #1475d2;
    background: #e8f4ff;
  }

  .member-stat-icon.gold {
    color: #e6a629;
    background: #fff5df;
  }

  .member-stat-icon.purple {
    color: #6b49d9;
    background: #f0ebff;
  }

  .member-stat-copy strong {
    display: block;
    color: #102548;
    font-size: 23px;
    line-height: 1;
    letter-spacing: -.02em;
  }

  .member-stat-copy span {
    display: block;
    margin-top: 5px;
    color: #5d6f83;
    font-size: 11px;
  }

  .member-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 14px;
    max-width: 1500px;
    margin: 0 auto;
    align-items: stretch;
  }

  .member-list-area,
  .member-detail-panel,
  .member-detail-placeholder {
    min-width: 0;
    border: 1px solid rgba(24, 65, 101, .08);
    border-radius: 18px;
    background: #fff;
    box-shadow:
      0 12px 32px rgba(27, 65, 100, .055);
  }

  .member-list-area {
    overflow: hidden;
  }

  .member-tabs {
    display: flex;
    align-items: stretch;
    gap: 4px;
    padding: 7px 10px 0;
    border-bottom: 1px solid #edf1f5;
    overflow-x: auto;
  }

  .member-main-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 13px;
    border: 0;
    border-radius: 10px 10px 0 0;
    color: #5c6d81;
    background: transparent;
    font: inherit;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
  }

  .member-main-tab b {
    padding: 3px 7px;
    border-radius: 999px;
    color: #5e7085;
    background: #eef2f6;
    font-size: 9px;
    font-weight: 800;
  }

  .member-main-tab.active {
    color: #1269d0;
    background: #e9f2ff;
    box-shadow:
      inset 0 -2px 0 #1976e8;
    font-weight: 800;
  }

  .member-main-tab.active b {
    color: #1269d0;
    background: #fff;
  }

  .member-filter-row {
    display: grid;
    grid-template-columns: minmax(220px, 1.6fr) repeat(3, minmax(105px, .8fr)) auto auto;
    gap: 8px;
    padding: 13px 14px;
    border-bottom: 1px solid #edf1f5;
  }

  .member-search,
  .member-filter-row select {
    height: 36px;
    border: 1px solid #dce4ec;
    border-radius: 9px;
    background: #fbfcfe;
  }

  .member-search {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 10px;
    color: #7b8b9d;
  }

  .member-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    color: #273f58;
    background: transparent;
    font: inherit;
    font-size: 11px;
  }

  .member-filter-row select {
    padding: 0 9px;
    outline: 0;
    color: #53677e;
    font: inherit;
    font-size: 10px;
  }

  .member-filter-button,
  .member-reset-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 11px;
    border-radius: 9px;
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }

  .member-filter-button {
    border: 1px solid #bcd7f4;
    color: #1768c6;
    background: #f2f8ff;
  }

  .member-reset-button {
    border: 1px solid #dce4ec;
    color: #445b73;
    background: #fff;
  }

  .member-table-scroll {
    overflow-x: auto;
  }

  .member-table {
    width: 100%;
    min-width: 920px;
    border-collapse: collapse;
  }

  .member-table th {
    padding: 11px 10px;
    border-bottom: 1px solid #e8edf2;
    color: #52667d;
    background: #f9fbfd;
    font-size: 9px;
    font-weight: 800;
    text-align: left;
    white-space: nowrap;
  }

  .member-table td {
    padding: 10px;
    border-bottom: 1px solid #eef2f5;
    color: #4d6177;
    font-size: 10px;
    vertical-align: middle;
    white-space: nowrap;
  }

  .member-table tbody tr {
    transition:
      background .16s ease,
      box-shadow .16s ease;
    cursor: pointer;
  }

  .member-table tbody tr:hover,
  .member-table tbody tr.selected {
    background: #f6faff;
  }

  .member-table tbody tr.selected {
    box-shadow:
      inset 3px 0 0 #1675e7;
  }

  .member-avatar {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 12px;
    color: #155fae;
    background:
      linear-gradient(
        145deg,
        #dceeff,
        #c7e2f7
      );
    font-weight: 800;
  }

  .member-avatar-small {
    width: 34px;
    height: 34px;
    font-size: 9px;
  }

  .member-avatar-large {
    width: 78px;
    height: 78px;
    border-radius: 17px;
    font-size: 18px;
  }

  .member-name-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .member-name-cell strong {
    color: #162d49;
    font-size: 11px;
  }

  .member-name-cell span {
    color: #8794a3;
    font-size: 9px;
  }

  .member-id {
    color: #314c68;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
  }

  .member-type-badge,
  .member-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    white-space: nowrap;
    font-weight: 800;
  }

  .member-type-badge {
    padding: 5px 8px;
    font-size: 9px;
  }

  .member-type-mahasiswa {
    color: #1767c6;
    background: #e6f0ff;
  }

  .member-type-dosen {
    color: #5b3cc4;
    background: #eee8ff;
  }

  .member-type-anggota {
    color: #8d6517;
    background: #fff1d2;
  }

  .member-status-badge {
    padding: 5px 8px;
    font-size: 9px;
  }

  .member-status-badge i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .member-status-badge.active {
    color: #12804f;
    background: #dcf7e9;
  }

  .member-status-badge.active i {
    background: #18a365;
  }

  .member-status-badge.inactive {
    color: #bd3949;
    background: #fde5e9;
  }

  .member-status-badge.inactive i {
    background: #d84c5d;
  }

  .member-faculty,
  .member-date {
    color: #53687e;
    font-size: 10px;
  }

  .member-row-action {
    width: 31px;
    height: 29px;
    border: 1px solid #e0e7ee;
    border-radius: 9px;
    color: #4b6076;
    background: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    cursor: pointer;
  }

  .member-row-action:hover {
    color: #126bd0;
    border-color: #bdd7f2;
    background: #f2f8ff;
  }

  .member-table-state {
    height: 260px;
    text-align: center !important;
  }

  .member-table-state strong,
  .member-table-state span {
    display: block;
    margin-top: 6px;
  }

  .member-table-state strong {
    color: #53677c;
  }

  .member-table-state span {
    color: #8c9aaa;
  }

  .member-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 15px;
    color: #7d8b9a;
    font-size: 10px;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pagination-controls button,
  .pagination-ellipsis {
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 30px;
    padding: 0 7px;
    border: 1px solid #e0e7ee;
    border-radius: 8px;
    color: #53677d;
    background: #fff;
    font: inherit;
    font-size: 10px;
    cursor: pointer;
  }

  .pagination-controls button.active {
    border-color: #1875e5;
    color: #fff;
    background: #1875e5;
    box-shadow: 0 5px 12px rgba(24,117,229,.2);
  }

  .pagination-controls button:disabled {
    opacity: .4;
    cursor: not-allowed;
  }

  .pagination-ellipsis {
    border: 0;
    cursor: default;
  }

  .member-detail-panel {
    overflow: hidden;
  }

  .member-detail-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 18px 18px 15px;
    border-bottom: 1px solid #edf1f5;
  }

  .member-detail-heading span {
    color: #8290a0;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: .13em;
  }

  .member-detail-heading h2 {
    margin: 4px 0 0;
    color: #122946;
    font-size: 16px;
  }

  .member-detail-heading button {
    display: grid;
    place-items: center;
    width: 29px;
    height: 29px;
    border: 0;
    border-radius: 8px;
    color: #708095;
    background: #f5f7f9;
    cursor: pointer;
  }

  .member-detail-profile {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 19px 18px;
    background: #fbfcfe;
  }

  .member-detail-profile h3 {
    margin: 6px 0 3px;
    color: #152d4a;
    font-size: 14px;
  }

  .member-detail-profile span,
  .member-detail-profile small {
    display: block;
    color: #6f8094;
    font-size: 10px;
  }

  .member-detail-profile small {
    margin-top: 4px;
    color: #8997a6;
  }

  .member-detail-status-row {
    min-height: 17px;
  }

  .member-detail-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid #e9eef3;
  }

  .member-detail-tabs button {
    position: relative;
    padding: 12px 5px;
    border: 0;
    color: #8a96a5;
    background: #fff;
    font: inherit;
    font-size: 10px;
    cursor: pointer;
  }

  .member-detail-tabs button.active {
    color: #152f4d;
    font-weight: 800;
  }

  .member-detail-tabs button.active::after {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px;
    background: #1474df;
  }

  .member-detail-content {
    padding: 10px 18px 16px;
  }

  .member-detail-info {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f3f6;
  }

  .member-detail-info:last-child {
    border-bottom: 0;
  }

  .member-detail-info-icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex: 0 0 26px;
    border-radius: 8px;
    color: #6f8194;
    background: #f1f5f8;
  }

  .member-detail-info span,
  .member-detail-info strong {
    display: block;
  }

  .member-detail-info span {
    color: #7e8c9c;
    font-size: 9px;
  }

  .member-detail-info strong {
    margin-top: 3px;
    color: #304a64;
    font-size: 10px;
    line-height: 1.45;
    word-break: break-word;
  }

  .member-detail-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 15px 18px 18px;
    border-top: 1px solid #edf1f5;
  }

  .member-edit-button,
  .member-deactivate-button,
  .member-activate-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    border-radius: 9px;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .member-edit-button {
    border: 0;
    color: #fff;
    background: #1675df;
    box-shadow: 0 6px 14px rgba(22,117,223,.17);
  }

  .member-deactivate-button {
    border: 1px solid #bcd6f3;
    color: #1766c2;
    background: #f3f8ff;
  }

  .member-activate-button {
    border: 1px solid #bde6d0;
    color: #13764c;
    background: #effbf5;
  }

  .member-edit-button:hover,
  .member-deactivate-button:hover,
  .member-activate-button:hover {
    filter: brightness(.98);
  }

  .member-edit-button:disabled,
  .member-deactivate-button:disabled,
  .member-activate-button:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .member-detail-loading,
  .member-tab-empty {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    color: #8391a0;
    text-align: center;
    font-size: 10px;
  }

  .member-tab-empty strong {
    color: #425a72;
    font-size: 12px;
  }

  .member-mini-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 8px;
    margin-top: 8px;
  }

  .member-mini-stat {
    padding: 13px;
    border: 1px solid #e6edf2;
    border-radius: 11px;
    background: #fbfcfd;
  }

  .member-mini-stat span {
    display: block;
    color: #8a98a7;
    font-size: 9px;
  }

  .member-mini-stat strong {
    display: block;
    margin-top: 4px;
    color: #173653;
    font-size: 18px;
  }

  .member-detail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 470px;
    padding: 28px;
    color: #9aa7b5;
    text-align: center;
  }

  .member-detail-placeholder strong {
    margin-top: 10px;
    color: #50657b;
    font-size: 13px;
  }

  .member-detail-placeholder span {
    max-width: 190px;
    margin-top: 5px;
    font-size: 10px;
    line-height: 1.55;
  }

  .member-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(10, 29, 50, .42);
    backdrop-filter: blur(7px);
  }

  .member-create-modal {
    width: min(760px, 100%);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    border: 1px solid rgba(255,255,255,.75);
    border-radius: 22px;
    background: #fff;
    box-shadow:
      0 28px 70px rgba(13, 42, 70, .22);
  }

  .member-create-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 22px 24px 18px;
    border-bottom: 1px solid #edf1f5;
    background:
      linear-gradient(
        135deg,
        #f2f8ff 0%,
        #ffffff 72%
      );
  }

  .member-create-heading span {
    color: #2676c5;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: .14em;
  }

  .member-create-heading h2 {
    margin: 5px 0 4px;
    color: #102846;
    font-size: 21px;
    letter-spacing: -.025em;
  }

  .member-create-heading p {
    margin: 0;
    color: #718196;
    font-size: 10px;
    line-height: 1.5;
  }

  .member-create-heading > button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border: 0;
    border-radius: 9px;
    color: #687b90;
    background: #eef3f7;
    cursor: pointer;
  }

  .member-create-heading > button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .member-create-form {
    padding: 20px 24px 22px;
  }

  .member-reset-password-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 13px;
    padding: 11px 12px;
    border: 1px solid #e5edf4;
    border-radius: 11px;
    background: #f7fafc;
  }

  .member-reset-password-row span {
    color: #718196;
    font-size: 9px;
    line-height: 1.5;
  }

  .member-reset-password-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 0 0 auto;
    min-height: 31px;
    padding: 0 12px;
    border: 1px solid #d8e4ee;
    border-radius: 8px;
    color: #245f91;
    background: #fff;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }

  .member-reset-password-button:hover:not(:disabled) {
    border-color: #9fc4df;
    background: #eef7ff;
  }

  .member-reset-password-button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  @media (max-width: 620px) {
    .member-reset-password-row {
      align-items: stretch;
      flex-direction: column;
    }

    .member-reset-password-button {
      width: 100%;
    }
  }

  .member-form-section {
    padding: 15px;
    border: 1px solid #e8eef3;
    border-radius: 14px;
    background: #fbfcfe;
  }

  .member-form-section + .member-form-section {
    margin-top: 12px;
  }

  .member-form-section-title {
    margin-bottom: 12px;
    color: #284967;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .04em;
  }

  .member-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
  }

  .member-form-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .member-form-field.full {
    grid-column: 1 / -1;
  }

  .member-form-field span {
    color: #536a80;
    font-size: 9px;
    font-weight: 800;
  }

  .member-form-field input,
  .member-form-field select {
    width: 100%;
    height: 38px;
    padding: 0 10px;
    border: 1px solid #dce5ed;
    border-radius: 9px;
    outline: 0;
    color: #263f59;
    background: #fff;
    font: inherit;
    font-size: 10px;
    box-sizing: border-box;
    transition:
      border-color .15s ease,
      box-shadow .15s ease;
  }

  .member-form-field input:focus,
  .member-form-field select:focus {
    border-color: #75aee7;
    box-shadow: 0 0 0 3px rgba(28,119,220,.08);
  }

  .member-form-field input::placeholder {
    color: #a0acb9;
  }

  .member-form-info {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 12px;
    padding: 11px 13px;
    border: 1px solid #dceafa;
    border-radius: 10px;
    color: #456782;
    background: #f4f9ff;
    font-size: 10px;
  }

  .member-create-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid #f0cbd0;
    border-radius: 10px;
    color: #a42f3e;
    background: #fff5f6;
    font-size: 10px;
    line-height: 1.45;
  }

  .member-create-error span {
    flex: 1;
  }

  .member-create-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 17px;
  }

  .member-create-cancel,
  .member-create-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px;
    padding: 0 15px;
    border-radius: 9px;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .member-create-cancel {
    border: 1px solid #dce4ec;
    color: #53677c;
    background: #fff;
  }

  .member-create-submit {
    border: 0;
    color: #fff;
    background:
      linear-gradient(
        135deg,
        #1175e8,
        #1261c8
      );
    box-shadow:
      0 7px 16px rgba(18,103,201,.2);
  }

  .member-create-cancel:disabled,
  .member-create-submit:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .member-spin {
    animation: member-spin-animation .8s linear infinite;
  }

  @keyframes member-spin-animation {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1250px) {
    .member-workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .member-detail-panel,
    .member-detail-placeholder {
      display: none;
    }

    .member-filter-row {
      grid-template-columns:
        minmax(220px, 1fr)
        repeat(3, minmax(120px, .7fr))
        auto auto;
    }
  }

  @media (max-width: 1000px) {
    .member-hero-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .member-hero-building {
      right: 120px;
      width: 340px;
    }

    .member-stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .member-filter-row {
      grid-template-columns:
        1fr 1fr;
    }

    .member-search {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    .member-hero-stats {
      grid-template-columns: 1fr;
    }

    .member-management-page {
      padding: 18px 12px 35px;
    }

    .member-management-hero {
      min-height: 160px;
      padding: 21px;
    }

    .member-hero-copy {
      align-items: flex-start;
    }

    .member-hero-building {
      display: none;
    }

    .member-hero-actions {
      display: none;
    }

    .member-hero-copy h1 {
      font-size: 26px;
    }

    .member-stat-grid {
      grid-template-columns: 1fr;
    }

    .member-filter-row {
      grid-template-columns: 1fr;
    }

    .member-search {
      grid-column: auto;
    }

    .member-filter-button,
    .member-reset-button,
    .member-filter-row select {
      width: 100%;
    }

    .member-pagination {
      align-items: flex-start;
      flex-direction: column;
    }

    .member-modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }

    .member-create-modal {
      width: 100%;
      max-height: 92vh;
      border-radius: 20px 20px 0 0;
    }

    .member-create-heading,
    .member-create-form {
      padding-left: 18px;
      padding-right: 18px;
    }

    .member-form-grid {
      grid-template-columns: 1fr;
    }

    .member-form-field.full {
      grid-column: auto;
    }

    .member-create-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .member-create-cancel,
    .member-create-submit {
      width: 100%;
    }

    .pagination-controls {
      width: 100%;
      overflow-x: auto;
    }
  }
`}</style>
    </>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "blue" | "cyan" | "gold" | "purple";
}) {
  return (
    <article className="member-stat-card">
      <div className={`member-stat-icon ${tone}`}>
        {icon}
      </div>

      <div className="member-stat-copy">
        <strong>
          {value.toLocaleString("id-ID")}
        </strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function MemberTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active ? "member-main-tab active" : "member-main-tab"
      }
      onClick={onClick}
    >
      <span>{label}</span>
      <b>{count.toLocaleString("id-ID")}</b>
    </button>
  );
}

function MemberAvatar({
  name,
  size,
}: {
  name: string;
  size: "small" | "large";
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div
      className={`member-avatar member-avatar-${size}`}
    >
      {initials}
    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: Member["type"];
}) {
  const label = typeLabel(type);

  return (
    <span
      className={`member-type-badge member-type-${type.toLowerCase()}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <span
      className={
        isActive
          ? "member-status-badge active"
          : "member-status-badge inactive"
      }
    >
      <i />
      {isActive ? "Aktif" : "Non-Aktif"}
    </span>
  );
}

function DetailInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="member-detail-info">
      <div className="member-detail-info-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="member-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function typeLabel(
  type: Member["type"],
) {
  if (type === "MAHASISWA") return "Mahasiswa";
  if (type === "DOSEN") return "Dosen";
  return "Tenaga Kependidikan";
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function getPageNumbers(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from(
      { length: total },
      (_, index) => index + 1,
    );
  }

  const pages: Array<number | "..."> = [1];

  if (current > 4) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(
    total - 1,
    current + 1,
  );

  for (
    let number = start;
    number <= end;
    number++
  ) {
    if (!pages.includes(number)) {
      pages.push(number);
    }
  }

  if (current < total - 3) {
    pages.push("...");
  }

  if (!pages.includes(total)) {
    pages.push(total);
  }

  return pages;
}
