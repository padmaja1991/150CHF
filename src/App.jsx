// ============================================================
// 150CHF ORGANIZATIONS — LABELED SOURCE / STEP 01
// Current scope: code labels and architecture map only.
// Future steps (NOT yet extracted/implemented):
// 02 Common DataTable (extracted) | 03 Common Pagination | 04 SearchPanel
// 05 StatusButton | 06 LookupModal | 07 Form components
// 08 API services and validation | 09 CRUD regression tests
// Preserve App.css, existing APIs, JSX and event handlers.
// ============================================================
import { useEffect, useMemo, useState, useRef } from 'react'
import DataTable from './components/common/DataTable'
// ===== [DEPT-INTEGRATION-01 | Department List Component] =====
import DepartmentList from './features/departments/DepartmentList'
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
// ===== [ORG-CONFIG-01 | API configuration] =====
const API = 'http://localhost:5000/api'
// ===== [ORG-MODEL-01 | Organization form defaults] =====
const blank = {
  id: null, code: '', name: '', license: false,
  currencyId: '', currency: '', orgTypeId: '', type: '', industryId: '', industry: '',
  registrationNumber: '', incorporationDate: '', taxId: '',
  address: '', countryId: '', country: '', stateId: '', state: '', cityId: '', city: '', pincode: '',
  phone: '', email: '', website: '', imageName: '', status: 'Active',
}
// ===== [ORG-API-01 | Shared HTTP request helper] =====
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
// ===== [ORG-API-02 | API response rows] =====
function rows(result) {
  return Array.isArray(result) ? result : result?.data || []
}
// ===== [ORG-MODEL-02 | Database-to-UI field normalization] =====
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
    orgTypeId: item.org_type_id ?? '',
      type: item.type ?? item.organization_type ?? item.type_name ?? '',
    industryId: item.industry_id ?? '',
    industry: item.industry ?? item.industry_name ?? '',
    registrationNumber: item.registrationNumber ?? item.registration_number ?? '',
    incorporationDate: String(
      item.incorporationDate ?? item.date_of_incorporation ?? ''
    ).slice(0, 10),
    taxId: item.taxId ?? item.tax_id ?? '',
    address: item.address ?? item.registered_address ?? '',
    countryId: item.country_id ?? '',
      country: item.country ?? item.country_name ?? '',
    stateId: item.state_id ?? '',
      state: item.state ?? item.state_name ?? '',
    cityId: item.city_id ?? '',
      city: item.city ?? item.city_name ?? '',
    pincode: item.pincode ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    website: item.website ?? '',
 imageName: item.imageName ?? '',
    status: item.status ?? 'Active',
  }
}
// ===== [ORG-APP-01 | Main organization screen] =====
export default function App() {
  // screen2 = Initial screen
  // form = Screen 1 / Screen 4 form
  // screen3 = CRUD screen
// ===== [ORG-STATE-01 | Screen and organization state] =====
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
// ===== [ORG-STATE-02 | Sorting and lookup state] =====
  const [codeSort, setCodeSort] = useState('none')
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [currencies, setCurrencies] = useState([])
  const [showCurrency, setShowCurrency] = useState(false)
  // ===== [INDUSTRY-LOOKUP-01 | Popup visibility] =====
const [showIndustry, setShowIndustry] = useState(false);
  // ===== [ORGTYPE-LOOKUP-01 | Popup state] =====
  const [showOrgType, setShowOrgType] = useState(false);
  const [orgTypes, setOrgTypes] = useState([]);
  const [orgTypeSearch, setOrgTypeSearch] = useState({ code: '', name: '', status: '' });
  const [orgTypePage, setOrgTypePage] = useState(1);
  const [selectedOrgTypeId, setSelectedOrgTypeId] = useState(null);
  const [orgTypeLoading, setOrgTypeLoading] = useState(false);
  // ===== [INDUSTRY-LOOKUP-02 | Data and filters] =====
  const [industries, setIndustries] = useState([]);
  const [industrySearch, setIndustrySearch] = useState({ code: '', name: '', status: '' });
  const [industryPage, setIndustryPage] = useState(1);
  const [selectedIndustryId, setSelectedIndustryId] = useState(null);
  const [industryLoading, setIndustryLoading] = useState(false);
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
// ===== COUNTRY LOOKUP: POSTGRESQL DATA =====
const [countries, setCountries] = useState([])
const [selectedCountry,setSelectedCountry] = useState('IND')
const [countryFilter,setCountryFilter] = useState({code:'',name:'',status:'All'})
// ===== COUNTRY LOOKUP: PAGINATION =====
const [countryPage, setCountryPage] = useState(1)
// ===== [GEO-LOOKUP-01 | State and City popup state] =====
  const [geoLookup, setGeoLookup] = useState('');
  const [geoRecords, setGeoRecords] = useState([]);
  const [geoFilter, setGeoFilter] = useState({ code: '', name: '', status: '' });
  const [geoPage, setGeoPage] = useState(1);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedGeoId, setSelectedGeoId] = useState(null);
  const [activeLookup,setActiveLookup] = useState('')
