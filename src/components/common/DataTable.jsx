import React from 'react'

// ===== [COMMON-DATATABLE-01 | Shared table rendering] =====
// Presentation only: sorting, filtering, paging and API logic stay in the parent.
export default function DataTable({
  columns,
  rows,
  selectedId,
  onRowClick,
  emptyMessage = 'No records found.',
}) {
  return (
    <table className="org-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => (
          <tr
            key={item.id}
            className={String(selectedId) === String(item.id) ? 'selected' : ''}
            onClick={() => onRowClick(item)}
          >
            {columns.map((column) => (
              <td key={column.key}>{column.render(item)}</td>
            ))}
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={columns.length} className="empty-table">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
