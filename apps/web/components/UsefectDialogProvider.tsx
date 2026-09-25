"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type DialogType = "info" | "success" | "error" | "warning";

type DialogRequest = {
  type: DialogType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
};

type DialogContextValue = {
  showAlert: (
    message: string,
    options?: Partial<DialogRequest>,
  ) => Promise<void>;
  showConfirm: (
    message: string,
    options?: Partial<DialogRequest>,
  ) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useUsefectDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(
      "useUsefectDialog harus digunakan di dalam UsefectDialogProvider.",
    );
  }

  return context;
}

export default function UsefectDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [resolver, setResolver] = useState<
    ((value: boolean) => void) | null
  >(null);

  const close = useCallback(
    (result: boolean) => {
      resolver?.(result);
      setResolver(null);
      setRequest(null);
    },
    [resolver],
  );

  const showAlert = useCallback(
    (
      message: string,
      options?: Partial<DialogRequest>,
    ) =>
      new Promise<void>((resolve) => {
        setRequest({
          type: options?.type ?? "info",
          title: options?.title ?? "Informasi",
          message,
          confirmLabel: options?.confirmLabel ?? "Tutup",
          showCancel: false,
        });

        setResolver(() => () => resolve());
      }),
    [],
  );

  const showConfirm = useCallback(
    (
      message: string,
      options?: Partial<DialogRequest>,
    ) =>
      new Promise<boolean>((resolve) => {
        setRequest({
          type: options?.type ?? "warning",
          title: options?.title ?? "Konfirmasi",
          message,
          confirmLabel: options?.confirmLabel ?? "Lanjutkan",
          cancelLabel: options?.cancelLabel ?? "Batal",
          showCancel: true,
        });

        setResolver(() => resolve);
      }),
    [],
  );

  useEffect(() => {
    if (!request) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [request, close]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {request && (
        <div
          className="usefect-dialog-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close(false);
            }
          }}
        >
          <section
            className="usefect-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usefect-dialog-title"
          >
            <header className="usefect-dialog-header">
              <div className="usefect-dialog-heading">
                <div
                  className={`usefect-dialog-icon usefect-dialog-icon-${request.type}`}
                >
                  {request.type === "success"
                    ? "✓"
                    : request.type === "error"
                      ? "×"
                      : request.type === "warning"
                        ? "!"
                        : "i"}
                </div>

                <div>
                  <div className="usefect-dialog-kicker">
                    USEFECT
                  </div>

                  <h2 id="usefect-dialog-title">
                    {request.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="usefect-dialog-close"
                onClick={() => close(false)}
                aria-label="Tutup"
              >
                ×
              </button>
            </header>

            <div className="usefect-dialog-divider" />

            <div className="usefect-dialog-body">
              {request.message}
            </div>

            <footer className="usefect-dialog-footer">
              {request.showCancel && (
                <button
                  type="button"
                  className="usefect-dialog-button usefect-dialog-button-secondary"
                  onClick={() => close(false)}
                >
                  {request.cancelLabel ?? "Batal"}
                </button>
              )}

              <button
                type="button"
                className="usefect-dialog-button usefect-dialog-button-primary"
                onClick={() => close(true)}
                autoFocus
              >
                {request.confirmLabel ?? "Tutup"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </DialogContext.Provider>
  );
}
