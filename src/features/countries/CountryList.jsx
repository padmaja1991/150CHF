// ===== [COUNTRY-LIST-01 | Independent Country Master Module] =====
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ArrowLeft, FilePlus2, Eye, SquarePen, Trash2, Copy } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import './Country.css';

const API = 'http://localhost:5000/api';
const EMPTY = {
  country_name: '', iso2: '', iso3: '', numeric_code: '', region_id: '',
  currency_id: '', phone_code: '', flag_emoji: '', sort_order: '', status: 'Active',
};

// ===== [COUNTRY-API-01 | API adapter: confirm endpoints and database field names] =====
const ENDPOINTS = {
  countries: '/countries',
  regions: '/lookups/regions',
  currencies: '/lookups/currencies',
};
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}
function asArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.rows)) return result.rows;
  throw new Error('Unexpected API response: expected an array of records.');
}
function normalizeLookup(result, kind) {
  return asArray(result).map((x) => ({
    id: x.id,
    code: x.code ?? x[`${kind}_code`] ?? '',
    name: x.name ?? x[`${kind}_name`] ?? '',
    status: x.status ?? 'Active',
  }));
}
const fieldValue = (value) => value == null ? '' : String(value);
function toForm(record) {
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, fieldValue(record?.[key] ?? EMPTY[key])]));
}
function validate(form) {
  if (!form.country_name.trim()) return 'Country Name is required.';
  if (!form.numeric_code.trim()) return 'Numeric Code is required.';
  if (!/^\d+$/.test(form.numeric_code.trim())) return 'Numeric Code must contain digits only.';
  if (!form.currency_id) return 'Please select a Currency.';
  if (!form.phone_code.trim()) return 'Phone Code is required.';
  if (!form.sort_order.trim() || !/^\d+$/.test(form.sort_order.trim())) return 'Sort Order must be a non-negative whole number.';
  if (!['Active', 'Inactive'].includes(form.status)) return 'Please select a valid Status.';
  if (form.iso2 && !/^[A-Za-z]{2}$/.test(form.iso2)) return 'ISO2 must contain exactly 2 letters.';
  if (form.iso3 && !/^[A-Za-z]{3}$/.test(form.iso3)) return 'ISO3 must contain exactly 3 letters.';
  return '';
}

