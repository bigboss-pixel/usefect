"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import SiteHeader from "../../../components/SiteHeader";
import { apiFetch } from "../../lib/api";

type AuditLog = {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  description?: string | null;
  details?: string | null;
  createdAt: string;
};

const PAGE_SIZE = 10;

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const fetchLogs = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch(
        "/audit-log?limit=200",
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil audit log",
        );
      }

      setLogs(
        Array.isArray(result)
          ? result
          : result?.data ?? [],
      );
    } catch (err: any) {
      console.error("Gagal mengambil audit log:", err);

      setError(
        err?.message ?? "Gagal mengambil audit log",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, entityFilter]);

  const actionOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.action).filter(Boolean)),
    ).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.entity).filter(Boolean)),
    ).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !keyword ||
        [
          log.action,
          log.entity,
          log.description,
          log.details,
          log.userId?.toString(),
          log.entityId?.toString(),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesAction =
        actionFilter === "ALL" ||
        log.action === actionFilter;

      const matchesEntity =
        entityFilter === "ALL" ||
        log.entity === entityFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesEntity
      );
    });
  }, [
    logs,
    search,
    actionFilter,
    entityFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return filteredLogs.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [filteredLogs, currentPage]);

  const statistics = useMemo(() => {
    const today = new Date();

    const todayCount = logs.filter((log) => {
      const date = new Date(log.createdAt);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;

    return {
      total: logs.length,
      today: todayCount,
      actions: actionOptions.length,
      entities: entityOptions.length,
    };
  }, [
    logs,
    actionOptions.length,
    entityOptions.length,
  ]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const formatLabel = (value: string) => {
    return value
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  };

  return (
    <div className="usefect-page">
      <SiteHeader />

      <main className="usefect-main">
        <div className="usefect-admin-page">
          <section className="usefect-admin-hero">
            <div>
              <div className="usefect-admin-eyebrow">
                <ShieldCheck size={16} />
                KEAMANAN & AUDIT
              </div>

              <h1>Audit Log</h1>

              <p>
                Riwayat aktivitas penting yang tercatat
                di dalam sistem USEFECT.
              </p>
            </div>

            <button
              type="button"
              className="usefect-admin-refresh-button"
              onClick={() => fetchLogs(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "usefect-spin"
                    : ""
                }
              />
              {refreshing
                ? "Memuat..."
                : "Refresh"}
            </button>
          </section>

          <section className="usefect-admin-stat-grid">
            <div className="usefect-admin-stat-card">
              <div className="usefect-admin-stat-icon">
                <Activity size={19} />
              </div>
              <div>
                <span>Total Aktivitas</span>
                <strong>{statistics.total}</strong>
              </div>
            </div>

            <div className="usefect-admin-stat-card">
              <div className="usefect-admin-stat-icon">
                <CalendarDays size={19} />
              </div>
              <div>
                <span>Aktivitas Hari Ini</span>
                <strong>{statistics.today}</strong>
              </div>
            </div>

            <div className="usefect-admin-stat-card">
              <div className="usefect-admin-stat-icon">
                <Filter size={19} />
              </div>
              <div>
                <span>Jenis Action</span>
                <strong>{statistics.actions}</strong>
              </div>
            </div>

            <div className="usefect-admin-stat-card">
              <div className="usefect-admin-stat-icon">
                <ShieldCheck size={19} />
              </div>
              <div>
                <span>Jenis Entity</span>
                <strong>{statistics.entities}</strong>
              </div>
            </div>
          </section>

          <section className="usefect-admin-panel">
            <div className="usefect-admin-panel-header">
              <div>
                <h2>Aktivitas Sistem</h2>
                <p>
                  Pantau tindakan administratif dan
                  perubahan penting pada sistem.
                </p>
              </div>
            </div>

            <div className="usefect-audit-filters">
              <div className="usefect-audit-search">
                <Search size={17} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari aktivitas, entity, user..."
                />
              </div>

              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Semua Action
                </option>

                {actionOptions.map((action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {formatLabel(action)}
                  </option>
                ))}
              </select>

              <select
                value={entityFilter}
                onChange={(event) =>
                  setEntityFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Semua Entity
                </option>

                {entityOptions.map((entity) => (
                  <option
                    key={entity}
                    value={entity}
                  >
                    {formatLabel(entity)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="usefect-audit-error">
                {error}
              </div>
            )}

            <div className="usefect-audit-table-wrap">
              <table className="usefect-audit-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>ID</th>
                    <th>Deskripsi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="usefect-audit-empty"
                      >
                        Memuat audit log...
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="usefect-audit-empty"
                      >
                        Belum ada aktivitas yang
                        sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="usefect-audit-time">
                            {formatDateTime(
                              log.createdAt,
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="usefect-audit-user">
                            {log.userId
                              ? `User #${log.userId}`
                              : "System"}
                          </span>
                        </td>

                        <td>
                          <span className="usefect-audit-action">
                            {formatLabel(log.action)}
                          </span>
                        </td>

                        <td>
                          <span className="usefect-audit-entity">
                            {formatLabel(log.entity)}
                          </span>
                        </td>

                        <td>
                          {log.entityId
                            ? `#${log.entityId}`
                            : "-"}
                        </td>

                        <td>
                          <div className="usefect-audit-description">
                            {log.description || "-"}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="usefect-audit-footer">
              <span>
                Menampilkan{" "}
                {filteredLogs.length === 0
                  ? 0
                  : (currentPage - 1) *
                      PAGE_SIZE +
                    1}{" "}
                -{" "}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredLogs.length,
                )}{" "}
                dari {filteredLogs.length} aktivitas
              </span>

              <div className="usefect-audit-pagination">
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1),
                    )
                  }
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={17} />
                </button>

                <span>
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) =>
                      Math.min(
                        totalPages,
                        value + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage >= totalPages
                  }
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
