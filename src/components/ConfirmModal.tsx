import { useTranslation } from "../hooks/useTranslation";

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
  cancelLabel,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-6 grid gap-3">
          <button onClick={onConfirm} className={confirmClassName}>
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            {cancelLabel ?? t("actions.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
