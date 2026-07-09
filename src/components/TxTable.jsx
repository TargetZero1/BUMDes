import { Trash2 } from 'lucide-react';

export default function TxTable({ rows, columns, onDelete, emptyText, renderExtraActions }) {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-sm italic text-stone-400">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 text-left font-semibold">
                {column.label}
              </th>
            ))}
            {(onDelete || renderExtraActions) && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).map((row) => (
            <tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-3 py-2">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              {(onDelete || renderExtraActions) && (
                <td className="px-2 py-2 text-right flex items-center justify-end gap-2">
                  {renderExtraActions?.(row)}
                  {onDelete && (
                    <button onClick={() => onDelete(row.id)} className="text-stone-300 transition-colors hover:text-rose-600" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
