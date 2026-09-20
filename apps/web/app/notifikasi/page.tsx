"use client";

import SiteHeader from "../../components/SiteHeader";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  Info,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationIcon(type: string) {
  if (type.startsWith("RESERVATION")) {
    return <BookOpen size={20} />;
  }

  if (type.startsWith("LOAN")) {
    return <Clock3 size={20} />;
  }

  return <Info size={20} />;
}

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch("/notifications");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal mengambil notifikasi",
        );
      }

      const data: Notification[] = Array.isArray(result)
        ? result
        : result?.data ?? [];

      setNotifications(
        [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
      );
    } catch (error: any) {
      console.error("Gagal mengambil notifikasi:", error);
      setError(
        error?.message ?? "Gagal mengambil notifikasi",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.isRead,
      ).length,
    [notifications],
  );

  const handleMarkAsRead = async (
    notification: Notification,
  ) => {
    if (notification.isRead) {
      return;
    }

    try {
      setMarkingId(notification.id);

      const response = await apiFetch(
        `/notifications/${notification.id}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "Gagal menandai notifikasi",
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true }
            : item,
        ),
      );
    } catch (error: any) {
      console.error(
        "Gagal menandai notifikasi:",
        error,
      );

      alert(
        error?.message ??
          "Gagal menandai notifikasi sebagai dibaca",
      );
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      const response = await apiFetch(
        "/notifications/read-all",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Gagal menandai semua notifikasi",
        );
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        })),
      );
    } catch (error: any) {
      console.error(
        "Gagal menandai semua notifikasi:",
        error,
      );

      alert(
        error?.message ??
          "Gagal menandai semua notifikasi",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <main className="library-page notification-page">
            <SiteHeader />

      <div className="content-container">
        <section className="notification-header">
          <div className="notification-eyebrow">
            <Bell size={15} />
            PUSAT NOTIFIKASI
          </div>

          <div className="notification-heading">
            <div>
              <h1 className="notification-title">
                Notifikasi
              </h1>

              <p className="notification-subtitle">
                Pantau informasi terbaru dari
                perpustakaan.
              </p>
            </div>

            <div className="notification-actions">
              <button
                className="notification-action-button"
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "notification-spin"
                      : ""
                  }
                />
                {refreshing ? "Memuat..." : "Refresh"}
              </button>

              <button
                className="notification-action-button primary"
                onClick={handleMarkAllAsRead}
                disabled={
                  markingAll || unreadCount === 0
                }
              >
                <CheckCheck size={16} />
                {markingAll
                  ? "Memproses..."
                  : "Tandai Semua Dibaca"}
              </button>
            </div>
          </div>
        </section>

        <section className="notification-summary">
          <div className="student-card notification-summary-card">
            <Bell
              className="notification-summary-icon"
              size={22}
            />

            <div>
              <span>NOTIFIKASI BELUM DIBACA</span>
              <strong>{unreadCount}</strong>
            </div>
          </div>

          <div className="student-card notification-summary-card">
            <CheckCircle2
              className="notification-summary-icon"
              size={22}
            />

            <div>
              <span>TOTAL NOTIFIKASI</span>
              <strong>{notifications.length}</strong>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="notification-empty">
            <Clock3 size={42} />
            <h2>Memuat notifikasi...</h2>
          </div>
        ) : error ? (
          <div className="notification-error">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={44} />
            <h2>Belum ada notifikasi</h2>
            <p>
              Informasi penting dari perpustakaan akan
              muncul di sini.
            </p>
          </div>
        ) : (
          <section className="notification-list">
            {notifications.map((notification) => {
              const marking =
                markingId === notification.id;

              return (
                <article
                  key={notification.id}
                  className={`notification-card ${
                    notification.isRead
                      ? "is-read"
                      : "is-unread"
                  }`}
                  onClick={() =>
                    handleMarkAsRead(notification)
                  }
                >
                  <div className="notification-card-icon">
                    {getNotificationIcon(
                      notification.type,
                    )}
                  </div>

                  <div className="notification-card-content">
                    <div className="notification-card-top">
                      <div>
                        <span className="notification-type">
                          {notification.type.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>

                        <h2>
                          {notification.title}
                        </h2>
                      </div>

                      {!notification.isRead && (
                        <span className="notification-new">
                          BARU
                        </span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <div className="notification-card-footer">
                      <span>
                        {formatDate(
                          notification.createdAt,
                        )}
                      </span>

                      {!notification.isRead && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkAsRead(
                              notification,
                            );
                          }}
                          disabled={marking}
                        >
                          <CheckCircle2 size={14} />
                          {marking
                            ? "Memproses..."
                            : "Tandai Dibaca"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <style jsx global>{`
        .notification-page .notification-header {
          margin-bottom: 24px;
        }

        .notification-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #2563eb;
          margin-bottom: 10px;
        }

        .notification-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
        }

        .notification-title {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .notification-subtitle {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .notification-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .notification-action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid #dbe4f0;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.88);
          color: #334155;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .notification-action-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
          border-color: #bfdbfe;
        }

        .notification-action-button.primary {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .notification-action-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .notification-spin {
          animation: notification-spin 0.9s linear infinite;
        }

        @keyframes notification-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .notification-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .notification-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
        }

        .notification-summary-icon {
          color: #2563eb;
          flex: 0 0 auto;
        }

        .notification-summary-card div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .notification-summary-card span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #64748b;
        }

        .notification-summary-card strong {
          font-size: 26px;
          line-height: 1;
          color: #0f172a;
        }

        .notification-list {
          display: grid;
          gap: 14px;
        }

        .notification-card {
          display: flex;
          gap: 16px;
          padding: 19px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 8px 26px rgba(15, 23, 42, 0.045);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .notification-card.is-unread {
          border-color: #bfdbfe;
          background: linear-gradient(
            135deg,
            rgba(239, 246, 255, 0.95),
            rgba(255, 255, 255, 0.95)
          );
        }

        .notification-card.is-read {
          opacity: 0.82;
        }

        .notification-card-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
        }

        .notification-card-content {
          min-width: 0;
          flex: 1;
        }

        .notification-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .notification-type {
          display: block;
          margin-bottom: 4px;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.1em;
          color: #64748b;
        }

        .notification-card h2 {
          margin: 0;
          font-size: 17px;
          line-height: 1.3;
          color: #0f172a;
        }

        .notification-card p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .notification-new {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .notification-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid #eef2f7;
        }

        .notification-card-footer > span {
          color: #94a3b8;
          font-size: 11px;
        }

        .notification-card-footer button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .notification-card-footer button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .notification-empty {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          border: 1px dashed #dbe4f0;
          border-radius: 24px;
          background: rgba(248, 250, 252, 0.7);
          color: #94a3b8;
        }

        .notification-empty h2 {
          margin: 14px 0 5px;
          color: #334155;
          font-size: 20px;
        }

        .notification-empty p {
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .notification-error {
          padding: 18px;
          border: 1px solid #fecaca;
          border-radius: 16px;
          background: #fff7f7;
          color: #b91c1c;
          font-size: 14px;
        }

        .notification-page .header-actions .notification.active {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          display: grid;
          place-items: center;
          border: 2px solid white;
          border-radius: 999px;
          background: #ef4444;
          color: white;
          font-size: 8px;
          font-weight: 900;
          line-height: 1;
        }

        @media (max-width: 900px) {
          .notification-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .notification-summary {
            grid-template-columns: 1fr;
          }

          .notification-card {
            padding: 15px;
            border-radius: 17px;
          }

          .notification-card-icon {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .notification-card-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .notification-actions {
            width: 100%;
          }

          .notification-action-button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