const [lookupDraft,setLookupDraft] = useState('')
const saveNewRef = useRef(false)
 const [imagePreview, setImagePreview] = useState('')
// ===== [ORG-LIFECYCLE-01 | Initial organization load] =====
  useEffect(() => {
    loadOrganizations()
  }, [])
// ===== [ORG-API-03 | Load organizations from PostgreSQL API] =====
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
// ===== [ORG-SEARCH-01 | Organization filtering] =====
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
// ===== [ORG-GRID-01 | Organization sorting] =====
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
// ===== [ORG-SEARCH-02 | Code autocomplete] =====
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
// ===== [ORG-PAGE-01 | Organization pagination data] =====
  const pages = Math.max(1, Math.ceil(sortedOrganizations.length / perPage))
  const visibleOrganizations = sortedOrganizations.slice(
    (page - 1) * perPage,
    page * perPage
  )
  const selectedOrganization = organizations.find(
    (item) => String(item.id) === String(selectedId)
  )
// ===== [ORG-LOOKUP-01 | Currency lookup filtering] =====
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
  // ===== CURRENCY LOOKUP: PAGINATION =====
const visibleCurrencies = filteredCurrencies.slice(
  (currencyPage - 1) * 5,
  currencyPage * 5
)
  // ===== COUNTRY LOOKUP: FILTERING AND SHOW ALL COUNTRIES =====
// ===== [ORG-LOOKUP-02 | Country lookup filtering] =====
const filteredCountries = countries.filter(item =>
  String(item.country_code || '')
    .toLowerCase()
    .includes(countryFilter.code.toLowerCase()) &&
  String(item.country_name || '')
    .toLowerCase()
    .includes(countryFilter.name.toLowerCase()) &&
  (
    countryFilter.status === 'All' ||
    !countryFilter.status ||
    item.status === countryFilter.status
  )
)
// ===== SHOW ALL MATCHING DATABASE COUNTRIES =====
// ===== COUNTRY LOOKUP: PAGINATION =====
const countryPages = Math.max(
  1,
  Math.ceil(filteredCountries.length / 5)
)
const visibleCountries = filteredCountries.slice(
  (countryPage - 1) * 5,
  countryPage * 5
)
// ===== [ORGTYPE-LOOKUP-02 | Search and pagination] =====
  const filteredOrgTypes = orgTypes.filter(item =>
    String(item.type_code || '').toLowerCase().includes(orgTypeSearch.code.toLowerCase()) &&
    String(item.type_name || '').toLowerCase().includes(orgTypeSearch.name.toLowerCase()) &&
    (!orgTypeSearch.status || item.status === orgTypeSearch.status)
  );
  const orgTypePages = Math.max(1, Math.ceil(filteredOrgTypes.length / 5));
  const visibleOrgTypes = filteredOrgTypes.slice((orgTypePage - 1) * 5, orgTypePage * 5);

  // ===== [ORGTYPE-LOOKUP-03 | Load and select from PostgreSQL] =====
  async function openOrgTypeModal() {
    setShowCurrency(false);
    setShowCountry(false);
    setShowIndustry(false);
    setActiveLookup('');
    setShowOrgType(true);
    setSelectedOrgTypeId(form.orgTypeId || null);
    setOrgTypeSearch({ code: '', name: '', status: '' });
    setOrgTypePage(1);
    setOrgTypeLoading(true);
    try {
      const result = await request(`${API}/lookups/organization-types`);
      setOrgTypes(rows(result));
    } catch (err) {
      setError(err.message);
      setOrgTypes([]);
    } finally {
      setOrgTypeLoading(false);
    }
  }
  function selectOrgType(item) {
    setSelectedOrgTypeId(item.id);
    setForm(old => ({ ...old,
      orgTypeId: Number(item.id),
      type: `${item.type_code} - ${item.type_name}`
    }));
    setShowOrgType(false);
  }

