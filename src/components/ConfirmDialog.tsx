'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'red' | 'black';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmColor = 'red', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-stampede-black mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
              confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-stampede-black hover:bg-gray-800'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
