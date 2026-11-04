import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'
import {
  Search,
  ArrowLeft,
  FilePlus2,
  File,
  Eye,
  SquarePen,
  Trash2,
  Copy
} from 'lucide-react'
const API = 'http://localhost:5000/api'
const blank = {
  id: null, code: '', name: '', license: false,
  currencyId: '', currency: '', type: '', industry: '',
  registrationNumber: '', incorporationDate: '', taxId: '',
  address: '', country: '', state: '', city: '', pincode: '',
  phone: '', email: '', website: '', imageName: '', status: 'Active',
}
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    throw new Error(data?.message || `HTTP error ${response.status}`)
  }
  return data
}
function rows(result) {
  return Array.isArray(result) ? result : result?.data || []
}
function normalize(item) {
  return {
    id: item.id ?? null,
    code: item.code ?? item.organization_code ?? '',
    name: item.name ?? item.organization_name ?? '',
    license:
      item.license === true ||
      item.license_organization === 1 ||
      item.license_organization === '1',
    currencyId: item.reporting_currency_id ?? '',
    currency: item.currency ?? item.currency_code ?? '',
    type: item.type ?? item.organization_type ?? '',
    industry: item.industry ?? item.industry_name ?? '',
    registrationNumber: item.registrationNumber ?? item.registration_number ?? '',
    incorporationDate: String(
      item.incorporationDate ?? item.date_of_incorporation ?? ''
    ).slice(0, 10),
    taxId: item.taxId ?? item.tax_id ?? '',
    address: item.address ?? item.registered_address ?? '',
    country: item.country ?? item.country_name ?? '',
    state: item.state ?? item.state_name ?? '',
    city: item.city ?? item.city_name ?? '',
    pincode: item.pincode ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    website: item.website ?? '',
 imageName: item.imageName ?? '',
    status: item.status ?? 'Active',
  }
}
export default function App() {
  // screen2 = Initial screen
  // form = Screen 1 / Screen 4 form
  // screen3 = CRUD screen
  const [screen, setScreen] = useState('screen2')
  const [organizations, setOrganizations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blank)
  const [search, setSearch] = useState({
    code: '',
    name: '',
    status: '',
  })
  const [appliedSearch, setAppliedSearch] = useState({
    code: '',
    name: '',
    status: '',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // ===== SECTION 01: ORGANIZATION LIST SORTING / AUTOCOMPLETE =====
  const [codeSort, setCodeSort] = useState('none')
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [currencies, setCurrencies] = useState([])
  const [showCurrency, setShowCurrency] = useState(false)
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(null)
  const [currencySearch, setCurrencySearch] = useState({
    code: '',
    name: '',
    status: '',
  })
  const [appliedCurrencySearch, setAppliedCurrencySearch] = useState({
    code: '',
    name: '',
    status: '',
  })
  const [currencyPage, setCurrencyPage] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
const [showCountry,setShowCountry] = useState(false)
const [selectedCountry,setSelectedCountry] = useState('IND')
const [countryFilter,setCountryFilter] = useState({code:'',name:'',status:'All'})
const [activeLookup,setActiveLookup] = useState('')
const [lookupDraft,setLookupDraft] = useState('')
const saveNewRef = useRef(false)
 const [imagePreview, setImagePreview] = useState('')
  useEffect(() => {
    loadOrganizations()
  }, [])
  async function loadOrganizations() {
    setLoading(true)
    try {
      const result = await request(`${API}/organizations`)
      setOrganizations(rows(result).map(normalize))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((item) => {
      return (
        item.code.toLowerCase().includes(appliedSearch.code.toLowerCase()) &&
        item.name.toLowerCase().includes(appliedSearch.name.toLowerCase()) &&
        (!appliedSearch.status || item.status === appliedSearch.status)
      )
    })
  }, [organizations, appliedSearch])
  // ===== SECTION 02: SORTING AND PAGINATION =====
  const sortedOrganizations = useMemo(() => {
    if (codeSort === 'none') return filteredOrganizations
    return [...filteredOrganizations].sort((a, b) => {
      const comparison = a.code.localeCompare(b.code, undefined, {
        numeric: true, sensitivity: 'base'
      })
      return codeSort === 'asc' ? comparison : -comparison
    })
  }, [filteredOrganizations, codeSort])

  // ===== ORGANIZATION CODE AUTOCOMPLETE =====
const codeSuggestions = useMemo(() => {
  const query = search.code.trim().toLowerCase();

  if (!query) return [];

  return organizations
    .filter((item) =>
      String(item.code || "")
        .toLowerCase()
        .startsWith(query)
    )
    .sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true })
    )
    .slice(0, 8);

}, [organizations, search.code]);

  const pages = Math.max(1, Math.ceil(sortedOrganizations.length / perPage))
  const visibleOrganizations = sortedOrganizations.slice(
    (page - 1) * perPage,
    page * perPage
  )
  const selectedOrganization = organizations.find(
    (item) => String(item.id) === String(selectedId)
  )
  const filteredCurrencies = useMemo(() => {
    return currencies.filter((item) => {
      return (
        item.currency_code
          .toLowerCase()
          .includes(appliedCurrencySearch.code.toLowerCase()) &&
        item.currency_name
          .toLowerCase()
          .includes(appliedCurrencySearch.name.toLowerCase()) &&
        (!appliedCurrencySearch.status ||
          item.status === appliedCurrencySearch.status)
      )
    })
  }, [currencies, appliedCurrencySearch])
  const currencyPages = Math.max(1, Math.ceil(filteredCurrencies.length / 5))
  const visibleCurrencies = filteredCurrencies
  function changeForm(event) {
    const { name, value, checked, type } = event.target
    setForm((old) => ({
      ...old,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setErrors((old) => ({ ...old, [name]: '' }))
    setMessage('')
  }
  // ===== SECTION 03: ROW SELECTION / TOOLBAR STATE =====
  function selectOrganization(item) {
    setSelectedId(item.id)
    setScreen('screen3')
    setMessage('')
  }

  function backToList() {
    setSelectedId(null)
    setShowDelete(false)
    setScreen('screen2')
  }

  // ===== SECTION 04: DOWNLOAD SELECTED ORGANIZATION (CSV) =====
  function downloadOrganization() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }

    const headers = [
      'Organization Code', 'Name', 'Reporting Currency', 'Status',
      'Organization Type', 'Industry', 'Registration Number',
      'Date of Incorporation', 'Tax ID', 'Address', 'Country',
      'State', 'City', 'Pincode', 'Phone', 'Email', 'Website'
    ]
    const fields = [
      'code', 'name', 'currency', 'status', 'type', 'industry',
      'registrationNumber', 'incorporationDate', 'taxId', 'address',
      'country', 'state', 'city', 'pincode', 'phone', 'email', 'website'
    ]
    const escapeCSV = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
    const csv = '\uFEFF' + [
      headers.map(escapeCSV).join(','),
      fields.map(key => escapeCSV(selectedOrganization[key])).join(',')
    ].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedOrganization.code.replace(/[^a-z0-9_-]/gi, '_')}-details.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // ===== SECTION 05: SEARCH ACTIONS =====
  // ===== SECTION: SEARCH HEADER STATE =====
  const [isSearchMode, setIsSearchMode] = useState(false)
  function searchOrganizations() {
     setIsSearchMode(true)
      setAppliedSearch({
      code: search.code.trim(),
      name: search.name.trim(),
      status: search.status,
    })
    setSelectedId(null)
    setShowCodeSuggestions(false)
    setPage(1)
  }
  function clearOrganizations() {
    const empty = { code: '', name: '', status: '' }
    setSearch(empty)
    setAppliedSearch(empty)
    setShowCodeSuggestions(false)
    setSelectedId(null)
    setPage(1)
  }
  function openAdd() {
    setForm(blank)
     setImagePreview('')
    setEditingId(null)
    setErrors({})
    setMessage('')
    setScreen('form')
  }
  function openEdit() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }
    setForm({ ...blank, ...selectedOrganization })
     setImagePreview('')
    setEditingId(selectedOrganization.id)
    setErrors({})
    setScreen('form')
  }
  function openView() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }
    setScreen('details')
  }
  function copyOrganization() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }
    setForm({
      ...selectedOrganization,
      id: null,
      code: `${selectedOrganization.code}-COPY`,
      name: `${selectedOrganization.name} Copy`,
    })
    setEditingId(null)
    setScreen('form')
  }
  function validate() {
    const next = {}
    if (!form.code.trim()) next.code = 'Code is required.'
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.currencyId) next.currency = 'Select Reporting Currency.'
    if (
      form.email &&
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      next.email = 'Enter a valid email.'
    }
    const duplicate = organizations.some(
      (item) =>
        item.code.toLowerCase() === form.code.trim().toLowerCase() &&
        String(item.id) !== String(editingId)
    )
    if (duplicate) next.code = 'Organization Code already exists.'
    setErrors(next)
    return Object.keys(next).length === 0
  }
  async function saveOrganization(event) {
    event.preventDefault()
    if (!validate()) { saveNewRef.current = false; return }
    setLoading(true)
    setError('')
    setMessage('')
    const payload = {
      organization_code: form.code.trim(),
      organization_name: form.name.trim(),
      license_organization: form.license ? 1 : 0,
      reporting_currency_id: Number(form.currencyId),
      org_type_id: null,
      industry_id: null,
      registration_number: form.registrationNumber || null,
      date_of_incorporation: form.incorporationDate || null,
      tax_id: form.taxId || null,
      registered_address: form.address || null,
      country_id: null,
      state_id: null,
      city_id: null,
      pincode: form.pincode || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      status: form.status,
    }
    try {
      const isEdit = Boolean(editingId)
      const result = await request(
        isEdit
          ? `${API}/organizations/${editingId}`
          : `${API}/organizations`,
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      )
      const saved = normalize(result.data)
      setOrganizations((old) =>
        isEdit
          ? old.map((item) =>
              String(item.id) === String(editingId) ? saved : item
            )
          : [saved, ...old]
      )
      setSelectedId(saved.id)
      setEditingId(null)
      if (saveNewRef.current) { saveNewRef.current = false; setForm(blank); setImagePreview(''); setScreen('form') } else { setScreen('screen3') }
      setMessage(
        isEdit
          ? 'Organization updated successfully.'
          : 'Organization created successfully.'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  async function openCurrencyModal() {
    setShowCountry(false)
    setActiveLookup('')
    setShowCurrency(true)
    setSelectedCurrencyId(form.currencyId || null)
    setCurrencyPage(1)
    try {
      const result = await request(
        `${API}/lookups/reporting-currencies`
      )
      setCurrencies(rows(result))
    } catch (err) {
      setError(err.message)
    }
  }
  function selectCurrency() {
    const currency = currencies.find(
      (item) => String(item.id) === String(selectedCurrencyId)
    )
    if (!currency) {
      setMessage('Please select one currency row.')
      return
    }
    setForm((old) => ({
      ...old,
      currencyId: Number(currency.id),
      currency: `${currency.currency_code} - ${currency.currency_name}`,
    }))
    setErrors((old) => ({ ...old, currency: '' }))
    setShowCurrency(false)
  }
  async function deleteOrganization() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }
    setLoading(true)
    try {
      await request(`${API}/organizations/${selectedOrganization.id}`, {
        method: 'DELETE',
      })
      setOrganizations((old) =>
        old.filter(
          (item) =>
            String(item.id) !== String(selectedOrganization.id)
        )
      )
      setSelectedId(null)
      setShowDelete(false)
      setMessage('Organization deleted successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
   function renderInput(label, key, required = false, type = 'text') {
     return <div className="compact-field" key={key}><label>{label} {required && <em>*</em>}</label><div className="compact-control"><input name={key} type={type} value={form[key] ?? ''} disabled={key === 'code' && Boolean(editingId)} onChange={changeForm}/>{errors[key] && <small className="field-error">{errors[key]}</small>}</div></div>
   }
   function renderLookup(label, key, required = false) {
     return <div className="compact-field" key={key}><label>{label} {required && <em>*</em>}</label><div className="compact-control"><div className="lookup-line"><input value={form[key] ?? ''} readOnly placeholder="Search or select"/><button type="button" title={`Search ${label}`} onClick={() => {
       if (key === 'currency') openCurrencyModal();
       else if (key === 'country') {setShowCurrency(false);setActiveLookup('');setShowCountry(true)}
       else {setShowCurrency(false);setShowCountry(false);setLookupDraft(form[key] || '');setActiveLookup(key)}
     }}>⌕</button></div>{errors[key] && <small className="field-error">{errors[key]}</small>}</div></div>
   }
  return (
    <div className="app-shell">
      {/* SECTION 10: TOP NAVIGATION */}       <div className="top-menu">
        <div className="top-menu-items">
          <button type="button" onClick={() => setScreen('screen2')}>
            ◉ Masters ▾
          </button>
          <button type="button">
            ♟ User Management ▾
          </button>
        </div>
        <button type="button">◉ Language ▾</button>
      </div>
      {/* SECTION 11: PURPLE HEADER */}        <header className={`app-titlebar ${screen === 'form' ? 'add-titlebar' : ''}`}>
        <div className="app-brand">
          
{/* ===== DYNAMIC HEADER TITLE ===== */}
{/* ===== DYNAMIC HEADER TITLE ===== */}
<h1>
  150CHF Organization{' '}
  {screen === 'form'
    ? (editingId ? 'Edit' : 'Add')
    : screen === 'details'
    ? 'View'
    : isSearchMode
    ? 'Search'
    : ''}
</h1>
          
        </div>
{screen !== 'form' && (
  <div className="app-user-info">
    <span>User: APPADMIN</span>
    <span>Party: APPADMIN</span>
    <span>Role: APPADMIN</span>
  </div>
)}
      </header>
      {/* SECTION 12: ACTION TOOLBAR */}       <div className="app-toolbar">
        <div className="app-toolbar-group">
                      {/* ===== SECTION 06: ORIGINAL TOOLBAR — LIST MODE ===== */}
            {screen === 'screen2' && (
              <>
                <button title="Search" onClick={searchOrganizations}>⌕</button>
                <button title="Add" onClick={openAdd}>＋</button>
                <button title="Back" onClick={backToList}>←</button>
              </>
            )}
          {/* Screen 4 */}
          {screen === 'form' && (
            <>
              <button
                title="Save"
                type="submit"
                form="organization-form"
                disabled={loading}
              >
                ✓
              </button>
              <button title="Cancel" onClick={() => setScreen('screen2')}>
                ✕
              </button>
            </>
          )}
                      {/* ===== SECTION 07: SELECTED ROW TOOLBAR — CRUD MODE ===== */}
            {/* ===== SECTION 07: SCREEN 3 REFERENCE CRUD TOOLBAR ===== */}
{/* ===== SECTION 07: SCREEN 3 REFERENCE CRUD TOOLBAR ===== */}
{screen === 'screen3' && (
  <>
    <button title="Search" onClick={backToList}>
      <Search size={15} />
    </button>

    <button title="Back" onClick={backToList}>
      <ArrowLeft size={15} />
    </button>

    <button title="Add Organization" onClick={openAdd}>
      <FilePlus2 size={15} />
    </button>

    <button title="New Document" onClick={openAdd}>
      <File size={15} />
    </button>

    <button title="View Organization" onClick={openView}>
      <Eye size={15} />
    </button>

    <button title="Edit Organization" onClick={openEdit}>
      <SquarePen size={15} />
    </button>

    <button title="Delete Organization" onClick={() => setShowDelete(true)}>
      <Trash2 size={15} />
    </button>

    <button title="Copy Organization" onClick={copyOrganization}>
      <Copy size={15} />
    </button>
  </>
)}
          {screen === 'details' && (
            <>
              <button title="Edit" onClick={openEdit}>✎</button>
              <button title="Back" onClick={() => setScreen('screen3')}>←</button>
            </>
          )}
        </div>
        <div className="toolbar-right">
          {screen === 'screen3' && (
  <button
    title="Download selected organization"
    aria-label="Download selected organization"
    disabled={!selectedOrganization}
    onClick={downloadOrganization}
  >
    ⇩
  </button>
)}
          <button title="Logout">⏻</button>
        </div>
      </div>
      <main className="app-content">
        {error && (
          <div className="app-message">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {message && (
          <div className="app-message">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}
        {/* Screen 2 and Screen 3 */}
        {(screen === 'screen2' || screen === 'screen3') && (
          <>
            {/* SECTION 13: SUMMARY PANEL */}            <section className="org-panel summary-panel">
              <div className="org-section-heading">
                <h2>▣ Summary</h2>
              </div>
              <div className="details-grid">
                <Detail label="Code" value={selectedOrganization?.code || ''} />
                <Detail label="Name" value={selectedOrganization?.name || ''} />
                <Detail label="Status" value={selectedOrganization?.status || ''} />
              </div>
            </section>
            <section className="org-panel">
              <div className="org-section-heading">
                <h2>⌕ Search Parameters</h2>
              </div>
              <div className="org-list-tools">
                {/* ===== SECTION 08: ORGANIZATION CODE AUTOCOMPLETE ===== */}
                <div className="org-code-autocomplete">
                  <SearchInput
                    label="Organization Code"
                    value={search.code}
                    onChange={(value) => {
                      setSearch(old => ({ ...old, code: value }))
                      setShowCodeSuggestions(Boolean(value.trim()))
                    }}
                  />
                  {showCodeSuggestions && codeSuggestions.length > 0 && (
                    <div className="org-code-suggestions" role="listbox">
                      {codeSuggestions.map(item => (
                        <button
                          type="button"
                          key={item.id}
                          role="option"
                          aria-selected={false}
                          onClick={() => {
                            setSearch(old => ({ ...old, code: item.code }))
                            setShowCodeSuggestions(false)
                          }}
                        >
                          <strong>{item.code}</strong> — {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* ===== ORGANIZATION NAME AUTOCOMPLETE ===== */}
<div className="org-code-autocomplete">

  <SearchInput
    label="Name"
    value={search.name}
    onChange={(value) => {
      setSearch((old) => ({
        ...old,
        name: value
      }));
    }}
  />

  {search.name?.trim() && (
    <div className="org-code-suggestions">

      {organizations
        .filter((item) =>
          String(item.name || "")
            .toLowerCase()
            .startsWith(search.name.trim().toLowerCase())
        )
        .slice(0, 8)
        .map((item) => (
          <button
            type="button"
            key={item.id ?? item.code}
            onClick={() => {
              setSearch((old) => ({
                ...old,
                name: item.name
              }));
            }}
          >
            <strong>{item.name}</strong>
            {" — "}
            {item.code}
          </button>
        ))}

    </div>
  )}

</div>
                <div className="org-status-field">
                  <label>Status</label>
                  <select
                    value={search.status}
                    onChange={(event) =>
                      setSearch((old) => ({
                        ...old,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </section>
{/* SECTION 15: ORGANIZATION TABLE / PAGINATION */}
<section className="org-panel table-panel">
  <table className="org-table">
    <thead>
      <tr>
                  <th>
        {/* ===== SECTION 09: ORGANIZATION CODE SORT DROPDOWN ===== */}
            <span className="org-sort-heading">
              Organization Code
              <select
                aria-label="Sort Organization Code"
                title="Sort Organization Code"
                value={codeSort}
                onChange={event => {
                  setCodeSort(event.target.value)
                  setPage(1)
                }}
              >
                <option value="none">↕</option>
                <option value="asc">↑ Ascending</option>
                <option value="desc">↓ Descending</option>
              </select>
            </span>
          </th>
        <th>Name</th>
        <th>Rpt Curr</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {visibleOrganizations.map((item) => (
        <tr
          key={item.id}
          className={
            String(selectedId) === String(item.id)
              ? 'selected'
              : ''
          }
          onClick={() => selectOrganization(item)}
        >
          <td>{item.code}</td>
          <td>{item.name}</td>
          <td>{item.currency || '—'}</td>
          <td>{item.status}</td>
        </tr>
      ))}
      {!visibleOrganizations.length && (
        <tr>
          <td colSpan="4" className="empty-table">
            No organizations found.
          </td>
        </tr>
      )}
    </tbody>
  </table>
  <div className="org-pagination">
    <div>
      <button
        type="button"
        disabled={page === 1}
        onClick={() => setPage(1)}
      >
        |&lt;
      </button>
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        &lt;
      </button>
      <span> {page} / {pages} </span>
      <button
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
      >
        &gt;
      </button>
      <button
        type="button"
        disabled={page === pages}
        onClick={() => setPage(pages)}
      >
        &gt;|
      </button>
      <label>
        <select
          value={perPage}
          onChange={(event) => {
            setPerPage(Number(event.target.value))
            setPage(1)
          }}
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </label>
    </div>
  </div>
</section>
</>
)}
        {/* Screen 1 fields with Screen 4 visual style */}
                 {screen === 'form' && (
          <section className="add-org-screen">
            <div className="add-main-tab">Main Details</div>
            <form id="organization-form" onSubmit={saveOrganization}>
              <div className="add-panels">
                <section className="add-card">
                  <h3>▣ General Information</h3>
                  <div className="add-card-body">
                    {renderInput('Organization Code', 'code', true)}
                    {renderInput('Organization Name', 'name', true)}
                    {renderLookup('Reporting Currency', 'currency', true)}
                    {renderLookup('Industry', 'industry')}
                    {renderLookup('Organization Type', 'type')}
                    <div className="compact-field"><label>License Organization</label><label className="check-label"><input type="checkbox" name="license" checked={form.license} onChange={changeForm}/> Yes</label></div>
                    <div className="compact-field"><label>Status <em>*</em></label><select name="status" value={form.status} onChange={changeForm}><option>Active</option><option>Inactive</option></select></div>
                  </div>
                </section>
                <section className="add-card">
                  <h3>▣ Registration Details</h3>
                  <div className="add-card-body">
                    {renderInput('Registration Number', 'registrationNumber')}
                    {renderInput('Date of Incorporation', 'incorporationDate', false, 'date')}
                    {renderInput('Tax ID', 'taxId')}
                    {renderInput('Registered Address', 'address')}
                    {renderLookup('Country', 'country')}
                    {renderLookup('State/Province', 'state')}
                    {renderLookup('City', 'city')}
                    {renderInput('Pincode', 'pincode')}
                  </div>
                </section>
                <section className="add-card">
                  <h3>▣ Contact & Image</h3>
                  <div className="add-card-body">
                    {renderInput('Phone', 'phone', false, 'tel')}
                    {renderInput('Email', 'email', false, 'email')}
                    {renderInput('Website', 'website', false, 'url')}
                    <div className="compact-field"><label>Image Upload</label><input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2 MB.'); e.target.value = ''; return; }
                      const reader = new FileReader();
                      reader.onload = () => setImagePreview(String(reader.result));
                      reader.readAsDataURL(file);
                      setForm(old => ({...old, imageName: file.name}));
                    }}/></div>
                    {imagePreview && <img className="org-image-preview" src={imagePreview} alt="Selected organization preview"/>}
                    <div className="compact-field">
                      <label>File Upload</label>
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                    </div>
                    <p className="image-hint">Image preview only. Server upload requires an API.</p>
                  </div>
                </section>
              </div>
            </form>
          </section>
         )}
         {showCountry && screen === 'form' && <div className="currency-lookup-overlay"><div className="country-popup currency-lookup-popup"><div className="country-popup-title">Country Lookup <button type="button" onClick={() => setShowCountry(false)}>×</button></div>
           <table><thead>
  <tr>
    <th>Country</th>
  </tr>
</thead><tbody>{[['IND','India'],['SG','Singapore'],['US','United States']].filter(([code,name]) => code.toLowerCase().includes(countryFilter.code.toLowerCase()) && name.toLowerCase().includes(countryFilter.name.toLowerCase())).map(([code,name]) => <tr key={code} className={selectedCountry === code ? 'selected' : ''} 
onClick={() => {
  setSelectedCountry(code);
  setForm(v => ({
    country: name,
    state: '',
    city: ''
  }));
  setShowCountry(false);
}}
 onDoubleClick={() => {setForm(v => ({...v,country:name,state:'',city:''}));setShowCountry(false)}}><td>{code}</td><td>{name}</td><td>Active</td></tr>)}</tbody></table>
           </div></div>}
         {activeLookup && screen === 'form' && <div className="currency-lookup-overlay"><div className="country-popup currency-lookup-popup generic-lookup"><div className="country-popup-title">{activeLookup === 'type' ? 'Organization Type' : activeLookup === 'industry' ? 'Industry' : activeLookup === 'state' ? 'State/Province' : 'City'} Lookup <button type="button" onClick={() => setActiveLookup('')}>×</button></div><div className="lookup-manual"><label>
  {activeLookup === 'state' ? 'Select State: ' : 'Enter a value: '}
  {activeLookup === 'state' ? (
<div style={{ maxHeight: '180px', overflowY: 'auto', width: '220px' }}>
  {[
    'Andhra Pradesh',
    'Karnataka',
    'Tamil Nadu',
    'Telangana',
    'Maharashtra'
  ].map(state => (
    <div
      key={state}
      onClick={() => {
        setLookupDraft(state);
        setForm(v => ({ ...v, state }));
        setActiveLookup('');
      }}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #ddd'
      }}
    >
      {state}
    </div>
  ))}
</div>
) : (
  <input
    value={lookupDraft}
    onChange={e => setLookupDraft(e.target.value)}
    onKeyDown={e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = lookupDraft.trim();
        if (value) {
          setForm(v => ({
            ...v,
            [activeLookup]: value
          }));
          setActiveLookup('');
        }
      }
    }}
  />
)}
</label><p>Lookup API not configured. Enter a value manually.</p></div></div></div>}
{screen === 'details' && selectedOrganization && (
          <section className="org-panel">
            <div className="org-section-heading">
              <h2>Organization Details</h2>
            </div>
            <div className="details-grid">
              {Object.entries(selectedOrganization)
                .filter(([key]) => !key.endsWith('Id') && key !== 'id')
                .map(([key, value]) => (
                  <Detail
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1')}
                    value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                  />
                ))}
            </div>
          </section>
        )}
      </main>
      {/* Screen 5 */}
            
{/* ===== CURRENCY LOOKUP POPUP ===== */}
{showCurrency && screen === 'form' && (
  <div className="currency-lookup-overlay">
    <div className="country-popup currency-lookup-popup">

      {/* ===== POPUP HEADER ===== */}
      <div className="country-popup-title">
        Currency
        <button
          type="button"
          onClick={() => setShowCurrency(false)}
        >
          ×
        </button>
      </div>

      {/* ===== SEARCH PARAMETERS ===== */}
      <div className="currency-search-panel">
        <div className="currency-search-heading">
          ⌕ Search Parameters
        </div>

        <div className="currency-search-fields">
          <label>
            Code
            <input
              type="text"
              value={currencySearch.code}
              onChange={(e) => {
                const next = {
                  ...currencySearch,
                  code: e.target.value
                }
                setCurrencySearch(next)
                setAppliedCurrencySearch(next)
                setCurrencyPage(1)
              }}
            />
          </label>

          <label>
            Name
            <input
              type="text"
              value={currencySearch.name}
              onChange={(e) => {
                const next = {
                  ...currencySearch,
                  name: e.target.value
                }
                setCurrencySearch(next)
                setAppliedCurrencySearch(next)
                setCurrencyPage(1)
              }}
            />
          </label>

          <label className="currency-status-field">
            Status
            <select
              value={currencySearch.status}
              onChange={(e) => {
                const next = {
                  ...currencySearch,
                  status: e.target.value
                }
                setCurrencySearch(next)
                setAppliedCurrencySearch(next)
                setCurrencyPage(1)
              }}
            >
              <option value="">Select</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>

      {/* ===== CURRENCY TABLE ===== */}
      <table className="currency-results-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Currency Name</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {visibleCurrencies.map(currency => (
            <tr
              key={currency.id}
              className={
                String(selectedCurrencyId) === String(currency.id)
                  ? 'selected'
                  : ''
              }
              onClick={() => setSelectedCurrencyId(currency.id)}
              onDoubleClick={() => {
                setSelectedCurrencyId(currency.id)
                setForm(v => ({
                  ...v,
                  currencyId: Number(currency.id),
                  currency: `${currency.currency_code} - ${currency.currency_name}`
                }))
                setShowCurrency(false)
              }}
            >
              <td>{currency.currency_code}</td>
              <td>{currency.currency_name}</td>
              <td>{currency.status}</td>
            </tr>
          ))}

          {!visibleCurrencies.length && (
            <tr>
              <td colSpan="3">
                No currencies found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ===== PAGINATION FOOTER ===== */}
      <div className="currency-lookup-footer">
        <span className="currency-select-hint">
          ♧ Click a row to select
        </span>

        <div className="currency-pagination">
          <button
            type="button"
            disabled={currencyPage === 1}
            onClick={() => setCurrencyPage(1)}
          >
            |&lt;
          </button>

          <button
            type="button"
            disabled={currencyPage === 1}
            onClick={() => setCurrencyPage(p => Math.max(1, p - 1))}
          >
            &lt;
          </button>

          <span className="currency-page-number">
            {currencyPage}
          </span>

          <span>/ {currencyPages}</span>

          <button
            type="button"
            disabled={currencyPage >= currencyPages}
            onClick={() => setCurrencyPage(p => Math.min(currencyPages, p + 1))}
          >
            &gt;
          </button>

          <button
            type="button"
            disabled={currencyPage >= currencyPages}
            onClick={() => setCurrencyPage(currencyPages)}
          >
            &gt;|
          </button>

          <span>Lines per Page</span>
          <select value="5" disabled>
            <option value="5">5</option>
          </select>
        </div>
      </div>

    </div>
  </div>
)}

{showDelete && (
  <div className="modal-backdrop">
    <section className="organization-modal delete-modal">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', color: '#c0392b' }}>
          ⚠
        </div>
        <h2>Delete</h2>
        <p>
          Do You Really Want to In-active/Delete The Record
        </p>
      </div>
      <div
        className="form-actions"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '20px'
        }}
      >
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setShowDelete(false)}
        >
          ✕ No
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={loading}
          onClick={() => {
            setMessage('In-Active functionality will be added next.')
            setShowDelete(false)
          }}
        >
          ☑ In-Active
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={loading}
          onClick={deleteOrganization}
        >
          🗑 Delete
        </button>
      </div>
    </section>
  </div>
)}
    </div>
  )
}
function Field({ label, children, error }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && <small className="field-error">{error}</small>}
    </div>
  )
}
function Lookup({
  label, value, placeholder, onSearch, onChange, error,
}) {
  return (
    <Field label={label} error={error}>
      <div className="lookup-input-box">
        <input
          value={value}
          placeholder={placeholder}
          readOnly={Boolean(onSearch)}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <button
          type="button"
          className="lookup-search-button"
          onClick={onSearch || (() => {})}
        >
          ⌕
        </button>
      </div>
    </Field>
  )
}
function SearchInput({ label, value, onChange }) {
  return (
    <div className="org-search-field">
      <label>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}