// ===== [INDUSTRY-LOOKUP-03 | Filter and paginate] =====
  const filteredIndustries = industries.filter(item =>
    String(item.industry_code || '').toLowerCase().includes(industrySearch.code.toLowerCase()) &&
    String(item.industry_name || '').toLowerCase().includes(industrySearch.name.toLowerCase()) &&
    (!industrySearch.status || item.status === industrySearch.status)
  );
  const industryPages = Math.max(1, Math.ceil(filteredIndustries.length / 5));
  const visibleIndustries = filteredIndustries.slice((industryPage - 1) * 5, industryPage * 5);
  // ===== [INDUSTRY-LOOKUP-04 | Fetch from PostgreSQL API] =====
  async function openIndustryModal() {
    setShowOrgType(false);
    setShowCurrency(false);
    setShowCountry(false);
    setActiveLookup('');
    setShowIndustry(true);
    setSelectedIndustryId(form.industryId || null);
    setIndustrySearch({ code: '', name: '', status: '' });
    setIndustryPage(1);
    setIndustryLoading(true);
    try {
      const result = await request(`${API}/lookups/industries`);
      setIndustries(rows(result));
    } catch (err) {
      setError(err.message);
      setIndustries([]);
    } finally {
      setIndustryLoading(false);
    }
  }
  function selectIndustry(industry) {
    setSelectedIndustryId(industry.id);
    setForm(old => ({
      ...old,
      industryId: Number(industry.id),
      industry: `${industry.industry_code} - ${industry.industry_name}`
    }));
    setShowIndustry(false);
  }
// ===== [GEO-LOOKUP-02 | PostgreSQL fetch, filter and selection] =====
  const geoFiltered = geoRecords.filter(item =>
    String(item.code ?? '').toLowerCase().includes(geoFilter.code.toLowerCase()) &&
    String(item.name ?? '').toLowerCase().includes(geoFilter.name.toLowerCase()) &&
    (!geoFilter.status || item.status === geoFilter.status)
  );
  const geoPages = Math.max(1, Math.ceil(geoFiltered.length / 5));
  const visibleGeo = geoFiltered.slice((geoPage - 1) * 5, geoPage * 5);

  async function openGeoModal(kind) {
    setShowCurrency(false);
    setShowCountry(false);
    setShowIndustry(false);
    setShowOrgType(false);
    setActiveLookup('');
    setGeoLookup(kind);
    setGeoRecords([]);
    setGeoFilter({ code: '', name: '', status: '' });
    setGeoPage(1);
    setSelectedGeoId(kind === 'state' ? form.stateId || null : form.cityId || null);
    setGeoLoading(true);
    try {
      const url = kind === 'state' ? 'states' : 'cities';
      const result = await request(`${API}/lookups/${url}`);
      const data = rows(result);
      setGeoRecords(data.filter(item => {
        if (kind === 'state' && form.countryId && item.country_id != null)
          return String(item.country_id) === String(form.countryId);
        if (kind === 'city' && form.stateId && item.state_id != null)
          return String(item.state_id) === String(form.stateId);
        return true;
      }));
    } catch (err) {
      setError(err.message);
      setGeoRecords([]);
    } finally {
      setGeoLoading(false);
    }
  }

  function selectGeo(item) {
    if (geoLookup === 'state') {
      setForm(old => ({ ...old, stateId: Number(item.id), state: item.name,
        cityId: '', city: '' }));
    } else {
      setForm(old => ({ ...old, cityId: Number(item.id), city: item.name }));
    }
    setGeoLookup('');
  }

