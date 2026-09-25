"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../app/lib/api";

type CurrentUser = {
  id: number;
  username?: string;
  fullName?: string;
  roles?: Array<string | { name?: string; code?: string }>;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const DISMISSED_KEY = "usefect-dismissed-reservation-alerts";

function getRoleNames(user: CurrentUser | null): string[] {
  if (!user?.roles) return [];

  return user.roles
    .map((role) =>
      typeof role === "string"
        ? role
        : role.name ?? role.code ?? "",
    )
    .map((role) => role.toUpperCase());
}

function getDismissedIds(): number[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: number[]) {
  try {
    sessionStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify(ids.slice(-200)),
    );
  } catch {
    // Ignore storage errors.
  }
}

export default function ReservationAlertProvider() {
  const [authorized, setAuthorized] = useState(false);
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const initializedRef = useRef(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentUser = async () => {
      try {
        const response = await apiFetch("/users/me");

        if (!response.ok) {
          if (!cancelled) setAuthorized(false);
          return;
        }

        const me = (await response.json()) as CurrentUser;
        const roles = getRoleNames(me);

        if (!cancelled) {
          setAuthorized(
            roles.includes("ADMIN") ||
              roles.includes("SUPER_ADMIN"),
          );
        }
      } catch {
        if (!cancelled) setAuthorized(false);
      }
    };

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authorized) {
      setAlerts([]);
      setOpen(false);
      return;
    }

    let cancelled = false;

    const checkNotifications = async () => {
      if (pollingRef.current) return;

      pollingRef.current = true;

      try {
        const response = await apiFetch("/notifications");

        if (!response.ok) return;

        const data =
          (await response.json()) as NotificationItem[];

        if (cancelled || !Array.isArray(data)) return;

        const dismissed = new Set(getDismissedIds());

        const reservationAlerts = data
          .filter(
            (notification) =>
              notification.type === "RESERVATION_CREATED" &&
              !notification.isRead &&
              !dismissed.has(notification.id),
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

        setAlerts((previous) => {
          const previousIds = previous.map((item) => item.id);
          const nextIds = reservationAlerts.map((item) => item.id);

          const unchanged =
            previousIds.length === nextIds.length &&
            previousIds.every((id, index) => id === nextIds[index]);

          return unchanged ? previous : reservationAlerts;
        });

        setOpen((previous) => {
          if (reservationAlerts.length === 0) return false;

          if (!initializedRef.current) {
            initializedRef.current = true;
            return true;
          }

          const previousIds = alerts.map((item) => item.id);
          const hasNewAlert = reservationAlerts.some(
            (item) => !previousIds.includes(item.id),
          );

          return previous || hasNewAlert;
        });

        initializedRef.current = true;
      } catch {
        // Keep the existing alert state on temporary API errors.
      } finally {
        pollingRef.current = false;
      }
    };

    void checkNotifications();

    const interval = window.setInterval(
      () => void checkNotifications(),
      5000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authorized]);

  const closeAlert = () => {
    const ids = alerts.map((item) => item.id);
    const dismissed = new Set(getDismissedIds());

    ids.forEach((id) => dismissed.add(id));
    saveDismissedIds([...dismissed]);

    setOpen(false);
  };

  if (!authorized || !open || alerts.length === 0) {
    return null;
  }

  return (
    <div className="usefect-reservation-alert-overlay">
      <section
        className="usefect-reservation-alert"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-alert-title"
      >
        <header className="usefect-reservation-alert-header">
          <div className="usefect-reservation-alert-heading">
            <div className="usefect-reservation-alert-icon">
              !
            </div>

            <div>
              <div className="usefect-reservation-alert-kicker">
                RESERVASI BARU
              </div>

              <h2 id="reservation-alert-title">
                Ada reservasi masuk
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="usefect-reservation-alert-close"
            onClick={closeAlert}
            aria-label="Tutup"
          >
            ×
          </button>
        </header>

        <div className="usefect-reservation-alert-divider" />

        <div className="usefect-reservation-alert-list">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className="usefect-reservation-alert-item"
            >
              <div className="usefect-reservation-alert-item-top">
                <span className="usefect-reservation-alert-badge">
                  BARU
                </span>

                <span className="usefect-reservation-alert-meta">
                  {new Date(alert.createdAt).toLocaleString("id-ID")}
                </span>
              </div>

              <h3>{alert.title}</h3>
              <p>{alert.message}</p>
            </article>
          ))}
        </div>

        <footer className="usefect-reservation-alert-footer">
          <span>
            Kelola persetujuan reservasi melalui menu Kelola
            Reservasi.
          </span>

          <button
            type="button"
            className="usefect-reservation-alert-dismiss"
            onClick={closeAlert}
          >
            Tutup
          </button>
        </footer>
      </section>
    </div>
  );
}
