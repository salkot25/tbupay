import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, Trash2 } from "lucide-react";
import useStore from "../store/useStore";
import "./DialogModal.css";

const ICON_MAP = {
  info: <Info size={26} />,
  success: <CheckCircle2 size={26} />,
  warning: <AlertTriangle size={26} />,
  danger: <Trash2 size={26} />,
};

export default function DialogModal() {
  const dialog = useStore((s) => s.dialog);
  const closeDialog = useStore((s) => s.closeDialog);

  const isOpen = !!dialog;
  const variant = dialog?.variant ?? "info";
  const title = dialog?.title ?? "";
  const message = dialog?.message ?? "";
  const type = dialog?.type ?? "alert"; // 'alert' | 'confirm'
  const confirmLabel = dialog?.confirmLabel ?? "OK";
  const cancelLabel = dialog?.cancelLabel ?? "Batal";

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const handleConfirm = () => {
    const cb = dialog?.onConfirm;
    closeDialog();
    cb?.();
  };

  const handleCancel = () => {
    const cb = dialog?.onCancel;
    closeDialog();
    cb?.();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && type === "alert") {
      handleConfirm();
    }
  };

  return (
    <div
      className={`dialog-overlay${isOpen ? " open" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className="dialog-box" role="dialog" aria-modal="true">
        <div className="dialog-icon-wrap">
          <div className={`dialog-icon ${variant}`}>{ICON_MAP[variant]}</div>
        </div>

        <div className="dialog-body">
          {title && <p className="dialog-title">{title}</p>}
          <p className="dialog-message">{message}</p>
        </div>

        <div className="dialog-actions">
          {type === "confirm" && (
            <button className="btn-cancel" onClick={handleCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            className={`btn-confirm ${variant}${type === "alert" ? " full" : ""}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