// ===== [ORG-FORM-01 | Form input state updates] =====
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
// ===== [ORG-GRID-02 | Row selection] =====
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
// ===== [ORG-EXPORT-01 | Organization CSV export] =====
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
// ===== [ORG-SEARCH-03 | Apply organization search] =====
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
// ===== [ORG-CRUD-01 | Add organization action] =====
  function openAdd() {
    setForm(blank)
     setImagePreview('')
    setEditingId(null)
    setErrors({})
    setMessage('')
    setScreen('form')
  }
// ===== [ORG-CRUD-02 | Edit organization action] =====
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
// ===== [ORG-CRUD-03 | View organization action] =====
  function openView() {
    if (!selectedOrganization) {
      setMessage('Please select an organization row first.')
      return
    }
    setScreen('details')
  }
// ===== [ORG-CRUD-04 | Copy organization action] =====
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
// ===== [ORG-VALIDATE-01 | Organization form validation] =====
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
// ===== [ORG-CRUD-05 | Create and update via API] =====
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
      org_type_id: form.orgTypeId ? Number(form.orgTypeId) : null,
      industry_id: form.industryId ? Number(form.industryId) : null,
      registration_number: form.registrationNumber || null,
      date_of_incorporation: form.incorporationDate || null,
      tax_id: form.taxId || null,
      registered_address: form.address || null,
      country_id: form.countryId ? Number(form.countryId) : null,
      state_id: form.stateId ? Number(form.stateId) : null,
      city_id: form.cityId ? Number(form.cityId) : null,
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
// ===== [ORG-LOOKUP-03 | Load currency modal data] =====
  async function openCurrencyModal() {
    setShowOrgType(false);
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
  // ===== COUNTRY LOOKUP: LOAD FROM POSTGRESQL =====
// ===== [ORG-LOOKUP-04 | Load country modal data] =====
  async function openCountryModal() {
    setShowOrgType(false);
    setShowCurrency(false)
    setActiveLookup('')
    setShowCountry(true)
    try {
      const result = await request(`${API}/lookups/countries`)
      setCountries(rows(result))
    } catch (err) {
      setError(err.message)
    }
  }
// ===== [ORG-LOOKUP-05 | Confirm selected currency] =====
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
// ===== [ORG-CRUD-06 | Delete via API] =====
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
// ===== [ORG-FORM-02 | Reusable input renderer] =====
   function renderInput(label, key, required = false, type = 'text') {
     return <div className="compact-field" key={key}><label>{label} {required && <em>*</em>}</label><div className="compact-control"><input name={key} type={type} value={form[key] ?? ''} disabled={key === 'code' && Boolean(editingId)} onChange={changeForm}/>{errors[key] && <small className="field-error">{errors[key]}</small>}</div></div>
   }
// ===== [ORG-FORM-03 | Lookup input renderer] =====
   function renderLookup(label, key, required = false) {
     return <div className="compact-field" key={key}><label>{label} {required && <em>*</em>}</label><div className="compact-control"><div className="lookup-line"><input value={form[key] ?? ''} readOnly placeholder="Search or select"/><button type="button" title={`Search ${label}`} onClick={() => {
       if (key === 'currency') openCurrencyModal();
        else if (key === 'industry') openIndustryModal();
        else if (key === 'type') openOrgTypeModal();
       else if (key === 'country') openCountryModal()
        else if (key === 'state' || key === 'city') openGeoModal(key)
       else {setShowCurrency(false);setShowCountry(false);setLookupDraft(form[key] || '');setActiveLookup(key)}
     }}>⌕</button></div>{errors[key] && <small className="field-error">{errors[key]}</small>}</div></div>
   }
  // ===== [ORG-VIEW-01 | Main application JSX] =====
  return (
    <div className="app-shell">
      {/* SECTION 10: TOP NAVIGATION */}      
       <div className="top-menu">
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
      {/* SECTION 11: PURPLE HEADER */}        <header className={`app-titlebar ${screen === 'form' ? 'add-titlebar' : ''}`}>
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
    ? ''
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
      {/* SECTION 12: ACTION TOOLBAR */}       <div className="app-toolbar">
        <div className="app-toolbar-group">
                      {/* ===== SECTION 06: ORIGINAL TOOLBAR — LIST MODE ===== */}
            {/* ===== SECTION 06: LIST MODE TOOLBAR ===== */}
{screen === 'screen2' && (
  <>
    <button title="Search" onClick={searchOrganizations}>
      <Search size={15} />
    </button>
    <button title="Add" onClick={openAdd}>
      <FilePlus2 size={15} />
    </button>
    <button title="Back" onClick={backToList}>
      <ArrowLeft size={15} />
    </button>
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
            {/* SECTION 13: SUMMARY PANEL */}            <section className="org-panel summary-panel">
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
  {/* ===== [ORG-DATATABLE-01 | Reusable DataTable] ===== */}
  <DataTable
    columns={[
      {
        key: 'code',
        header: (
          <span className="org-sort-heading">
            Organization Code
            <select
              aria-label="Sort Organization Code"
              title="Sort Organization Code"
              value={codeSort}
              onChange={(event) => {
                setCodeSort(event.target.value)
                setPage(1)
              }}
            >
              <option value="none">↕</option>
              <option value="asc">↑ Ascending</option>
              <option value="desc">↓ Descending</option>
            </select>
          </span>
        ),
        render: (item) => item.code,
      },
      { key: 'name', header: 'Name', render: (item) => item.name },
      { key: 'currency', header: 'Rpt Curr', render: (item) => item.currency || '—' },
      { key: 'status', header: 'Status', render: (item) => item.status },
    ]}
    rows={visibleOrganizations}
    selectedId={selectedId}
    onRowClick={selectOrganization}
    emptyMessage="No organizations found."
  />
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
                    <div className="compact-field">
                      <label>File Upload</label>
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                    </div>
                  </div>
                </section>
              </div>
            </form>
          </section>
         )}
         {showCountry && screen === 'form' && <div className="currency-lookup-overlay"><div className="country-popup currency-lookup-popup"><div className="country-popup-title">Country<button type="button" onClick={() => setShowCountry(false)}>×</button></div>
          {/* ===== COUNTRY SEARCH PARAMETERS ===== */}
<div className="currency-search-panel">
  <div className="currency-search-heading">
    ⌕ Search Parameters
  </div>
  <div className="currency-search-fields">
    <label>
      Code
      <input
        value={countryFilter.code}
        onChange={(e) => setCountryFilter({
          ...countryFilter,
          code: e.target.value
        })}
      />
    </label>
    <label>
      Name
      <input
        value={countryFilter.name}
        onChange={(e) => setCountryFilter({
          ...countryFilter,
          name: e.target.value
        })}
      />
    </label>
    <label className="currency-status-field">
      Status
      <select
        value={countryFilter.status}
        onChange={(e) => setCountryFilter({
          ...countryFilter,
          status: e.target.value
        })}
      >
        <option value="All">Select</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </label>
  </div>
</div>
          <table className="currency-results-table"><thead>
 <tr>
  <th>Code</th>
  <th>Country Name</th>
  <th>Status</th>
</tr>
</thead>
<tbody>
  {visibleCountries.map((item) => {
    const code = item.country_code;
    const name = item.country_name;
    const status = item.status;
    return (
      <tr
        key={code}
        className={selectedCountry === code ? "selected" : ""}
        onClick={() => {
          setSelectedCountry(code);
          setForm((v) => ({
            ...v,
            countryId: Number(item.id),

            country: name,

            stateId: '', state: '',

            cityId: '', city: '',
          }));
          setShowCountry(false);
        }}
        onDoubleClick={() => {
          setForm((v) => ({
            ...v,
            countryId: Number(item.id),

            country: name,

            stateId: '', state: '',

            cityId: '', city: '',
          }));
          setShowCountry(false);
        }}
      >
        <td>{code}</td>
        <td>{name}</td>
        <td>{status}</td>
      </tr>
    );
  })}
</tbody>
</table>
{/* ===== COUNTRY LOOKUP: PAGINATION FOOTER ===== */}
<div className="currency-lookup-footer">
  <span className="currency-select-hint">
    Click a row to select
  </span>
  <div className="currency-pagination">
    {/* FIRST PAGE */}
    <button
      type="button"
      disabled={countryPage === 1}
      onClick={() => setCountryPage(1)}
    >
      {"|<"}
    </button>
    {/* PREVIOUS PAGE */}
    <button
      type="button"
      disabled={countryPage === 1}
      onClick={() =>
        setCountryPage((p) => Math.max(1, p - 1))
      }
    >
      {"<"}
    </button>
    {/* ACTIVE PAGE NUMBER */}
    <span
      className="currency-page-number"
      style={{
        fontWeight: 700,
        color: "#34305F",
      }}
    >
      {countryPage}
    </span>
    <span>/ {countryPages}</span>
    {/* NEXT PAGE */}
    <button
      type="button"
      disabled={countryPage >= countryPages}
      onClick={() =>
        setCountryPage((p) =>
          Math.min(countryPages, p + 1)
        )
      }
    >
      {">"}
    </button>
    {/* LAST PAGE */}
    <button
      type="button"
      disabled={countryPage >= countryPages}
      onClick={() => setCountryPage(countryPages)}
    >
      {">|"}
    </button>
    <span>Lines per Page</span>
    <select value="5" disabled>
      <option value="5">5</option>
    </select>
  </div>
</div>
</div>
</div>
}
         {/* ===== [INDUSTRY-LOOKUP-05 | PostgreSQL industry popup] ===== */}
{showIndustry && screen === 'form' && (
  <div className="currency-lookup-overlay">
    <div className="country-popup currency-lookup-popup">
      <div className="country-popup-title">
        Industry
        <button type="button" onClick={() => setShowIndustry(false)}>×</button>
      </div>
      <div className="currency-search-panel">
        <div className="currency-search-heading">⌕ Search Parameters</div>
        <div className="currency-search-fields">
          <label>Code
            <input value={industrySearch.code} onChange={e => {
              setIndustrySearch(old => ({ ...old, code: e.target.value }));
              setIndustryPage(1);
            }} />
          </label>
          <label>Name
            <input value={industrySearch.name} onChange={e => {
              setIndustrySearch(old => ({ ...old, name: e.target.value }));
              setIndustryPage(1);
            }} />
          </label>
          <label className="currency-status-field">Status
            <select value={industrySearch.status} onChange={e => {
              setIndustrySearch(old => ({ ...old, status: e.target.value }));
              setIndustryPage(1);
            }}>
              <option value="">Select</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>
      <table className="currency-results-table">
        <thead><tr><th>Code</th><th>Industry Name</th><th>Status</th></tr></thead>
        <tbody>
          {visibleIndustries.map(industry => (
            <tr key={industry.id}
              className={String(selectedIndustryId) === String(industry.id) ? 'selected' : ''}
              onClick={() => setSelectedIndustryId(industry.id)}
              onDoubleClick={() => selectIndustry(industry)}>
              <td>{industry.industry_code}</td>
              <td>{industry.industry_name}</td>
              <td>{industry.status}</td>
            </tr>
          ))}
          {!visibleIndustries.length && (
            <tr><td colSpan="3">{industryLoading ? 'Loading industries...' : 'No industries found.'}</td></tr>
          )}
        </tbody>
      </table>
      <div className="currency-lookup-footer">
        <span className="currency-select-hint">Click a row to select; double-click to confirm</span>
        <div className="currency-pagination">
          <button type="button" disabled={industryPage === 1} onClick={() => setIndustryPage(1)}>|&lt;</button>
          <button type="button" disabled={industryPage === 1} onClick={() => setIndustryPage(p => Math.max(1, p - 1))}>&lt;</button>
          <span className="currency-page-number" style={{ fontWeight: 700, color: '#34305F' }}>{industryPage}</span>
          <span>/ {industryPages}</span>
          <button type="button" disabled={industryPage >= industryPages} onClick={() => setIndustryPage(p => Math.min(industryPages, p + 1))}>&gt;</button>
          <button type="button" disabled={industryPage >= industryPages} onClick={() => setIndustryPage(industryPages)}>&gt;|</button>
          <span>Lines per Page</span>
          <select value="5" disabled><option value="5">5</option></select>
        </div>
      </div>
    </div>
  </div>
)}
{/* ===== [ORGTYPE-LOOKUP-04 | PostgreSQL Organization Type popup] ===== */}
{showOrgType && screen === 'form' && (
  <div className="currency-lookup-overlay">
    <div className="country-popup currency-lookup-popup">
      <div className="country-popup-title">Organization Type
        <button type="button" onClick={() => setShowOrgType(false)}>×</button>
      </div>
      <div className="currency-search-panel">
        <div className="currency-search-heading">⌕ Search Parameters</div>
        <div className="currency-search-fields">
          <label>Code
            <input value={orgTypeSearch.code} onChange={e => {
              setOrgTypeSearch(old => ({ ...old, code: e.target.value }));
              setOrgTypePage(1);
            }} />
          </label>
          <label>Name
            <input value={orgTypeSearch.name} onChange={e => {
              setOrgTypeSearch(old => ({ ...old, name: e.target.value }));
              setOrgTypePage(1);
            }} />
          </label>
          <label className="currency-status-field">Status
            <select value={orgTypeSearch.status} onChange={e => {
              setOrgTypeSearch(old => ({ ...old, status: e.target.value }));
              setOrgTypePage(1);
            }}>
              <option value="">Select</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>
      <table className="currency-results-table">
        <thead><tr><th>Code</th><th>Organization Type Name</th><th>Status</th></tr></thead>
        <tbody>
          {visibleOrgTypes.map(item => (
            <tr key={item.id}
              className={String(selectedOrgTypeId) === String(item.id) ? 'selected' : ''}
              onClick={() => setSelectedOrgTypeId(item.id)}
              onDoubleClick={() => selectOrgType(item)}>
              <td>{item.type_code}</td>
              <td>{item.type_name}</td>
              <td>{item.status}</td>
            </tr>
          ))}
          {!visibleOrgTypes.length && (
            <tr><td colSpan="3">{orgTypeLoading ? 'Loading organization types...' : 'No organization types found.'}</td></tr>
          )}
        </tbody>
      </table>
      <div className="currency-lookup-footer">
        <span className="currency-select-hint">Click a row to select; double-click to confirm</span>
        <div className="currency-pagination">
          <button type="button" disabled={orgTypePage === 1} onClick={() => setOrgTypePage(1)}>|&lt;</button>
          <button type="button" disabled={orgTypePage === 1} onClick={() => setOrgTypePage(p => Math.max(1, p - 1))}>&lt;</button>
          <span className="currency-page-number" style={{ fontWeight: 700, color: '#34305F' }}>{orgTypePage}</span>
          <span>/ {orgTypePages}</span>
          <button type="button" disabled={orgTypePage >= orgTypePages} onClick={() => setOrgTypePage(p => Math.min(orgTypePages, p + 1))}>&gt;</button>
          <button type="button" disabled={orgTypePage >= orgTypePages} onClick={() => setOrgTypePage(orgTypePages)}>&gt;|</button>
          <span>Lines per Page</span>
          <select value="5" disabled><option value="5">5</option></select>
        </div>
      </div>
    </div>
  </div>
)}

{/* ===== [GEO-LOOKUP-03 | State / City PostgreSQL lookup] ===== */}
{geoLookup && screen === 'form' && (
  <div className="currency-lookup-overlay">
    <div className="country-popup currency-lookup-popup">
      <div className="country-popup-title">
        {geoLookup === 'state' ? 'State/Province' : 'City'}
        <button type="button" onClick={() => setGeoLookup('')}>×</button>
      </div>
      <div className="currency-search-panel">
        <div className="currency-search-heading">⌕ Search Parameters</div>
        <div className="currency-search-fields">
          <label>Code
            <input value={geoFilter.code} onChange={e => {
              setGeoFilter(old => ({ ...old, code: e.target.value })); setGeoPage(1);
            }}/>
          </label>
          <label>Name
            <input value={geoFilter.name} onChange={e => {
              setGeoFilter(old => ({ ...old, name: e.target.value })); setGeoPage(1);
            }}/>
          </label>
          <label className="currency-status-field">Status
            <select value={geoFilter.status} onChange={e => {
              setGeoFilter(old => ({ ...old, status: e.target.value })); setGeoPage(1);
            }}>
              <option value="">Select</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>
      <table className="currency-results-table">
        <thead><tr><th>Code</th><th>{geoLookup === 'state' ? 'State/Province Name' : 'City Name'}</th><th>Status</th></tr></thead>
        <tbody>
          {visibleGeo.map(item => (
            <tr key={item.id}
              className={String(selectedGeoId) === String(item.id) ? 'selected' : ''}
              onClick={() => setSelectedGeoId(item.id)}
              onDoubleClick={() => selectGeo(item)}>
              <td>{item.code}</td><td>{item.name}</td><td>{item.status}</td>
            </tr>
          ))}
          {!visibleGeo.length && <tr><td colSpan="3">{geoLoading ? 'Loading...' : 'No records found.'}</td></tr>}
        </tbody>
      </table>
      <div className="currency-lookup-footer">
        <span className="currency-select-hint">Click a row to select; double-click to confirm</span>
        <div className="currency-pagination">
          <button type="button" disabled={geoPage === 1} onClick={() => setGeoPage(1)}>|&lt;</button>
          <button type="button" disabled={geoPage === 1} onClick={() => setGeoPage(p => Math.max(1, p - 1))}>&lt;</button>
          <span className="currency-page-number">{geoPage}</span><span>/ {geoPages}</span>
          <button type="button" disabled={geoPage >= geoPages} onClick={() => setGeoPage(p => Math.min(geoPages, p + 1))}>&gt;</button>
          <button type="button" disabled={geoPage >= geoPages} onClick={() => setGeoPage(geoPages)}>&gt;|</button>
          <span>Lines per Page</span><select value="5" disabled><option value="5">5</option></select>
        </div>
      </div>
    </div>
  </div>
)}
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
          {/* ===== CURRENCY: ACTIVE PAGE NUMBER ===== */}
<span
  className="currency-page-number"
  style={{ fontWeight: 700, color: "#34305F" }}
>
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
// ===== [ORG-COMMON-01 | Shared field component] =====
function Field({ label, children, error }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && <small className="field-error">{error}</small>}
    </div>
  )
}
// ===== [ORG-COMMON-02 | Shared lookup input component] =====
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
// ===== [ORG-COMMON-03 | Shared search input component] =====
function SearchInput({ label, value, onChange }) {
  return (
    <div className="org-search-field">
      <label>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
// ===== [ORG-COMMON-04 | Shared detail display component] =====
function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}
