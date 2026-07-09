import ConfirmDeleteButton from './ConfirmDeleteButton';

export default function TxTable({ rows, columns, onDelete, emptyText, renderExtraActions }) {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-sm italic text-stone-400">{emptyText}</div>;
  }

  const sorted = rows.slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const hasActions = Boolean(onDelete || renderExtraActions);
  const [primaryColumn, ...restColumns] = columns;

  return (
    <>
      {/* Desktop / tablet: standard table */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left font-semibold">
                  {column.label}
                </th>
              ))}
              {hasActions && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-3 py-2">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-2 py-2 text-right flex items-center justify-end gap-2">
                    {renderExtraActions?.(row)}
                    {onDelete && <ConfirmDeleteButton onConfirm={() => onDelete(row.id)} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked cards instead of a squeezed/scrolling table */}
      <div className="space-y-2 sm:hidden">
        {sorted.map((row) => (
          <div key={row.id} className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0 break-words text-sm font-semibold text-stone-800">{primaryColumn.render ? primaryColumn.render(row) : row[primaryColumn.key]}</div>
              {hasActions && (
                <div className="flex shrink-0 items-center gap-2">
                  {renderExtraActions?.(row)}
                  {onDelete && <ConfirmDeleteButton onConfirm={() => onDelete(row.id)} />}
                </div>
              )}
            </div>
            <div className="space-y-1">
              {restColumns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="shrink-0 text-stone-400">{column.label}</span>
                  <span className="min-w-0 break-words text-right font-medium text-stone-700">{column.render ? column.render(row) : row[column.key]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