export default function CountryList() {
  // ===== [COUNTRY-STATE-01 | Listing, form and selection state] =====
  const [records, setRecords] = useState([]);
  const [regions, setRegions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState({ ...EMPTY });
  const [filters, setFilters] = useState({ name: '', iso2: '', status: '' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [sort, setSort] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lookup, setLookup] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupName, setLookupName] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [lookupPage, setLookupPage] = useState(1);
  const [lookupPerPage, setLookupPerPage] = useState(5);

  const load = useCallback(async () => {
    const items = asArray(await request(ENDPOINTS.countries));
    setRecords(items);
    return items;
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const chosen = records.find((x) => String(x.id) === String(selected));
  const filtered = useMemo(() => records.filter((x) =>
    fieldValue(x.country_name).toLowerCase().includes(filters.name.toLowerCase()) &&
    fieldValue(x.iso2).toLowerCase().includes(filters.iso2.toLowerCase()) &&
    (!filters.status || x.status === filters.status)
  ).sort((a, b) => {
    const result = fieldValue(a.country_name).localeCompare(fieldValue(b.country_name));
    return sort === 'asc' ? result : -result;
  }), [records, filters, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const clearFeedback = () => { setError(''); setNotice(''); };
  const begin = (nextMode) => {
    if (nextMode !== 'add' && !chosen) return;
    clearFeedback();
    setForm(nextMode === 'add' ? { ...EMPTY } : nextMode === 'copy'
      ? { ...toForm(chosen), country_name: '' } : toForm(chosen));
    setMode(nextMode);
  };
  const goList = () => { setMode('list'); setLookup(''); setError(''); };

  // ===== [COUNTRY-LOOKUP-01 | Region and Currency popup data] =====
  const openLookup = async (kind) => {
    if (mode === 'view') return;
    setError('');
    setLookup(kind);
    setLookupCode(''); setLookupName(''); setLookupStatus(''); setLookupPage(1);
    try {
      const data = normalizeLookup(await request(ENDPOINTS[kind]), kind === 'regions' ? 'region' : 'currency');
      if (kind === 'regions') setRegions(data);
      else setCurrencies(data);
    } catch (e) {
      setError(`${kind === 'regions' ? 'Region' : 'Currency'} lookup: ${e.message}`);
      setLookup('');
    }
  };
  const lookupItems = lookup === 'regions' ? regions : currencies;
  const lookupFiltered = lookupItems.filter((x) =>
    fieldValue(x.code).toLowerCase().includes(lookupCode.toLowerCase()) &&
    fieldValue(x.name).toLowerCase().includes(lookupName.toLowerCase()) &&
    (!lookupStatus || x.status === lookupStatus));
  const lookupPages = Math.max(1, Math.ceil(lookupFiltered.length / lookupPerPage));
  const lookupCurrent = Math.min(lookupPage, lookupPages);
  const lookupVisible = lookupFiltered.slice((lookupCurrent - 1) * lookupPerPage, lookupCurrent * lookupPerPage);
  const lookupLabel = (kind, id) => {
    const item = (kind === 'regions' ? regions : currencies).find((x) => String(x.id) === String(id));
    return item ? `${item.code ? `${item.code} - ` : ''}${item.name}` : (id ? `Selected ID: ${id}` : '');
  };

  // ===== [COUNTRY-CRUD-01 | Backend CRUD actions] =====
  const save = async (event) => {
    event.preventDefault();
    const issue = validate(form);
    if (issue) { setError(issue); return; }
    const editing = mode === 'edit';
    setLoading(true); clearFeedback();
    try {
      const payload = {
        ...form,
        iso2: form.iso2.trim().toUpperCase(), iso3: form.iso3.trim().toUpperCase(),
        region_id: form.region_id || null,
        currency_id: form.currency_id || null,
        sort_order: Number(form.sort_order),
      };
      await request(editing ? `${ENDPOINTS.countries}/${selected}` : ENDPOINTS.countries, {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      await load();
      setSelected(null);
      setMode('list');
      setNotice(editing ? 'Country updated.' : 'Country created.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const remove = async () => {
    if (!chosen) return;
    setLoading(true); setError('');
    try {
      await request(`${ENDPOINTS.countries}/${selected}`, { method: 'DELETE' });
      await load(); setSelected(null); setDeleteOpen(false);
      setNotice('Country deleted.');
    } catch (e) { setError(e.message); setDeleteOpen(false); }
    finally { setLoading(false); }
  };
  const inactivate = async () => {
    if (!chosen) return;
    setLoading(true); setError('');
    try {
      await request(`${ENDPOINTS.countries}/${selected}`, {
        method: 'PUT', body: JSON.stringify({ ...toForm(chosen), status: 'Inactive' }),
      });
      await load(); setDeleteOpen(false); setNotice('Country marked Inactive.');
    } catch (e) { setError(e.message); setDeleteOpen(false); }
    finally { setLoading(false); }
  };

  const statusIcon = (status) => (
    <span className="country-status">
      <FontAwesomeIcon icon={fieldValue(status).toLowerCase() === 'active' ? faCircleCheck : faCircleXmark}
        style={{ color: fieldValue(status).toLowerCase() === 'active' ? '#16a34a' : '#dc2626' }} />
      {status || '—'}
    </span>
  );
  const inputField = (key, label, required = false, props = {}) => (
    <label className="country-field" key={key}>
      <span>{label}{required && <b className="country-required"> *</b>}</span>
      <input required={required} disabled={mode === 'view'} value={form[key]}
        onChange={(e) => change(key, e.target.value)} {...props} />
    </label>
  );
  const lookupField = (key, label, kind, required = false) => (
    <label className="country-field" key={key}>
      <span>{label}{required && <b className="country-required"> *</b>}</span>
      <span className="country-lookup-line">
        <input readOnly value={lookupLabel(kind, form[key])} placeholder={`Type 3+ characters to search ${label}...`} />
        <button type="button" aria-label={`Search ${label}`} disabled={mode === 'view'} onClick={() => openLookup(kind)}><Search size={15} /></button>
      </span>
    </label>
  );

  return (
    <div className="country-module">
      {/* ===== [COUNTRY-TOOLBAR-01 | Actions visible only after row selection] ===== */}
      {mode === 'list' && <div className="country-toolbar">
        <button title="Search / Refresh Countries" onClick={() => load().catch((e) => setError(e.message))}><Search size={15} /></button>
        <button title="Add Country" onClick={() => begin('add')}><FilePlus2 size={15} /></button>
        <button title="Clear selection and filters" onClick={() => { setSelected(null); setFilters({ name: '', iso2: '', status: '' }); setPage(1); }}><ArrowLeft size={15} /></button>
        {chosen && <>
          <button title="View Country" onClick={() => begin('view')}><Eye size={15} /></button>
          <button title="Edit Country" onClick={() => begin('edit')}><SquarePen size={15} /></button>
          <button title="Delete / Inactivate Country" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /></button>
          <button title="Copy Country" onClick={() => begin('copy')}><Copy size={15} /></button>
        </>}
      </div>}

      {error && <div className="country-message country-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
      {notice && <div className="country-message">{notice}<button onClick={() => setNotice('')}>×</button></div>}

      {mode === 'list' ? <>
        {/* ===== [COUNTRY-LIST-02 | Summary] ===== */}
        <section className="org-panel summary-panel">
          <div className="org-section-heading"><h2>▣ Summary</h2></div>
          <div className="details-grid">
            <div className="detail-item"><span>Code</span><strong>{chosen?.iso2 || '—'}</strong></div>
            <div className="detail-item"><span>Name</span><strong>{chosen?.country_name || '—'}</strong></div>
            <div className="detail-item"><span>Status</span><strong>{chosen?.status || '—'}</strong></div>
          </div>
        </section>
        {/* ===== [COUNTRY-LIST-03 | Search Parameters] ===== */}
        <section className="org-panel">
          <div className="org-section-heading"><h2>⌕ Search Parameters</h2></div>
          <div className="org-list-tools">
            <label className="org-search-field">Country Name<input value={filters.name} onChange={(e) => { setFilters((f) => ({ ...f, name: e.target.value })); setPage(1); }} /></label>
            <label className="org-search-field">ISO2<input value={filters.iso2} onChange={(e) => { setFilters((f) => ({ ...f, iso2: e.target.value })); setPage(1); }} /></label>
            <label className="org-status-field">Status<select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}><option value="">Select</option><option>Active</option><option>Inactive</option></select></label>
          </div>
        </section>
        {/* ===== [COUNTRY-LIST-04 | Table and Pagination] ===== */}
        <section className="org-panel table-panel">
          <div className="org-table-wrapper"><table className="org-table">
            <thead><tr>
              <th>Country Name <button className="country-sort" onClick={() => setSort((s) => s === 'asc' ? 'desc' : 'asc')}>{sort === 'asc' ? '↑' : '↓'}</button></th>
              <th>ISO2</th><th>ISO3</th><th>Numeric Code</th><th>Phone Code</th><th>Status</th>
            </tr></thead>
            <tbody>{visible.length ? visible.map((x) => <tr key={x.id} className={String(selected) === String(x.id) ? 'selected' : ''}
              onClick={() => setSelected(x.id)} onDoubleClick={() => { setSelected(x.id); setForm(toForm(x)); setMode('view'); }}>
              <td>{x.country_name}</td><td>{x.iso2 || '—'}</td><td>{x.iso3 || '—'}</td>
              <td>{x.numeric_code}</td><td>{x.phone_code}</td><td>{statusIcon(x.status)}</td>
            </tr>) : <tr><td colSpan="6" className="empty-table">No countries found.</td></tr>}</tbody>
          </table></div>
          <div className="org-pagination"><div>
            <button disabled={currentPage <= 1} onClick={() => setPage(1)}>|&lt;</button>
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>&lt;</button>
            <span>{currentPage} / {pages}</span>
            <button disabled={currentPage >= pages} onClick={() => setPage((p) => p + 1)}>&gt;</button>
            <button disabled={currentPage >= pages} onClick={() => setPage(pages)}>&gt;|</button>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select>
          </div></div>
        </section>
      </> : <>
        {/* ===== [COUNTRY-FORM-01 | Three-panel Organization-style Country form] ===== */}
        <div className="country-org-form-screen">
          <div className="country-org-form-toolbar">
            {mode !== 'view' && (
              <button type="submit" form="country-master-form" title="Save Country" disabled={loading}>
                {loading ? '…' : '✓'}
              </button>
            )}
            <button type="button" title="Cancel / Back" onClick={goList}>✕</button>
          </div>
          <div className="country-org-tab-row">
            <span className="country-org-tab">Main Details</span>
            <span className="country-org-mode-label">
              {mode === 'view' ? 'View Country' : mode === 'edit' ? 'Edit Country' : mode === 'copy' ? 'Copy Country' : 'Add Country'}
            </span>
          </div>
          <form id="country-master-form" className="country-org-form" onSubmit={save}>
            <div className="country-org-panel-grid">
              {/* ===== [COUNTRY-PANEL-01 | General Information] ===== */}
              <section className="country-org-panel">
                <h3>▣ General Information</h3>
                <div className="country-org-panel-fields">
                  {inputField('country_name', 'Country Name', true, { maxLength: 191 })}
                  {inputField('iso2', 'ISO2', false, { maxLength: 2 })}
                  {inputField('iso3', 'ISO3', false, { maxLength: 3 })}
                  {inputField('numeric_code', 'Numeric Code', true, { inputMode: 'numeric', maxLength: 10 })}
                </div>
              </section>
              {/* ===== [COUNTRY-PANEL-02 | Regional Details] ===== */}
              <section className="country-org-panel">
                <h3>▣ Regional Details</h3>
                <div className="country-org-panel-fields">
                  {lookupField('region_id', 'Region', 'regions')}
                  {lookupField('currency_id', 'Currency', 'currencies', true)}
                  {inputField('phone_code', 'Phone Code', true, { maxLength: 20 })}
                </div>
              </section>
              {/* ===== [COUNTRY-PANEL-03 | Additional Details] ===== */}
              <section className="country-org-panel">
                <h3>▣ Additional Details</h3>
                <div className="country-org-panel-fields">
                  {inputField('flag_emoji', 'Flag Emoji', false, { maxLength: 12 })}
                  {inputField('sort_order', 'Sort Order', true, { type: 'number', min: 0, step: 1 })}
                  <label className="country-field">
                    <span>Status<b className="country-required"> *</b></span>
                    <select required disabled={mode === 'view'} value={form.status} onChange={(e) => change('status', e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>
          </form>
        </div>
      </>}

      {/* ===== [COUNTRY-LOOKUP-02 | Searchable Region / Currency Popup] ===== */}
      {lookup && <div className="country-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setLookup(''); }}>
        <div className="country-lookup-modal" role="dialog" aria-modal="true" aria-label={`${lookup === 'regions' ? 'Region' : 'Currency'} lookup`}>
          <div className="country-lookup-heading"><h3>{lookup === 'regions' ? 'Region' : 'Currency'}</h3><button onClick={() => setLookup('')}>×</button></div>
          <section className="country-lookup-search"><strong>⌕ Search Parameters</strong><div className="country-lookup-filters">
            <label>Code<input value={lookupCode} onChange={(e) => { setLookupCode(e.target.value); setLookupPage(1); }} /></label>
            <label>Name<input value={lookupName} onChange={(e) => { setLookupName(e.target.value); setLookupPage(1); }} /></label>
            <label>Status<select value={lookupStatus} onChange={(e) => { setLookupStatus(e.target.value); setLookupPage(1); }}><option value="">Select</option><option>Active</option><option>Inactive</option></select></label>
          </div></section>
          <div className="country-lookup-table-wrap"><table className="country-lookup-table"><thead><tr><th>Code</th><th>Name</th><th>Status</th></tr></thead><tbody>
            {lookupVisible.map((x) => <tr key={x.id} tabIndex={0} onClick={() => { change(lookup === 'regions' ? 'region_id' : 'currency_id', String(x.id)); setLookup(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { change(lookup === 'regions' ? 'region_id' : 'currency_id', String(x.id)); setLookup(''); } }}><td>{x.code || '—'}</td><td>{x.name}</td><td>{statusIcon(x.status)}</td></tr>)}
            {!lookupVisible.length && <tr><td colSpan="3">No matching records found.</td></tr>}
          </tbody></table></div>
          <div className="country-lookup-footer"><span>Click a row to select</span><div>
            <button disabled={lookupCurrent <= 1} onClick={() => setLookupPage(1)}>|&lt;</button>
            <button disabled={lookupCurrent <= 1} onClick={() => setLookupPage((p) => p - 1)}>&lt;</button>
            <span>{lookupCurrent} / {lookupPages}</span>
            <button disabled={lookupCurrent >= lookupPages} onClick={() => setLookupPage((p) => p + 1)}>&gt;</button>
            <button disabled={lookupCurrent >= lookupPages} onClick={() => setLookupPage(lookupPages)}>&gt;|</button>
            <select value={lookupPerPage} onChange={(e) => { setLookupPerPage(Number(e.target.value)); setLookupPage(1); }}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select>
          </div></div>
        </div>
      </div>}

      {/* ===== [COUNTRY-DELETE-01 | No / In-Active / Delete Popup] ===== */}
      {deleteOpen && chosen && <div className="country-overlay">
        <div className="country-delete-modal" role="dialog" aria-modal="true" aria-label="Delete Country">
          <div className="country-warning">⚠</div><h3>Delete</h3>
          <p>Do You Really Want to In-active/Delete The Record</p>
          <div className="country-delete-actions">
            <button onClick={() => setDeleteOpen(false)} disabled={loading}>× No</button>
            <button className="country-danger" onClick={inactivate} disabled={loading}>▣ In-Active</button>
            <button className="country-danger" onClick={remove} disabled={loading}>▣ Delete</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
