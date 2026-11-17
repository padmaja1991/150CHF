import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

/** Shared, controlled-by-open lookup. Search and pagination are local to the popup.
 *  Each master passes the source rows, display labels and onSelect callback.
 *  Do not change the existing currency/location CSS class names here.
 */
export function MasterLookupModal({ title, rows = [], onClose, onSelect, loading = false, error = '', onRetry, nameHeading, pageSizes = [5, 7] }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Select');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizes[0]);
  const filtered = useMemo(() => rows.filter((item) =>
    String(item.code ?? '').toLowerCase().includes(code.toLowerCase()) &&
    String(item.name ?? '').toLowerCase().includes(name.toLowerCase()) &&
    (status === 'Select' || item.status === status)
  ), [rows, code, name, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="modal-backdrop">
      <section className={`currency-modal ${title !== 'Currency' ? 'location-modal' : ''}`} role="dialog" aria-modal="true" aria-label={`${title} lookup`}>
        <header>{title}<button type="button" aria-label={`Close ${title} lookup`} onClick={onClose}><X size={14} /></button></header>
        <div className={`currency-search ${title !== 'Currency' ? 'location-search' : ''}`}>
          <div className="currency-search-fields">
            <label>Code<input value={code} onChange={(event) => { setCode(event.target.value); setPage(1); }} /></label>
            <label>Name<input value={name} onChange={(event) => { setName(event.target.value); setPage(1); }} /></label>
            <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option>Select</option><option>Active</option><option>Inactive</option></select></label>
          </div>
        </div>
        <table><thead><tr><th>Code</th><th>{nameHeading || `${title} Name`}</th><th>Status</th></tr></thead>
          <tbody>
            {loading && <tr><td className="empty" colSpan="3">Loading {title.toLowerCase()}...</td></tr>}
            {!loading && error && <tr><td className="empty error" colSpan="3">{error} {onRetry && <button type="button" onClick={onRetry}>Retry</button>}</td></tr>}
            {!loading && !error && visible.map((item, index) => <tr key={item.id ?? `${item.code}-${index}`} onClick={() => onSelect(item)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') onSelect(item); }}><td>{item.code || '—'}</td><td>{item.name}</td><td>{item.status}</td></tr>)}
            {!loading && !error && !visible.length && <tr><td className="empty" colSpan="3">No matching {title.toLowerCase()} records found</td></tr>}
          </tbody>
        </table>
        <footer><em>♧ Click a row to select</em><div className="currency-pager">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)}>|‹</button>
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          <b>{currentPage}</b><span>/ {totalPages}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
          <span>Lines per Page</span><select aria-label={`${title} lines per page`} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select>
        </div></footer>
      </section>
    </div>
  );
}
