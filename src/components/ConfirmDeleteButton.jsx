import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteButton({ onConfirm, title = 'Hapus data ini?', description = 'Tindakan ini tidak bisa dibatalkan.' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-stone-300 transition-colors hover:text-rose-600" title="Hapus">
        <Trash2 className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-left shadow-xl" onClick={(event) => event.stopPropagation()}>
              <h3 className="mb-2 font-bold text-stone-800">{title}</h3>
              <p className="mb-4 text-sm text-stone-500">{description}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">
                  Batal
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    setOpen(false);
                  }}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
